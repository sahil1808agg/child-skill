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
