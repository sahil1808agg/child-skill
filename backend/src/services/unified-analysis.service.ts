import Report, { IReport } from '../models/Report'

export interface AnalysisResult {
  strengths: string[]
  improvements: string[]
  trends: {
    improving: string[]
    declining: string[]
    stable: string[]
  }
  recommendations: string[]
  reportType?: 'traditional' | 'ib-standards' | 'mixed'
}

interface PerformanceMetric {
  name: string
  scores: number[]
  labels: string[] // The actual grades/indicators
  averageScore: number
  trend: 'improving' | 'declining' | 'stable'
  improvement: number
}

export class UnifiedAnalysisService {
  /**
   * Main entry point: Analyzes student progress across all reports
   */
  async analyzeStudentProgress(studentId: string): Promise<AnalysisResult> {
    const reports = await Report.find({ studentId }).sort({ reportDate: 1 })

    if (reports.length === 0) {
      return {
        strengths: [],
        improvements: [],
        trends: { improving: [], declining: [], stable: [] },
        recommendations: ['Upload reports to start tracking progress and getting insights']
      }
    }

    // Detect if we have IB reports, traditional reports, or mixed
    const reportTypes = new Set(reports.map(r => r.reportType || 'traditional'))
    const primaryType = reports[reports.length - 1].reportType || 'traditional'

    if (reports.length === 1) {
      return this.analyzeSingleReport(reports[0])
    }

    // Analyze based on report type
    if (reportTypes.has('ib-standards')) {
      return this.analyzeIBReports(reports, primaryType)
    } else {
      return this.analyzeTraditionalReports(reports)
    }
  }

  /**
   * Analyzes a single report (first upload)
   */
  private analyzeSingleReport(report: IReport): AnalysisResult {
    const strengths: string[] = []
    const improvements: string[] = []

    // Add from explicit areas
    if (report.areasOfStrength) {
      strengths.push(...report.areasOfStrength)
    }
    if (report.areasOfImprovement) {
      improvements.push(...report.areasOfImprovement)
    }

    // For traditional reports
    if (report.subjects && report.subjects.length > 0) {
      report.subjects.forEach(subject => {
        const score = subject.percentage || this.gradeToScore(subject.grade)
        if (score >= 85) {
          strengths.push(`Strong performance in ${subject.name} (${subject.grade})`)
        } else if (score < 70) {
          improvements.push(`${subject.name} needs attention (${subject.grade})`)
        }
      })
    }

    // For IB reports
    if (report.ibSubjectAreas && report.ibSubjectAreas.length > 0) {
      report.ibSubjectAreas.forEach(subjectArea => {
        if (subjectArea.effortGrade === 'A' || subjectArea.effortGrade === 'E') {
          strengths.push(`Strong effort in ${subjectArea.subjectName} (${subjectArea.effortGrade})`)
        } else if (subjectArea.effortGrade === 'B') {
          improvements.push(`${subjectArea.subjectName} needs more practice (Beginning level)`)
        }
      })
    }

    // Attendance
    if (report.attendance && report.attendance >= 95) {
      strengths.push(`Excellent attendance (${report.attendance}%)`)
    } else if (report.attendance && report.attendance < 90) {
      improvements.push(`Attendance could be better (${report.attendance}%)`)
    }

    if (strengths.length === 0) {
      strengths.push('Shows dedication across all areas - keep up the consistent effort!')
    }

    return {
      strengths,
      improvements,
      trends: { improving: [], declining: [], stable: [] },
      recommendations: [
        'Upload more reports over time to track progress and identify trends',
        improvements.length > 0
          ? 'Focus on areas needing attention with additional practice and support'
          : 'Maintain consistent effort across all areas'
      ],
      reportType: report.reportType || 'traditional'
    }
  }

  /**
   * Analyzes IB standards-based reports
   */
  private analyzeIBReports(reports: IReport[], primaryType: string): AnalysisResult {
    const latestReport = reports[reports.length - 1]
    const strengths: string[] = []
    const improvements: string[] = []
    const improving: string[] = []
    const declining: string[] = []
    const stable: string[] = []

    // Analyze effort grades across subject areas
    const subjectMetrics = this.analyzeIBSubjectAreas(reports)

    // Identify strengths
    subjectMetrics.forEach(metric => {
      if (metric.averageScore >= this.ibToScore('A')) {
        strengths.push(
          `Consistently achieving in ${metric.name} (Current: ${metric.labels[metric.labels.length - 1]})`
        )
      }

      if (metric.improvement > 0.5 && metric.scores.length >= 2) {
        strengths.push(
          `Showing growth in ${metric.name} (improved from ${metric.labels[0]} to ${metric.labels[metric.labels.length - 1]})`
        )
      }
    })

    // Identify areas showing progress - focus on positive growth
    const progressAreas: Array<{metric: PerformanceMetric, progressType: string}> = []

    subjectMetrics.forEach(metric => {
      const currentLevel = metric.labels[metric.labels.length - 1]
      const previousLevel = metric.labels.length > 1 ? metric.labels[0] : null

      // Showing actual improvement (moved up a level)
      if (metric.improvement > 0.3 && metric.scores.length >= 2) {
        progressAreas.push({
          metric,
          progressType: 'improving'
        })
      }
      // At Developing level and stable (making steady progress)
      else if (currentLevel === 'D' && metric.trend === 'stable') {
        progressAreas.push({
          metric,
          progressType: 'developing'
        })
      }
      // Moving from Beginning to Developing
      else if (previousLevel === 'B' && currentLevel === 'D') {
        progressAreas.push({
          metric,
          progressType: 'progressing'
        })
      }
    })

    // Add the progress areas with positive messaging
    progressAreas.slice(0, 4).forEach(({metric, progressType}) => {
      const currentLevel = metric.labels[metric.labels.length - 1]

      if (progressType === 'improving') {
        improvements.push(
          `${metric.name} - showing progress (now at ${currentLevel} level)`
        )
      } else if (progressType === 'developing') {
        improvements.push(
          `${metric.name} - building skills steadily (at Developing level)`
        )
      } else {
        improvements.push(
          `${metric.name} - making progress (moved to ${currentLevel} level)`
        )
      }
    })

    // Identify trends
    subjectMetrics.forEach(metric => {
      const trendLabel = `${metric.name} (${metric.labels[metric.labels.length - 1]})`
      if (metric.trend === 'improving') {
        improving.push(trendLabel)
      } else if (metric.trend === 'declining') {
        declining.push(trendLabel)
      } else {
        stable.push(trendLabel)
      }
    })

    // Add IB Learner Profile strengths
    if (latestReport.learnerProfileAttributes && latestReport.learnerProfileAttributes.length > 0) {
      latestReport.learnerProfileAttributes.forEach(attr => {
        strengths.push(`Demonstrates ${attr.attribute} learner profile attribute`)
      })
    }

    // Add explicit strengths/improvements from reports
    if (latestReport.areasOfStrength) {
      strengths.push(...latestReport.areasOfStrength.slice(0, 5))
    }
    if (latestReport.areasOfImprovement) {
      improvements.push(...latestReport.areasOfImprovement.slice(0, 5))
    }

    // Attendance
    if (latestReport.attendance && latestReport.attendance >= 95) {
      strengths.push(`Excellent attendance (${latestReport.attendance}%)`)
    } else if (latestReport.attendance && latestReport.attendance < 90) {
      improvements.push(`Attendance could be improved (${latestReport.attendance}%)`)
    }

    const recommendations = this.generateIBRecommendations(
      reports,
      subjectMetrics,
      strengths,
      improvements,
      { improving, declining, stable }
    )

    return {
      strengths: [...new Set(strengths)].slice(0, 6),
      improvements: [...new Set(improvements)].slice(0, 10),
      trends: { improving, declining, stable },
      recommendations,
      reportType: primaryType as any
    }
  }

  /**
   * Analyzes traditional grade-based reports (existing logic)
   */
  private analyzeTraditionalReports(reports: IReport[]): AnalysisResult {
    // Use existing traditional analysis logic
    const subjectAnalysis = this.analyzeSubjectPerformance(reports)
    const strengths = this.identifyStrengthsFromAnalysis(reports, subjectAnalysis)
    const improvements = this.identifyImprovementsFromAnalysis(reports, subjectAnalysis)
    const trends = this.extractTrends(subjectAnalysis)
    const recommendations = this.generateDetailedRecommendations(
      reports,
      subjectAnalysis,
      strengths,
      improvements,
      trends
    )

    return {
      strengths,
      improvements,
      trends,
      recommendations,
      reportType: 'traditional'
    }
  }

  /**
   * Analyzes IB subject areas across multiple reports
   */
  private analyzeIBSubjectAreas(reports: IReport[]): Map<string, PerformanceMetric> {
    const subjectMap = new Map<string, PerformanceMetric>()

    // Collect all subject areas
    const allSubjects = new Set<string>()
    reports.forEach(report => {
      if (report.ibSubjectAreas) {
        report.ibSubjectAreas.forEach(area => allSubjects.add(area.subjectName))
      }
    })

    // Analyze each subject area
    allSubjects.forEach(subjectName => {
      const scores: number[] = []
      const labels: string[] = []

      reports.forEach(report => {
        if (report.ibSubjectAreas) {
          const area = report.ibSubjectAreas.find(a => a.subjectName === subjectName)
          if (area && area.effortGrade) {
            scores.push(this.ibToScore(area.effortGrade))
            labels.push(area.effortGrade)
          }
        }
      })

      if (scores.length > 0) {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const trend = this.calculateTrend(scores)
        const improvement = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0

        subjectMap.set(subjectName, {
          name: subjectName,
          scores,
          labels,
          averageScore,
          trend,
          improvement
        })
      }
    })

    return subjectMap
  }

  /**
   * Converts IB continuum indicators to numerical scores
   */
  private ibToScore(indicator: string): number {
    const scoreMap: { [key: string]: number } = {
      'E': 95,  // Excelling
      'A': 85,  // Achieving
      'D': 70,  // Developing
      'B': 55,  // Beginning
      'NA': 0   // Not Assessed
    }
    return scoreMap[indicator.toUpperCase()] || 70
  }

  /**
   * Converts letter grades to numerical scores
   */
  private gradeToScore(grade: string): number {
    const gradeMap: { [key: string]: number } = {
      'A+': 97, 'A': 93, 'A-': 90,
      'B+': 87, 'B': 83, 'B-': 80,
      'C+': 77, 'C': 73, 'C-': 70,
      'D+': 67, 'D': 63, 'D-': 60,
      'F': 50, 'E': 50
    }
    const normalized = grade.trim().toUpperCase()
    return gradeMap[normalized] || parseInt(grade) || 0
  }

  /**
   * Calculates trend (improving/declining/stable)
   */
  private calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable'

    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const difference = secondAvg - firstAvg

    if (difference > 3) return 'improving'
    if (difference < -3) return 'declining'
    return 'stable'
  }

  /**
   * Generates recommendations for IB reports
   */
  private generateIBRecommendations(
    reports: IReport[],
    subjectMetrics: Map<string, PerformanceMetric>,
    strengths: string[],
    improvements: string[],
    trends: { improving: string[]; declining: string[]; stable: string[] }
  ): string[] {
    const recommendations: string[] = []

    // Overall progress
    if (trends.improving.length > trends.declining.length) {
      recommendations.push(
        `Great progress! ${trends.improving.length} areas showing improvement across ${reports.length} reports`
      )
    } else if (trends.declining.length > 0) {
      recommendations.push(
        `Focus needed: ${trends.declining.length} areas showing decline - let's work together to turn this around`
      )
    }

    // Subject-specific recommendations
    if (trends.declining.length > 0) {
      recommendations.push(
        `Priority areas: ${trends.declining.map(s => s.split('(')[0].trim()).slice(0, 3).join(', ')}. Consider extra practice and support`
      )
    }

    if (trends.improving.length > 0) {
      recommendations.push(
        `Keep up the great work in: ${trends.improving.map(s => s.split('(')[0].trim()).slice(0, 3).join(', ')}! Current approaches are working well`
      )
    }

    // Generic helpful tips
    if (recommendations.length < 3) {
      recommendations.push(
        'Establish consistent routines and celebrate small wins to build confidence'
      )
      recommendations.push(
        'Maintain open communication with teachers about areas where extra help might be needed'
      )
    }

    return recommendations
  }

  // Traditional report analysis methods (preserved from original analysis.service.ts)

  private analyzeSubjectPerformance(reports: IReport[]): Map<string, PerformanceMetric> {
    const subjectMap = new Map<string, PerformanceMetric>()

    const allSubjects = new Set<string>()
    reports.forEach(report => {
      if (report.subjects) {
        report.subjects.forEach(subject => allSubjects.add(subject.name))
      }
    })

    allSubjects.forEach(subjectName => {
      const scores: number[] = []
      const labels: string[] = []

      reports.forEach(report => {
        if (report.subjects) {
          const subject = report.subjects.find(s => s.name === subjectName)
          if (subject) {
            const score = subject.percentage || this.gradeToScore(subject.grade)
            scores.push(score)
            labels.push(subject.grade)
          }
        }
      })

      if (scores.length > 0) {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const trend = this.calculateTrend(scores)
        const improvement = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0

        subjectMap.set(subjectName, {
          name: subjectName,
          scores,
          labels,
          averageScore,
          trend,
          improvement
        })
      }
    })

    return subjectMap
  }

  private identifyStrengthsFromAnalysis(
    reports: IReport[],
    subjectAnalysis: Map<string, PerformanceMetric>
  ): string[] {
    const strengths: string[] = []
    const latestReport = reports[reports.length - 1]

    const topSubjects = Array.from(subjectAnalysis.values())
      .filter(s => s.averageScore >= 80 && s.averageScore <= 100)
      .filter(s => s.name.length >= 3 && s.name.length <= 50)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3)

    topSubjects.forEach(subject => {
      const latestGrade = subject.labels[subject.labels.length - 1]
      if (latestGrade && latestGrade.length <= 10) {
        strengths.push(
          `Consistently strong in ${subject.name} (Currently: ${latestGrade}, Avg: ${subject.averageScore.toFixed(0)}%)`
        )
      }
    })

    const mostImproved = Array.from(subjectAnalysis.values())
      .filter(s => s.improvement > 10 && s.improvement < 100)
      .filter(s => s.scores.length >= 2)
      .filter(s => s.name.length >= 3 && s.name.length <= 50)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 2)

    mostImproved.forEach(subject => {
      strengths.push(
        `Remarkable improvement in ${subject.name} (+${subject.improvement.toFixed(0)} points over ${subject.scores.length} reports)`
      )
    })

    if (latestReport.areasOfStrength && latestReport.areasOfStrength.length > 0) {
      latestReport.areasOfStrength.forEach(strength => {
        if (strength.length >= 5 && strength.length <= 200 &&
            !strengths.some(s => s.toLowerCase().includes(strength.toLowerCase())) &&
            !/^\d{4}$|^\d+th/.test(strength)) {
          strengths.push(strength)
        }
      })
    }

    if (latestReport.attendance && latestReport.attendance >= 95 && latestReport.attendance <= 100) {
      strengths.push(`Excellent attendance record (${latestReport.attendance}%)`)
    }

    if (strengths.length === 0) {
      strengths.push('Shows dedication across all subjects - keep up the consistent effort!')
    }

    // Limit strengths to maximum 5-6 items
    return strengths.slice(0, 6)
  }

  private identifyImprovementsFromAnalysis(
    reports: IReport[],
    subjectAnalysis: Map<string, PerformanceMetric>
  ): string[] {
    const improvements: string[] = []
    const latestReport = reports[reports.length - 1]

    // Focus on areas showing progress (improving or stable in moderate range)
    const showingProgress = Array.from(subjectAnalysis.values())
      .filter(s => {
        // Either showing improvement OR stable in developing range
        return (s.improvement > 2 && s.improvement < 50) ||
               (s.trend === 'stable' && s.averageScore >= 60 && s.averageScore < 80)
      })
      .filter(s => s.name.length >= 3 && s.name.length <= 50)
      .filter(s => s.averageScore > 0 && s.averageScore <= 100)
      .filter(s => s.scores.length >= 2) // Need at least 2 data points
      .sort((a, b) => b.improvement - a.improvement) // Sort by most progress first
      .slice(0, 3)

    showingProgress.forEach(subject => {
      const latestGrade = subject.labels[subject.labels.length - 1]
      if (latestGrade && latestGrade.length <= 10) {
        if (subject.improvement > 2) {
          improvements.push(
            `${subject.name} - showing progress (+${subject.improvement.toFixed(0)} points improvement)`
          )
        } else {
          improvements.push(
            `${subject.name} - building skills steadily (Current: ${latestGrade})`
          )
        }
      }
    })

    // If no subjects showing progress, look for areas being actively developed
    if (improvements.length === 0) {
      const developingAreas = Array.from(subjectAnalysis.values())
        .filter(s => s.averageScore >= 60 && s.averageScore < 80)
        .filter(s => s.name.length >= 3 && s.name.length <= 50)
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 2)

      developingAreas.forEach(subject => {
        const latestGrade = subject.labels[subject.labels.length - 1]
        if (latestGrade && latestGrade.length <= 10) {
          improvements.push(
            `${subject.name} - developing skills (Current: ${latestGrade})`
          )
        }
      })
    }

    if (latestReport.areasOfImprovement && latestReport.areasOfImprovement.length > 0) {
      latestReport.areasOfImprovement.forEach(area => {
        if (area.length >= 3 && area.length <= 200 &&
            !improvements.some(i => i.toLowerCase().includes(area.toLowerCase())) &&
            !/^\d+$|^\d{4}$/.test(area)) {
          improvements.push(area)
        }
      })
    }

    if (latestReport.attendance && latestReport.attendance >= 0 && latestReport.attendance < 90) {
      improvements.push(`Attendance could be better (${latestReport.attendance}%) - aim for 95%+`)
    }

    return improvements
  }

  private extractTrends(subjectAnalysis: Map<string, PerformanceMetric>): {
    improving: string[]
    declining: string[]
    stable: string[]
  } {
    const improving: string[] = []
    const declining: string[] = []
    const stable: string[] = []

    subjectAnalysis.forEach((performance) => {
      if (performance.trend === 'improving') {
        improving.push(
          `${performance.name} (+${performance.improvement.toFixed(0)} points)`
        )
      } else if (performance.trend === 'declining') {
        declining.push(
          `${performance.name} (${performance.improvement.toFixed(0)} points)`
        )
      } else {
        stable.push(performance.name)
      }
    })

    return { improving, declining, stable }
  }

  private generateDetailedRecommendations(
    reports: IReport[],
    subjectAnalysis: Map<string, PerformanceMetric>,
    strengths: string[],
    improvements: string[],
    trends: { improving: string[]; declining: string[]; stable: string[] }
  ): string[] {
    const recommendations: string[] = []

    const overallScores = reports.map(r => {
      if (!r.subjects || r.subjects.length === 0) return 70
      const avg = r.subjects.reduce((sum, s) => {
        return sum + (s.percentage || this.gradeToScore(s.grade))
      }, 0) / r.subjects.length
      return avg
    })

    const overallTrend = this.calculateTrend(overallScores)
    const overallImprovement = overallScores[overallScores.length - 1] - overallScores[0]

    if (overallTrend === 'improving') {
      recommendations.push(
        `Excellent! Overall performance is improving (+${overallImprovement.toFixed(0)} points across ${reports.length} reports)`
      )
    } else if (overallTrend === 'declining') {
      recommendations.push(
        `Overall performance needs attention (${overallImprovement.toFixed(0)} points). Let's work together to turn this around`
      )
    }

    if (trends.declining.length > 0) {
      recommendations.push(
        `Priority focus areas: ${trends.declining.map(s => s.split('(')[0].trim()).join(', ')}. Consider extra practice, tutoring, or study groups`
      )
    }

    if (trends.improving.length > 0) {
      recommendations.push(
        `Keep up the great work in: ${trends.improving.map(s => s.split('(')[0].trim()).join(', ')}! Current study methods are working well`
      )
    }

    const needsMostHelp = Array.from(subjectAnalysis.values())
      .filter(s => s.averageScore < 70)
      .sort((a, b) => a.averageScore - b.averageScore)[0]

    if (needsMostHelp) {
      recommendations.push(
        `${needsMostHelp.name} needs special attention. Try breaking study sessions into smaller chunks and using varied learning methods`
      )
    }

    const topStrength = Array.from(subjectAnalysis.values())
      .sort((a, b) => b.averageScore - a.averageScore)[0]

    if (topStrength && topStrength.averageScore >= 80) {
      recommendations.push(
        `Use success strategies from ${topStrength.name} (strongest subject) and apply them to other areas`
      )
    }

    if (recommendations.length < 4) {
      recommendations.push(
        'Establish a consistent study routine and review material regularly, not just before exams'
      )
      recommendations.push(
        'Maintain open communication with teachers about areas where extra help might be needed'
      )
    }

    return recommendations
  }
}

export default new UnifiedAnalysisService()
