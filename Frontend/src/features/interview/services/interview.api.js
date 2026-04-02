import axios from 'axios'
import { apiBaseUrl } from '../../../shared/api.base'

const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
})


export const generateInterviewReport = async ({jobDescription, selfDescription, resumeFile, roadmapDays}) => {
    const formData = new FormData()
    formData.append('jobDescription', jobDescription)
    formData.append('selfDescription', selfDescription || '')
    formData.append('roadmapDays', String(roadmapDays || 7))
    formData.append('roadmapDuration', String(roadmapDays || 7))
    formData.append('days', String(roadmapDays || 7))

    if (resumeFile) {
        formData.append('resume', resumeFile)
    }

    const response = await api.post('/api/interview', formData)

    return response.data
} 


export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


export const getAllInterviewReports = async () => {
    const response = await api.get('/api/interview')

    return response.data
}


export const generateResumePdf = async (interviewReportId) => {
    const response = await api.get(`/api/interview/resume/pdf/${interviewReportId}`, {
        responseType: 'blob'
    })

    return response
}
