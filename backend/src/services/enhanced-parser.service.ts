import OpenAI from 'openai'
import {
  ISubject,
  ISkillAssessment,
  IBehavioralTrait,
  IWorkHabit
} from '../models/Report'

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

export class EnhancedParserService {
  private openai: OpenAI | null = null

  // Rating keywords mapping
  private ratingKeywords = {
    excellent: ['excellent', 'outstanding', 'exceptional', 'superior', 'exemplary'],
    good: ['good', 'satisfactory', 'proficient', 'competent', 'adequate'],
    needsWork: ['needs improvement', 'developing', 'emerging', 'progressing', 'growing']
  }

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

  private ratingToScore(rating: string): number {
    const normalized = rating.toLowerCase()
    if (this.ratingKeywords.excellent.some(kw => normalized.includes(kw))) return 4
    if (this.ratingKeywords.good.some(kw => normalized.includes(kw))) return 3
    if (this.ratingKeywords.needsWork.some(kw => normalized.includes(kw))) return 2
    return 3 // default to satisfactory
  }

  async parseReportText(extractedText: string): Promise<ParsedReportData> {
    const openai = this.getOpenAIClient()

    if (!openai) {
      console.log('OpenAI API key not found, using enhanced fallback parser')
      return this.comprehensiveFallbackParser(extractedText)
    }

    try {
      const prompt = `You are an advanced report card parser. Extract ALL evaluation data from this report.

IMPORTANT: Extract EVERYTHING - not just academic subjects. Include:
- Academic subjects (Math, English, etc.)
- Social skills (cooperation, respect, etc.)
- Work habits (organization, homework completion, etc.)
- Behavioral traits (self-control, responsibility, etc.)
- Learning skills (reading level, participation, effort, etc.)

Return a valid JSON object with this structure:
{
  "reportDate": "YYYY-MM-DD",
  "academicYear": "2023-2024",
  "term": "First/Second/Third Term",
  "subjects": [{"name": "Math", "grade": "A", "percentage": 92, "remarks": ""}],
  "skillAssessments": [
    {"category": "Social Skills", "skillName": "Cooperation", "rating": "Excellent", "score": 4, "comments": ""}
  ],
  "behavioralTraits": [
    {"trait": "Respect", "rating": "Good", "score": 3}
  ],
  "workHabits": [
    {"habit": "Organization", "rating": "Needs Improvement", "score": 2}
  ],
  "readingLevel": "Grade 3",
  "mathLevel": "Advanced",
  "participation": "Excellent",
  "effort": "Good",
  "cooperation": "Excellent",
  "responsibility": "Satisfactory",
  "selfControl": "Good",
  "overallGrade": "B+",
  "overallPercentage": 87,
  "teacherComments": "Overall comments",
  "areasOfStrength": ["Math", "Reading"],
  "areasOfImprovement": ["Organization", "Homework"],
  "attendance": 95,
  "behavior": "Excellent",
  "punctuality": "Good"
}

Report text:
${extractedText}

Return ONLY the JSON, no markdown.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })

      const responseText = completion.choices[0].message.content || '{}'
      const parsedData = JSON.parse(responseText)

      return this.normalizeOpenAIResponse(parsedData)
    } catch (error) {
      console.error('Error parsing with OpenAI:', error)
      return this.comprehensiveFallbackParser(extractedText)
    }
  }

  private normalizeOpenAIResponse(data: any): ParsedReportData {
    return {
      reportDate: new Date(data.reportDate || new Date()),
      academicYear: data.academicYear || new Date().getFullYear().toString(),
      term: data.term || 'Unknown',
      subjects: data.subjects || [],
      skillAssessments: data.skillAssessments || [],
      behavioralTraits: data.behavioralTraits || [],
      workHabits: data.workHabits || [],
      readingLevel: data.readingLevel,
      mathLevel: data.mathLevel,
      participation: data.participation,
      effort: data.effort,
      cooperation: data.cooperation,
      responsibility: data.responsibility,
      selfControl: data.selfControl,
      overallGrade: data.overallGrade,
      overallPercentage: data.overallPercentage,
      teacherComments: data.teacherComments,
      areasOfStrength: data.areasOfStrength || [],
      areasOfImprovement: data.areasOfImprovement || [],
      attendance: data.attendance,
      behavior: data.behavior,
      punctuality: data.punctuality
    }
  }

  private comprehensiveFallbackParser(text: string): ParsedReportData {
    const textLower = text.toLowerCase()
    const currentYear = new Date().getFullYear()

    // Extract subjects
    const subjects = this.extractSubjects(text)

    // Extract skill assessments
    const skillAssessments = this.extractSkillAssessments(text)

    // Extract behavioral traits
    const behavioralTraits = this.extractBehavioralTraits(text)

    // Extract work habits
    const workHabits = this.extractWorkHabits(text)

    // Extract specific skills
    const participation = this.extractParameter(text, ['participation', 'participates'])
    const effort = this.extractParameter(text, ['effort', 'tries hard', 'work ethic'])
    const cooperation = this.extractParameter(text, ['cooperation', 'cooperates', 'works well with others'])
    const responsibility = this.extractParameter(text, ['responsibility', 'responsible'])
    const selfControl = this.extractParameter(text, ['self-control', 'self control', 'manages behavior'])

    // Extract reading/math levels
    const readingLevel = this.extractLevel(text, 'reading')
    const mathLevel = this.extractLevel(text, 'math')

    // Extract attendance
    const attendance = this.extractAttendance(text)

    // Extract teacher comments
    const teacherComments = this.extractComments(text)

    // Extract strengths and improvements
    const areasOfStrength = this.extractAreas(text, ['strength', 'excels', 'strong'])
    const areasOfImprovement = this.extractAreas(text, ['improvement', 'needs work', 'develop'])

    return {
      reportDate: new Date(),
      academicYear: `${currentYear}-${currentYear + 1}`,
      term: this.extractTerm(text),
      subjects,
      skillAssessments,
      behavioralTraits,
      workHabits,
      readingLevel,
      mathLevel,
      participation,
      effort,
      cooperation,
      responsibility,
      selfControl,
      teacherComments,
      areasOfStrength,
      areasOfImprovement,
      attendance
    }
  }

  private extractSubjects(text: string): ISubject[] {
    const subjects: ISubject[] = []

    // Valid subject names
    const validSubjects = [
      'math', 'mathematics', 'english', 'science', 'history', 'geography',
      'social studies', 'language arts', 'reading', 'writing', 'spelling',
      'art', 'music', 'physical education', 'pe', 'computer', 'technology',
      'french', 'spanish', 'mandarin', 'hindi', 'languages', 'drama',
      'health', 'biology', 'chemistry', 'physics', 'literature',
      'visual arts', 'performing arts', 'dance', 'theater'
    ]

    const subjectPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:|-]\s*([A-F][+-]?|\d+%?|Excellent|Good|Satisfactory|Needs\s+Improvement)/gi

    let match
    while ((match = subjectPattern.exec(text)) !== null) {
      const subjectName = match[1].trim()
      const grade = match[2].trim()

      // Strict validation
      const subjectLower = subjectName.toLowerCase()

      // Must be a valid subject name or reasonable length
      const isValidSubject = validSubjects.some(valid =>
        subjectLower.includes(valid) || valid.includes(subjectLower)
      ) || (subjectName.length >= 4 && subjectName.length <= 30)

      // Filter out garbage
      const excludeWords = ['student', 'teacher', 'parent', 'school', 'date', 'term',
                            'grade', 'page', 'report', 'year', 'class', 'apr', 'jul',
                            'jan', 'feb', 'mar', 'may', 'jun', 'aug', 'sep', 'oct', 'nov', 'dec',
                            'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
                            'including', 'tree', 'life', 'call', 'age', 'using']

      const hasExcludedWord = excludeWords.some(word => subjectLower.includes(word))

      // Must have valid grade
      const hasValidGrade = /^[A-F][+-]?$|^\d+%?$|^(Excellent|Good|Satisfactory|Needs\s+Improvement)$/i.test(grade)

      // Must not be just numbers or dates
      const isNotDate = !/^\d+$|^\d{4}$/.test(subjectName)

      if (isValidSubject && !hasExcludedWord && hasValidGrade && isNotDate) {
        const percentage = grade.includes('%') ? parseInt(grade) : undefined

        // Validate percentage is reasonable
        if (percentage === undefined || (percentage >= 0 && percentage <= 100)) {
          subjects.push({
            name: subjectName,
            grade: grade,
            percentage
          })
        }
      }
    }

    return subjects
  }

  private extractSkillAssessments(text: string): ISkillAssessment[] {
    const skills: ISkillAssessment[] = []
    const skillCategories = [
      { category: 'Social Skills', keywords: ['shares', 'takes turns', 'listens', 'respects others'] },
      { category: 'Learning Skills', keywords: ['problem solving', 'critical thinking', 'creativity'] },
      { category: 'Communication', keywords: ['expresses ideas', 'asks questions', 'listens actively'] }
    ]

    skillCategories.forEach(({ category, keywords }) => {
      keywords.forEach(keyword => {
        const pattern = new RegExp(`${keyword}\\s*[:|-]?\\s*(excellent|good|satisfactory|needs improvement|developing)`, 'gi')
        const match = pattern.exec(text)

        if (match) {
          skills.push({
            category,
            skillName: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            rating: match[1],
            score: this.ratingToScore(match[1])
          })
        }
      })
    })

    return skills
  }

  private extractBehavioralTraits(text: string): IBehavioralTrait[] {
    const traits: IBehavioralTrait[] = []
    const behaviorKeywords = ['respect', 'kindness', 'honesty', 'integrity', 'empathy', 'self-control']

    behaviorKeywords.forEach(trait => {
      const pattern = new RegExp(`${trait}\\s*[:|-]?\\s*(excellent|good|satisfactory|needs improvement)`, 'gi')
      const match = pattern.exec(text)

      if (match) {
        traits.push({
          trait: trait.charAt(0).toUpperCase() + trait.slice(1),
          rating: match[1],
          score: this.ratingToScore(match[1])
        })
      }
    })

    return traits
  }

  private extractWorkHabits(text: string): IWorkHabit[] {
    const habits: IWorkHabit[] = []
    const habitKeywords = ['organization', 'homework completion', 'preparation', 'time management', 'follows directions']

    habitKeywords.forEach(habit => {
      const pattern = new RegExp(`${habit}\\s*[:|-]?\\s*(excellent|good|satisfactory|needs improvement)`, 'gi')
      const match = pattern.exec(text)

      if (match) {
        habits.push({
          habit: habit.charAt(0).toUpperCase() + habit.slice(1),
          rating: match[1],
          score: this.ratingToScore(match[1])
        })
      }
    })

    return habits
  }

  private extractParameter(text: string, keywords: string[]): string | undefined {
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}\\s*[:|-]?\\s*(excellent|good|satisfactory|needs improvement|developing)`, 'gi')
      const match = pattern.exec(text)
      if (match) return match[1]
    }
    return undefined
  }

  private extractLevel(text: string, subject: string): string | undefined {
    const pattern = new RegExp(`${subject}\\s+level\\s*[:|-]?\\s*([A-Z0-9\\s]+)`, 'gi')
    const match = pattern.exec(text)
    return match ? match[1].trim() : undefined
  }

  private extractAttendance(text: string): number | undefined {
    const attendancePattern = /attendance\s*[:|-]?\s*(\d+)%?/i
    const match = attendancePattern.exec(text)
    return match ? parseInt(match[1]) : undefined
  }

  private extractTerm(text: string): string {
    const termPattern = /(first|second|third|fourth|1st|2nd|3rd|4th)\s+(term|quarter|semester)/i
    const match = termPattern.exec(text)
    return match ? match[0] : 'Unknown Term'
  }

  private extractComments(text: string): string | undefined {
    const commentPatterns = [
      /teacher(?:'s)?\s+comments?\s*[:|-]?\s*(.+?)(?:\n\n|\.\s*[A-Z]|$)/is,
      /comments?\s*[:|-]?\s*(.+?)(?:\n\n|\.\s*[A-Z]|$)/is,
      /remarks?\s*[:|-]?\s*(.+?)(?:\n\n|\.\s*[A-Z]|$)/is
    ]

    for (const pattern of commentPatterns) {
      const match = pattern.exec(text)
      if (match) {
        const comment = match[1].trim()
        if (comment.length > 20) return comment
      }
    }

    return undefined
  }

  private extractAreas(text: string, keywords: string[]): string[] {
    const areas: string[] = []

    keywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword}[^:]*[:|-]?\\s*([^.\\n]+)`, 'gi')
      const match = pattern.exec(text)

      if (match) {
        const items = match[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3)
        areas.push(...items)
      }
    })

    return [...new Set(areas)] // Remove duplicates
  }
}

export default new EnhancedParserService()
