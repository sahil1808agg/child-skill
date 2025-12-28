import enhancedParserService, { ParsedReportData } from './enhanced-parser.service'
import ibParserService, { ParsedIBReportData } from './ib-parser.service'

export interface UnifiedParsedData {
  reportType: 'traditional' | 'ib-standards' | 'mixed'
  data: ParsedReportData | ParsedIBReportData
}

export class UnifiedParserService {
  /**
   * Main entry point: Detects report type and routes to appropriate parser
   */
  async parseReport(extractedText: string): Promise<UnifiedParsedData> {
    // Detect report type
    const reportType = this.detectReportType(extractedText)

    console.log(`Detected report type: ${reportType}`)

    if (reportType === 'ib-standards') {
      const ibData = await ibParserService.parseIBReport(extractedText)
      return {
        reportType: 'ib-standards',
        data: ibData
      }
    } else {
      // Use traditional/enhanced parser for traditional and mixed reports
      const traditionalData = await enhancedParserService.parseReportText(extractedText)
      return {
        reportType: 'traditional',
        data: traditionalData
      }
    }
  }

  /**
   * Detects whether the report is traditional grade-based or IB standards-based
   */
  private detectReportType(text: string): 'traditional' | 'ib-standards' | 'mixed' {
    const textLower = text.toLowerCase()

    // IB-specific indicators
    const ibIndicators = [
      /learning continuum indicator/i,
      /beginning\s+\(b\)|developing\s+\(d\)|achieving\s+\(a\)|excelling\s+\(e\)/i,
      /learner profile/i,
      /inquirer.*thinker.*communicator/is,
      /effort grade/i,
      /ib primary years/i,
      /pyp/i,
      /transdisciplinary theme/i,
      /unit of inquiry/i,
      /approaches to learning/i
    ]

    // Traditional grade indicators
    const traditionalIndicators = [
      /\b[A-F][+-]?\b.*\d{1,3}%/i, // Letter grades with percentages
      /grade point average|gpa/i,
      /final grade/i,
      /class rank/i,
      /semester grade/i
    ]

    // Count matches
    const ibMatches = ibIndicators.filter(pattern => pattern.test(text)).length
    const traditionalMatches = traditionalIndicators.filter(pattern => pattern.test(text)).length

    console.log(`IB indicators found: ${ibMatches}, Traditional indicators found: ${traditionalMatches}`)

    // Decision logic
    if (ibMatches >= 3) {
      return 'ib-standards'
    } else if (traditionalMatches >= 2) {
      return 'traditional'
    } else if (ibMatches > 0 && traditionalMatches > 0) {
      return 'mixed'
    } else {
      // Default to traditional if unclear
      return 'traditional'
    }
  }
}

export default new UnifiedParserService()
