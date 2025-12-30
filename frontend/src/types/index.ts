export interface Student {
  _id: string;
  name: string;
  dateOfBirth: string;
  grade?: string;
  location?: {
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
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

export interface IBSubjectArea {
  subjectName: string;
  effortGrade?: string;
  skills: Array<{
    skillName: string;
    indicator: string;
    description?: string;
  }>;
}

export interface LearnerProfileAttribute {
  attribute: string;
  evidence?: string;
}

export interface SkillAssessment {
  category: string;
  skillName: string;
  rating: string;
  score?: number;
  comments?: string;
}

export interface Report {
  _id: string;
  studentId: string;
  reportDate: string;
  academicYear: string;
  term: string;
  grade?: string;
  reportType?: 'traditional' | 'ib-standards' | 'mixed';
  subjects: Subject[];
  overallGrade?: string;
  overallPercentage?: number;
  ibSubjectAreas?: IBSubjectArea[];
  learnerProfileAttributes?: LearnerProfileAttribute[];
  skillAssessments?: SkillAssessment[];
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

export interface CurrentActivityEvaluation {
  activityName: string;
  recommendation: 'continue' | 'reconsider' | 'stop';
  reasoning: string;
  alignment: number; // 0-100 score for how well it aligns with needs
  alternatives?: string[]; // Suggested alternatives if stop/reconsider
}

export interface CurrentActivity {
  _id: string;
  studentId: string;
  activityName: string;
  startDate?: string;
  frequency?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  recommendationType?: 'improvement' | 'strength' | 'age-based';
  targetedAttributes?: string[];
  venues?: Venue[];
}
