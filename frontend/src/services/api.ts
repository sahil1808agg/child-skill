import axios from 'axios'
import { Student, Report, Analysis, ActivityRecommendation, CurrentActivity } from '../types'

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

export const createStudent = async (studentData: {
  name: string;
  dateOfBirth: string;
  grade?: string;
}): Promise<Student> => {
  const response = await api.post('/students', studentData)
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

export const updateStudent = async (id: string, data: Partial<Student>): Promise<Student> => {
  const response = await api.put(`/students/${id}`, data)
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

export interface LocationParams {
  lat?: number;
  lng?: number;
  city?: string;
  address?: string;
}

export interface ActivityRecommendationsResponse {
  recommendations: ActivityRecommendation[];
  currentActivityEvaluations?: import('../types').CurrentActivityEvaluation[];
}

export const fetchActivityRecommendations = async (
  reportId: string,
  location?: LocationParams,
  currentActivities?: string[]
): Promise<ActivityRecommendationsResponse> => {
  const params = new URLSearchParams();

  if (location) {
    if (location.lat !== undefined && location.lng !== undefined) {
      params.append('lat', location.lat.toString());
      params.append('lng', location.lng.toString());
    } else if (location.city) {
      params.append('city', location.city);
    } else if (location.address) {
      params.append('address', location.address);
    }
  }

  if (currentActivities && currentActivities.length > 0) {
    currentActivities.forEach(activity => {
      params.append('currentActivities', activity);
    });
  }

  const queryString = params.toString();
  const url = `/reports/${reportId}/recommendations${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return {
    recommendations: response.data.recommendations,
    currentActivityEvaluations: response.data.currentActivityEvaluations
  };
}

export interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export const getLocationAutocomplete = async (input: string): Promise<LocationSuggestion[]> => {
  if (!input || input.trim().length < 2) {
    return [];
  }

  try {
    const response = await api.get('/reports/location/autocomplete', {
      params: { input: input.trim() }
    });
    return response.data.suggestions || [];
  } catch (error) {
    console.error('Error fetching location autocomplete:', error);
    return [];
  }
}

export const downloadReportPDF = async (
  reportId: string,
  options?: {
    includeRecommendations?: boolean;
    address?: string;
    city?: string;
    currentActivities?: string[];
  }
): Promise<void> => {
  try {
    const response = await api.post(
      `/reports/${reportId}/download-pdf`,
      {
        includeRecommendations: options?.includeRecommendations || false,
        address: options?.address || '',
        city: options?.city || '',
        currentActivities: options?.currentActivities || []
      },
      {
        responseType: 'blob' // Important for file download
      }
    );

    // Create a blob from the PDF response
    const blob = new Blob([response.data], { type: 'application/pdf' });

    // Create a download link and trigger it
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF report');
  }
}

// Current Activities API
export const fetchCurrentActivities = async (studentId: string, includeInactive?: boolean): Promise<CurrentActivity[]> => {
  const params = includeInactive ? { includeInactive: 'true' } : {}
  const response = await api.get(`/current-activities/student/${studentId}`, { params })
  return response.data
}

export const addCurrentActivity = async (
  studentId: string,
  activityData: {
    activityName: string;
    startDate?: string;
    frequency?: string;
    notes?: string;
  }
): Promise<CurrentActivity> => {
  const response = await api.post(`/current-activities/student/${studentId}`, activityData)
  return response.data
}

export const updateCurrentActivity = async (
  activityId: string,
  activityData: {
    activityName?: string;
    startDate?: string;
    frequency?: string;
    notes?: string;
    isActive?: boolean;
  }
): Promise<CurrentActivity> => {
  const response = await api.put(`/current-activities/${activityId}`, activityData)
  return response.data
}

export const deleteCurrentActivity = async (activityId: string): Promise<{ message: string; activityId: string }> => {
  const response = await api.delete(`/current-activities/${activityId}`)
  return response.data
}

export const toggleActivityStatus = async (activityId: string): Promise<CurrentActivity> => {
  const response = await api.patch(`/current-activities/${activityId}/toggle`)
  return response.data
}

export default api
