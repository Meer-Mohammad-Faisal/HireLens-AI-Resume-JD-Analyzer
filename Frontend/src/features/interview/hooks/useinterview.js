import { generateInterviewReport, getAllInterviewReports, getInterviewReportById, generateResumePdf} from "../services/interview.api"
import { useCallback, useContext, useState } from "react"
import { InterviewContext } from "../interview.context.jsx"

export const useInterview = () => {
    const context = useContext(InterviewContext)
    const [error, setError] = useState(null)
    const [downloadError, setDownloadError] = useState(null)
    const [isDownloadingResume, setIsDownloadingResume] = useState(false)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = useCallback(async ({ jobDescription, selfDescription, resumeFile, roadmapDays }) => {
        setLoading(true)
        setError(null)
        
        try {
            if (!jobDescription?.trim()) {
                throw new Error("Job description is required")
            }
            if (!resumeFile && !selfDescription?.trim()) {
                throw new Error("Either resume or self description is required")
            }
            if (!Number.isInteger(roadmapDays) || roadmapDays < 1) {
                throw new Error("Roadmap days must be a positive whole number")
            }

            const response = await generateInterviewReport({ 
                jobDescription, 
                selfDescription, 
                resumeFile,
                roadmapDays
            })

            if (response?.interviewReport) {
                setReport(response.interviewReport)
                setReports((prevReports) => {
                    const nextReports = [response.interviewReport, ...prevReports.filter((item) => item?._id !== response.interviewReport?._id)]
                    return nextReports
                })
                return response.interviewReport
            } else if (response?._id) {
                // Response is the report itself
                setReport(response)
                setReports((prevReports) => {
                    const nextReports = [response, ...prevReports.filter((item) => item?._id !== response?._id)]
                    return nextReports
                })
                return response
            } else {
                throw new Error("Invalid response format from server")
            }
        } catch (err) {
            let errorMessage = "Error generating interview report"
            
            // Handle API quota errors
            if (err.response?.status === 429) {
                errorMessage = "Groq API Rate Limit Exceeded: Please wait a few minutes before trying again. If this persists, your Groq quota may need to be increased."
            }
            // Handle authentication errors
            else if (err.response?.status === 401) {
                errorMessage = "API Configuration Error: Please check your API key configuration."
            }
            // Handle validation errors  
            else if (err.response?.status === 400) {
                errorMessage = err.response?.data?.message || "Invalid request. Please check your input."
            }
            // Handle other API errors
            else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            // Handle network errors
            else if (!err.response) {
                errorMessage = "Network error: Unable to connect to server. Please check your connection."
            }
            // Default error message
            else {
                errorMessage = err.message || "Failed to generate report. Please try again."
            }
            
            setError(errorMessage)
            console.error("Error generating interview report:", errorMessage, err)
            throw err
        } finally {
            setLoading(false)
        }
    }, [setLoading, setReport, setReports])

    const getReportById = useCallback(async (interviewId) => {
        setLoading(true)
        setError(null)

        try {
            if (!interviewId) {
                throw new Error("Interview ID is required")
            }

            const response = await getInterviewReportById(interviewId)

            if (response?.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            } else if (response?._id) {
                // Response is the report itself
                setReport(response)
                return response
            } else {
                throw new Error("Invalid response format from server")
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Error fetching interview report"
            setError(errorMessage)
            console.error("Error fetching interview report:", errorMessage, err)
            throw err
        } finally {
            setLoading(false)
        }
    }, [setLoading, setReport])

    const getReports = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await getAllInterviewReports()

            if (response?.interviewReports) {
                setReports(response.interviewReports)
                return response.interviewReports
            } else if (Array.isArray(response)) {
                // Response is the array itself
                setReports(response)
                return response
            } else {
                throw new Error("Invalid response format from server")
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Error fetching interview reports"
            setError(errorMessage)
            console.error("Error fetching interview reports:", errorMessage, err)
            throw err
        } finally {
            setLoading(false)
        }
    }, [setLoading, setReports])


    const getResumePdf = useCallback(async (interviewReportId) => {
        if (!interviewReportId) {
            const message = "Interview report ID is required to download the resume."
            setDownloadError(message)
            throw new Error(message)
        }

        setDownloadError(null)
        setIsDownloadingResume(true)

        try {
            const response = await generateResumePdf(interviewReportId)
            const pdfBlob = response?.data instanceof Blob
                ? response.data
                : new Blob([response?.data], { type: "application/pdf" })

            const disposition = response?.headers?.["content-disposition"] || ""
            const fileNameMatch = disposition.match(/filename="?([^"]+)"?/)
            const fileName = fileNameMatch?.[1] || `resume_${interviewReportId}.pdf`
            const objectUrl = window.URL.createObjectURL(pdfBlob)
            const link = document.createElement("a")

            link.href = objectUrl
            link.setAttribute("download", fileName)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(objectUrl)
        } catch (err) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                "Unable to download your resume right now."

            setDownloadError(errorMessage)
            console.error("Error downloading resume PDF:", errorMessage, err)
            throw err
        } finally {
            setIsDownloadingResume(false)
        }
    }, [])

    return { 
        loading, 
        report, 
        reports, 
        error,
        downloadError,
        isDownloadingResume,
        generateReport, 
        getReportById, 
        getReports,
        getResumePdf 
    }
}
