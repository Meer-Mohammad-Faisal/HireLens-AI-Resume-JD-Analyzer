const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")

async function invokeGeminiAi() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY

    if (!apiKey) {
        console.warn("GOOGLE_GENAI_API_KEY is not set. Skipping Gemini test call.")
        return null
    }

    const { GoogleGenAI } = await import("@google/genai")

    const ai = new GoogleGenAI({
        apiKey
    })

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello gemini ! Explain what is Interview ?"
    })

    console.log(response.text)
    return response.text
}

const interviewReportSchema = z.object({

    matchScore: z.number().description("The match score between the candidate's profile and the job description, represented as a percentage"),
    technicalQuestions: z.object({
        technicalQuestions: z.array(z.object({
            question: z.string().description("The technical question can be asked during the interview"),
            intention: z.string().description("The intention  of interviewer behind asking the question"),
            answer: z.string().description("how to answer the technical question, what points to cover in the answer, what approach to take while answering the question"),
        })).description("Technical questions that can be asked during the interview"),
        
        behavioralQuestions: z.array(z.object({
            question: z.string().description("The behavioral question can be asked during the interview"),
            intention: z.string().description("The intention  of interviewer behind asking the question"),
            answer: z.string().description("how to answer the behavioral question, what points to cover in the answer, what approach to take while answering the question"),
        })).description("Behavioral questions that can be asked during the interview"),

        skillGaps: z.array(z.object({
            skill: z.string().description("The skill that the candidate is lacking and needs to improve"),
            severity: z.enum(["low", "medium", "high"]).description("The severity of the skill gap"),
        })).description("Skill gaps that the candidate has"),

        prepratonPlan: z.array(z.object({
            day: z.number().description("The day number in the preparation plan"),
            focus: z.string().description("The focus area for the day in the preparation plan"),
            tasks: z.array(z.string()).description("The tasks to be completed on the day in the preparation plan"),
        })).description("Preparation plan for the candidate to improve and fill the skill gaps before the interview"),
    })
})



async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    
}





module.exports = {
    invokeGeminiAi,
    interviewReportSchema
}
