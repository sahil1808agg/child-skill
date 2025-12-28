import OpenAI from 'openai'
import {
  IIBSubjectArea
} from '../models/Report'
import summarizationService from './summarization.service'

export interface ParsedIBReportData {
  reportDate: Date
  academicYear: string
  term: string
  reportType: 'ib-standards'

  // IB-specific data
  ibSubjectAreas: IIBSubjectArea[]
  learnerProfileAttributes: Array<{
    attribute: string
    evidence?: string
  }>

  // Teacher Feedback
  teacherComments?: string
  areasOfStrength: string[]
  areasOfImprovement: string[]

  // Attendance
  attendance?: number
}

export class IBParserService {
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

  /**
   * Detects if the extracted text is from an IB standards-based report
   */
  isIBReport(text: string): boolean {
    const ibIndicators = [
      /learning continuum/i,
      /beginning|developing|achieving|excelling/i,
      /learner profile/i,
      /inquirer|thinker|communicator|principled|open-minded|caring|risk-taker|balanced|reflective/i,
      /effort grade/i,
      /ib primary years/i,
      /pyp/i,
      /transdisciplinary theme/i
    ]

    // Check if at least 3 IB indicators are present
    const matchCount = ibIndicators.filter(pattern => pattern.test(text)).length
    return matchCount >= 3
  }

  async parseIBReport(extractedText: string): Promise<ParsedIBReportData> {
    const openai = this.getOpenAIClient()

    if (!openai) {
      console.log('OpenAI API key not found, using IB fallback parser')
      return this.ibFallbackParser(extractedText)
    }

    try {
      const prompt = `You are an expert IB PYP (Primary Years Programme) report card parser. Extract ALL data from this IB standards-based report.

IB reports use Learning Continuum Indicators:
- B (Beginning): Student is beginning to demonstrate understanding with extensive support
- D (Developing): Student is making progress with guided support
- A (Achieving): Student demonstrates understanding independently
- E (Excelling): Student demonstrates in-depth understanding in different situations
- NA (Not Assessed): Not assessed in this period

Extract and return a valid JSON object with this structure:
{
  "reportDate": "YYYY-MM-DD",
  "academicYear": "2024-2025",
  "term": "Semester 1/Term 1/etc",
  "ibSubjectAreas": [
    {
      "subjectName": "English",
      "effortGrade": "D",
      "skills": [
        {
          "skillName": "Listens and responds to storybooks",
          "indicator": "D",
          "description": "Optional description"
        },
        {
          "skillName": "Recognises own name in print",
          "indicator": "A"
        }
      ]
    },
    {
      "subjectName": "Mathematics",
      "effortGrade": "A",
      "skills": [
        {
          "skillName": "Rote counts till 20",
          "indicator": "A"
        }
      ]
    }
  ],
  "learnerProfileAttributes": [
    {
      "attribute": "Inquirer",
      "evidence": "Demonstrated curiosity during nature walk activities"
    },
    {
      "attribute": "Thinker",
      "evidence": "Made meaningful connections between stories and observations"
    }
  ],
  "teacherComments": "Full teacher comments/observations text",
  "areasOfStrength": [
    "Excellent listening skills",
    "Strong mathematical abilities",
    "Demonstrates inquiry mindset"
  ],
  "areasOfImprovement": [
    "English language development",
    "Swimming skills need practice"
  ],
  "attendance": 91.49
}

IMPORTANT INSTRUCTIONS:
1. Extract ALL subject areas mentioned (UOI, English, Math, ICT, Hindi, PSPE, Arts, etc.)
2. For each subject, extract the "Effort Grade" if mentioned
3. Extract ALL individual skills with their indicators (B/D/A/E/NA)
4. Extract IB Learner Profile attributes mentioned (Inquirer, Thinker, Communicator, etc.) with evidence
5. Extract teacher observations, comments, and feedback
6. Identify strengths and areas for improvement from teacher comments
7. Extract attendance percentage

Report text:
${extractedText}

Return ONLY the JSON, no markdown, no code blocks.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })

      const responseText = completion.choices[0].message.content || '{}'
      const parsedData = JSON.parse(responseText)

      return await this.normalizeIBResponse(parsedData)
    } catch (error) {
      console.error('Error parsing IB report with OpenAI:', error)
      return await this.ibFallbackParser(extractedText)
    }
  }

  private async normalizeIBResponse(data: any): Promise<ParsedIBReportData> {
    // Summarize teacher comments if they exist and are long
    let teacherComments = data.teacherComments;
    if (teacherComments && teacherComments.length > 300) {
      teacherComments = await summarizationService.summarizeTeacherComments(teacherComments);
    }

    return {
      reportDate: new Date(data.reportDate || new Date()),
      academicYear: data.academicYear || new Date().getFullYear().toString(),
      term: data.term || 'Unknown',
      reportType: 'ib-standards',
      ibSubjectAreas: data.ibSubjectAreas || [],
      learnerProfileAttributes: data.learnerProfileAttributes || [],
      teacherComments,
      areasOfStrength: data.areasOfStrength || [],
      areasOfImprovement: data.areasOfImprovement || [],
      attendance: data.attendance
    }
  }

  private async ibFallbackParser(text: string): Promise<ParsedIBReportData> {
    const textLower = text.toLowerCase()
    const currentYear = new Date().getFullYear()

    // Extract subject areas with effort grades
    const ibSubjectAreas = this.extractIBSubjectAreas(text)

    // Extract learner profile attributes
    const learnerProfileAttributes = this.extractLearnerProfile(text)

    // Extract attendance
    const attendance = this.extractAttendance(text)

    // Extract teacher comments
    let teacherComments = this.extractTeacherComments(text)

    // Summarize if comments are long
    if (teacherComments && teacherComments.length > 300) {
      teacherComments = await summarizationService.summarizeTeacherComments(teacherComments)
    }

    // Extract strengths and improvements from comments
    const areasOfStrength = this.extractStrengthsFromComments(text)
    const areasOfImprovement = this.extractImprovementsFromComments(text)

    return {
      reportDate: new Date(),
      academicYear: `${currentYear}-${currentYear + 1}`,
      term: this.extractTerm(text),
      reportType: 'ib-standards',
      ibSubjectAreas,
      learnerProfileAttributes,
      teacherComments,
      areasOfStrength,
      areasOfImprovement,
      attendance
    }
  }

  private extractIBSubjectAreas(text: string): IIBSubjectArea[] {
    const subjectAreas: IIBSubjectArea[] = []

    // Common IB PYP subject area names
    const subjectPatterns = [
      { name: 'Unit of Inquiry', aliases: ['uoi', 'unit of inquiry'] },
      { name: 'English', aliases: ['english', 'language arts'] },
      { name: 'Mathematics', aliases: ['mathematics', 'math', 'maths'] },
      { name: 'ICT', aliases: ['ict', 'technology', 'computer'] },
      { name: 'Hindi', aliases: ['hindi'] },
      { name: 'PSPE', aliases: ['pspe', 'physical education', 'pe'] },
      { name: 'Arts', aliases: ['arts', 'visual art', 'music', 'dance', 'drama'] }
    ]

    for (const subject of subjectPatterns) {
      const foundData = this.findSubjectData(text, subject.name, subject.aliases)
      if (foundData) {
        subjectAreas.push(foundData)
      }
    }

    return subjectAreas
  }

  private findSubjectData(text: string, subjectName: string, aliases: string[]): IIBSubjectArea | null {
    // Try to find effort grade for this subject
    let effortGrade: string | undefined

    for (const alias of aliases) {
      // Multiple patterns to catch different formats:
      // Pattern 1: "Subject\nSemester 1 - Subject\n  Effort Grade   A"
      // Pattern 2: "Subject:\nEffort Grade: A"
      // Pattern 3: Tables with effort grade indicators
      const patterns = [
        new RegExp(`${alias}[\\s\\S]{0,300}effort\\s+grade[:\\s]+(B|D|A|E|NA)`, 'i'),
        new RegExp(`semester\\s+\\d+\\s+-\\s+${alias}[\\s\\S]{0,200}effort\\s+grade[:\\s]+(B|D|A|E|NA)`, 'i'),
        // For subjects in table format with indicators nearby
        new RegExp(`${alias}[^\\n]{0,150}\\b([BDAENA])\\b`, 'i')
      ]

      for (const pattern of patterns) {
        const match = pattern.exec(text)
        if (match) {
          const grade = match[1].toUpperCase()
          // Validate it's actually an IB indicator
          if (['B', 'D', 'A', 'E', 'NA'].includes(grade)) {
            effortGrade = grade
            break
          }
        }
      }

      if (effortGrade) break
    }

    // Also try to extract from structured sections
    if (!effortGrade) {
      // Look for section headers like "English\nMalvika Jha, Namrata Gusain"
      // followed by skills and eventually an effort grade
      for (const alias of aliases) {
        const sectionPattern = new RegExp(
          `${alias}[\\s\\S]{0,1000}Semester\\s+\\d+[\\s\\S]{0,300}Effort\\s+[Gg]rade[\\s\\S]{0,50}\\b([BDAE])\\b`,
          'i'
        )
        const match = sectionPattern.exec(text)
        if (match) {
          effortGrade = match[1].toUpperCase()
          break
        }
      }
    }

    // If we found at least an effort grade, create the subject area
    if (effortGrade) {
      return {
        subjectName,
        effortGrade,
        skills: [] // Skills would need more complex parsing
      }
    }

    return null
  }

  private extractLearnerProfile(text: string): Array<{ attribute: string; evidence?: string }> {
    const attributes: Array<{ attribute: string; evidence?: string }> = []

    const learnerProfileTraits = [
      'Inquirer', 'Knowledgeable', 'Thinker', 'Communicator',
      'Principled', 'Open-minded', 'Caring', 'Risk-taker',
      'Balanced', 'Reflective'
    ]

    for (const trait of learnerProfileTraits) {
      // Look for mentions of the trait with surrounding context
      const pattern = new RegExp(`${trait}[\\s\\S]{0,300}`, 'i')
      const match = pattern.exec(text)

      if (match) {
        // Extract evidence (simplified - would need better extraction)
        const evidence = match[0].substring(trait.length).trim().slice(0, 200)
        attributes.push({
          attribute: trait,
          evidence: evidence.length > 20 ? evidence : undefined
        })
      }
    }

    return attributes
  }

  private extractAttendance(text: string): number | undefined {
    const attendancePattern = /(?:attendance|presence)[:\s]+(\d+(?:\.\d+)?)\s*%/i
    const match = attendancePattern.exec(text)
    return match ? parseFloat(match[1]) : undefined
  }

  private extractTeacherComments(text: string): string | undefined {
    const commentPatterns = [
      /(?:home room tutor observation|teacher(?:'s)? comment|comment)[:\s]+(.+?)(?:\n\n|Page:|Generation date:)/is,
      /faculty observations?[:\s]+(.+?)(?:\n\n|Page:|Generation date:)/is
    ]

    for (const pattern of commentPatterns) {
      const match = pattern.exec(text)
      if (match) {
        const comment = match[1].trim()
        if (comment.length > 50) return comment
      }
    }

    return undefined
  }

  private extractStrengthsFromComments(text: string): string[] {
    const strengths: string[] = []

    // Look for positive indicators in teacher comments
    const positivePatterns = [
      /excellent (listening skills|attendance|performance)/gi,
      /strong (?:in |performance in )?([^.,]+)/gi,
      /demonstrates? (?:good|excellent|outstanding) ([^.,]+)/gi,
      /confidently ([^.,]+)/gi
    ]

    for (const pattern of positivePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const strength = match[0].trim()
        if (strength.length >= 10 && strength.length <= 200) {
          strengths.push(strength)
        }
      }
    }

    return [...new Set(strengths)].slice(0, 10) // Limit to 10 unique strengths
  }

  private extractImprovementsFromComments(text: string): string[] {
    const improvements: string[] = []

    // Look for improvement indicators
    const improvementPatterns = [
      /needs (?:work|improvement|practice|attention) (?:in |on |with )?([^.,]+)/gi,
      /could (?:be )?better ([^.,]+)/gi,
      /working (?:on|towards) ([^.,]+)/gi,
      /outgrowing (?:his|her|their) ([^.,]+)/gi
    ]

    for (const pattern of improvementPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const improvement = match[0].trim()
        if (improvement.length >= 10 && improvement.length <= 200) {
          improvements.push(improvement)
        }
      }
    }

    return [...new Set(improvements)].slice(0, 10) // Limit to 10 unique areas
  }

  private extractTerm(text: string): string {
    const termPattern = /(semester|term|quarter)\s+(\d+|first|second|third|fourth)/i
    const match = termPattern.exec(text)
    return match ? match[0] : 'Unknown Term'
  }
}

export default new IBParserService()
