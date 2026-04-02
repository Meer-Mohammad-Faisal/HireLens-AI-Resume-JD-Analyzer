const { PDFParse } = require("pdf-parse")
const {generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")


async function generateInterviewReportController(req, res) {
    try {
        const resumeFile = req.file
        let resumeContent = ""

        // Parse resume if provided
        if (resumeFile) {
            try {
                console.log(
                    "Processing file:",
                    resumeFile.originalname || resumeFile.filename || "uploaded-file",
                    "Size:",
                    resumeFile.size,
                    "Type:",
                    resumeFile.mimetype
                )
                
                // Only process PDF files
                if (resumeFile.mimetype === "application/pdf" || resumeFile.originalname?.endsWith(".pdf")) {
                    try {
                        const parser = new PDFParse({ data: resumeFile.buffer })
                        try {
                            const data = await parser.getText()
                            resumeContent = data?.text?.trim() || ""
                        } finally {
                            await parser.destroy()
                        }
                        console.log("PDF extracted successfully, content length:", resumeContent.length)
                    } catch (pdfError) {
                        console.warn("PDF parsing failed:", pdfError.message)
                        // Fallback: attempt to extract text from PDF using alternative method
                        resumeContent = `[Resume uploaded: ${resumeFile.originalname}] PDF could not be fully parsed, but the file was received.`
                    }
                } else {
                    // For non-PDF files, treat the buffer as text
                    console.log("File is not recognized as PDF, attempting text extraction...")
                    resumeContent = resumeFile.buffer.toString("utf-8").trim()
                }

                // If we couldn't extract content from the PDF but it was provided, that's okay
                // We'll use self-description instead
                if (!resumeContent) {
                    console.warn("No text content extracted from resume file")
                    resumeContent = ""
                }
            } catch (error) {
                console.error("File processing error:", error.message)
                // Don't fail here - just proceed with self-description
                resumeContent = ""
            }
        }

        const selfDescription = req.body.selfDescription?.trim() || ""
        const jobDescription = req.body.jobDescription?.trim() || ""
        const roadmapDayInput =
            req.body.roadmapDays ||
            req.body.roadmapDuration ||
            req.body.days
        const parsedRoadmapDays = Number.parseInt(roadmapDayInput, 10)
        const roadmapDays = Number.isInteger(parsedRoadmapDays) && parsedRoadmapDays > 0
            ? parsedRoadmapDays
            : 7

        // Validate inputs
        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        if (!resumeContent && !selfDescription) {
            return res.status(400).json({
                message: "Either a resume or self description is required."
            })
        }

        // Use resume content or self description for AI processing
        const candidateProfile = resumeContent || selfDescription

        console.log(
            "Generating interview report with profile length:",
            candidateProfile.length,
            "Roadmap days:",
            roadmapDays
        )
        
        const interviewReportByAi = await generateInterviewReport({
            resume: candidateProfile,
            selfDescription: selfDescription,
            jobDescription,
            roadmapDays
        })

        // Use authenticated user ID if available, otherwise use a placeholder
        const userId = req.user?.id || "guest_user"

        const interviewReport = await interviewReportModel.create({
            user: userId,
            resume: resumeContent,
            selfDescription,
            jobDescription,
            title: interviewReportByAi.title || "Personalized Interview Preparation Plan",
            source: interviewReportByAi.source || "unknown",
            technicalQuestions: interviewReportByAi.technicalQuestions,
            matchScore: interviewReportByAi.matchScore,
            behavioralQuestions: interviewReportByAi.behavioralQuestions,
            skillGaps: interviewReportByAi.skillGaps,
            preparationPlan: interviewReportByAi.preparationPlan,
        })

        console.log("Interview report created successfully:", interviewReport._id)

        return res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        })
    } catch (error) {
        console.error("Interview report generation error:", error)
        
        // Determine appropriate status code and message based on error
        let statusCode = 500
        let message = error.message || "Failed to generate interview report."

        // Handle rate limit/quota errors
        if (message.includes("rate limit") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED") || message.includes("live report could not be generated")) {
            statusCode = 429
            message = "Groq API rate limit or quota exceeded. Please try again in a few moments."
        }
        
        // Handle authentication errors
        if (message.includes("authentication") || message.includes("UNAUTHENTICATED") || message.includes("API key")) {
            statusCode = 401
            message = "API authentication failed. Please check your GROQ_API_KEY configuration."
        }
        
        // Handle validation errors
        if (message.includes("Invalid") || message.includes("INVALID_ARGUMENT")) {
            statusCode = 400
        }

        return res.status(statusCode).json({
            message: message,
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        })
    }
}



async function getInterviewReportByIdController(req, res){
    const { interviewId } = req.params
    const userId = req.user?.id || "guest_user"
    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: userId })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report retrieved successfully.",
        interviewReport
    })
}



async function getAllInterviewReportsController(req, res) {
    const userId = req.user?.id || "guest_user"
    const interviewReports = await interviewReportModel.find({ user: userId }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports retrieved successfully.",
        interviewReports
    })
}   


async function generateResumePdfController(req, res) {
    try {
        const {interviewReportId} = req.params

        const interviewReport = await interviewReportModel.findById(interviewReportId)

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const {resume, selfDescription, jobDescription} = interviewReport

        const pdfBuffer = await generateResumePdf({
            resume, jobDescription, selfDescription
        })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="resume_${interviewReportId}.pdf"`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)
    } catch (error) {
        console.error("Resume PDF generation error:", error)

        return res.status(500).json({
            message: error.message || "Failed to generate resume PDF."
        })
    }
}






module.exports = { generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }
