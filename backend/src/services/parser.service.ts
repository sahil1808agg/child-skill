import OpenAI from 'openai'
import {
  ISubject,
  ISkillAssessment,
  IBehavioralTrait,
  IWorkHabit
} from '../models/Report'
import summarizationService from './summarization.service'

export interface ParsedReportData {
  reportDate: Date
  academicYear: string
  term: string

  // Academic Performance
  subjects: ISubject[]
  overallGrade?: string
  overallPercentage?: number

  // Skills & Development
  skillAssessments?: ISkillAssessment[]
  behavioralTraits?: IBehavioralTrait[]
  workHabits?: IWorkHabit[]

  // Learning & Social Skills
  readingLevel?: string
  mathLevel?: string
  participation?: string
  effort?: string
  cooperation?: string
  responsibility?: string
  selfControl?: string

  // Teacher Feedback
  teacherComments?: string
  areasOfStrength?: string[]
  areasOfImprovement?: string[]

  // Attendance & Behavior
  attendance?: number
  behavior?: string
  punctuality?: string
}

export class ParserService {
  private openai: OpenAI | null = null

  private getOpenAIClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) {
      return null
    }
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    return this.openai
  }

  async parseReportText(extractedText: string): Promise<ParsedReportData> {
    const openai = this.getOpenAIClient()

    if (!openai) {
      console.log('OpenAI API key not found, using fallback parser')
      return this.fallbackParser(extractedText)
    }

    try {
      const prompt = `You are a report card parser. Extract structured data from the following report card text.
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "reportDate": "YYYY-MM-DD",
  "academicYear": "2023-2024",
  "term": "First Term/Second Term/etc",
  "subjects": [
    {
      "name": "Subject name",
      "grade": "A/B/C/etc",
      "percentage": 85,
      "remarks": "optional remarks"
    }
  ],
  "overallGrade": "A",
  "overallPercentage": 85,
  "teacherComments": "Teacher's overall comments",
  "areasOfStrength": ["strength 1", "strength 2"],
  "areasOfImprovement": ["improvement area 1", "improvement area 2"],
  "attendance": 95,
  "behavior": "Excellent/Good/etc"
}

Report card text:
${extractedText}

Remember: Return ONLY the JSON object, nothing else.`

      const completion = await openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })

      const responseText = completion.choices[0].message.content || '{}'
      const parsedData = JSON.parse(responseText)

      // Summarize teacher comments if they're long
      let teacherComments = parsedData.teacherComments
      if (teacherComments && teacherComments.length > 300) {
        teacherComments = await summarizationService.summarizeTeacherComments(teacherComments)
      }

      return {
        reportDate: new Date(parsedData.reportDate || new Date()),
        academicYear: parsedData.academicYear || new Date().getFullYear().toString(),
        term: parsedData.term || 'Unknown',
        subjects: parsedData.subjects || [],
        overallGrade: parsedData.overallGrade,
        overallPercentage: parsedData.overallPercentage,
        teacherComments,
        areasOfStrength: parsedData.areasOfStrength,
        areasOfImprovement: parsedData.areasOfImprovement,
        attendance: parsedData.attendance,
        behavior: parsedData.behavior
      }
    } catch (error) {
      console.error('Error parsing with OpenAI:', error)
      return await this.fallbackParser(extractedText)
    }
  }

  private async fallbackParser(text: string): Promise<ParsedReportData> {
    const subjects: ISubject[] = []
    const currentYear = new Date().getFullYear()

    const gradePattern = /([A-Za-z\s]+):\s*([A-F][+-]?|\d+%?)/g
    let match

    while ((match = gradePattern.exec(text)) !== null) {
      const subjectName = match[1].trim()
      const grade = match[2].trim()

      if (subjectName.length > 0) {
        const percentage = grade.includes('%')
          ? parseInt(grade.replace('%', ''))
          : undefined

        subjects.push({
          name: subjectName,
          grade: grade,
          percentage
        })
      }
    }

    // Summarize teacher comments using the summarization service
    const teacherComments = text.length > 300
      ? await summarizationService.summarizeTeacherComments(text)
      : text

    return {
      reportDate: new Date(),
      academicYear: `${currentYear}-${currentYear + 1}`,
      term: 'Unknown',
      subjects,
      teacherComments
    }
  }
}

export default new ParserService()
