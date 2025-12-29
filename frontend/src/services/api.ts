import axios from 'axios'
import { Student, Report, Analysis, ActivityRecommendation } from '../types'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const fetchStudents = async (): Promise<Student[]> => {
  const response = await api.get('/students')
  return response.data
}

export const fetchStudent = async (id: string): Promise<Student> => {
  const response = await api.get(`/students/${id}`)
  return response.data
}

export const fetchStudentReports = async (studentId: string): Promise<Report[]> => {
  const response = await api.get(`/students/${studentId}/reports`)
  return response.data
}

export const fetchStudentAnalysis = async (studentId: string): Promise<Analysis> => {
  const response = await api.get(`/students/${studentId}/analysis`)
  return response.data
}

export const uploadReport = async (formData: FormData): Promise<any> => {
  const response = await api.post('/reports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export const deleteStudent = async (studentId: string): Promise<{ message: string; studentName: string; reportsDeleted: number }> => {
  const response = await api.delete(`/students/${studentId}`)
  return response.data
}

export const deleteReport = async (reportId: string): Promise<{ message: string; studentId: string; reportId: string }> => {
  const response = await api.delete(`/reports/${reportId}`)
  return response.data
}

export const fetchActivityRecommendations = async (reportId: string): Promise<ActivityRecommendation[]> => {
  const response = await api.get(`/reports/${reportId}/recommendations`)
  return response.data.recommendations
}

export default api
