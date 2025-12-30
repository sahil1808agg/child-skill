export interface Student {
  _id: string;
  name: string;
  dateOfBirth: string;
  grade?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  name: string;
  grade: string;
  percentage?: number;
  remarks?: string;
}

export interface ReportSummary {
  overallPerformance: string;
  keyStrengths: string[];
  areasNeedingAttention: string[];
  teacherHighlights: string[];
  generatedAt: string;
}

export interface Report {
  _id: string;
  studentId: string;
  reportDate: string;
  academicYear: string;
  term: string;
  subjects: Subject[];
  overallGrade?: string;
  overallPercentage?: number;
  teacherComments?: string;
  areasOfStrength?: string[];
  areasOfImprovement?: string[];
  attendance?: number;
  behavior?: string;
  uploadedFile?: string;
  summary?: ReportSummary;
  createdAt: string;
}

export interface ProgressData {
  subject: string;
  data: {
    date: string;
    grade: string;
    percentage?: number;
  }[];
}

export interface Analysis {
  strengths: string[];
  improvements: string[];
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  recommendations: string[];
}

export interface Venue {
  name: string;
  address: string;
  distance?: string;
  rating?: number;
  totalRatings?: number;
  phone?: string;
  website?: string;
  placeId: string;
  latitude: number;
  longitude: number;
  types: string[];
}

export interface ActivityRecommendation {
  id: string;
  name: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetAttributes: string[];
  description: string;
  benefits: string[];
  frequency: string;
  estimatedCost: string;
  ageAppropriate: boolean;
  whyRecommended: string;
  venues?: Venue[];
}
