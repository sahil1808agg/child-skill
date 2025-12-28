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
}

interface SubjectPerformance {
  name: string
  scores: number[]
  grades: string[]
  averageScore: number
  trend: 'improving' | 'declining' | 'stable'
  improvement: number
}

export class AnalysisService {
  // Convert letter grade to numerical score for comparison
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

    if (reports.length === 1) {
      return this.analyzeSingleReport(reports[0])
    }

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
      recommendations
    }
  }

  private analyzeSingleReport(report: IReport): AnalysisResult {
    const strengths: string[] = []
    const improvements: string[] = []

    report.subjects.forEach(subject => {
      const score = subject.percentage || this.gradeToScore(subject.grade)

      if (score >= 85) {
        strengths.push(`Strong performance in ${subject.name} (${subject.grade})`)
      } else if (score < 70) {
        improvements.push(`${subject.name} needs attention (${subject.grade})`)
      }
    })

    if (report.areasOfStrength) {
      strengths.push(...report.areasOfStrength)
    }
    if (report.areasOfImprovement) {
      improvements.push(...report.areasOfImprovement)
    }

    if (strengths.length === 0) {
      strengths.push('All subjects show potential for growth')
    }

    return {
      strengths,
      improvements,
      trends: { improving: [], declining: [], stable: [] },
      recommendations: [
        'Upload more reports over time to track progress and identify trends',
        improvements.length > 0
          ? 'Focus on weaker subjects with additional practice and support'
          : 'Maintain consistent effort across all subjects'
      ]
    }
  }

  private analyzeSubjectPerformance(reports: IReport[]): Map<string, SubjectPerformance> {
    const subjectMap = new Map<string, SubjectPerformance>()

    // Collect all subjects across all reports
    const allSubjects = new Set<string>()
    reports.forEach(report => {
      report.subjects.forEach(subject => allSubjects.add(subject.name))
    })

    // Analyze each subject's performance over time
    allSubjects.forEach(subjectName => {
      const scores: number[] = []
      const grades: string[] = []

      reports.forEach(report => {
        const subject = report.subjects.find(s => s.name === subjectName)
        if (subject) {
          const score = subject.percentage || this.gradeToScore(subject.grade)
          scores.push(score)
          grades.push(subject.grade)
        }
      })

      if (scores.length > 0) {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const trend = this.calculateTrend(scores)
        const improvement = scores.length > 1
          ? scores[scores.length - 1] - scores[0]
          : 0

        subjectMap.set(subjectName, {
          name: subjectName,
          scores,
          grades,
          averageScore,
          trend,
          improvement
        })
      }
    })

    return subjectMap
  }

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

  private identifyStrengthsFromAnalysis(
    reports: IReport[],
    subjectAnalysis: Map<string, SubjectPerformance>
  ): string[] {
    const strengths: string[] = []
    const latestReport = reports[reports.length - 1]

    // Identify consistently high-performing subjects (filter out invalid data)
    const topSubjects = Array.from(subjectAnalysis.values())
      .filter(s => s.averageScore >= 80 && s.averageScore <= 100) // Valid score range
      .filter(s => s.name.length >= 3 && s.name.length <= 50) // Valid name length
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3)

    topSubjects.forEach(subject => {
      const latestGrade = subject.grades[subject.grades.length - 1]
      // Only add if grade looks valid
      if (latestGrade && latestGrade.length <= 10) {
        strengths.push(
          `Consistently strong in ${subject.name} (Currently: ${latestGrade}, Avg: ${subject.averageScore.toFixed(0)}%)`
        )
      }
    })

    // Identify most improved subjects (with validation)
    const mostImproved = Array.from(subjectAnalysis.values())
      .filter(s => s.improvement > 10 && s.improvement < 100) // Realistic improvement range
      .filter(s => s.scores.length >= 2) // Need at least 2 data points
      .filter(s => s.name.length >= 3 && s.name.length <= 50) // Valid name
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 2)

    mostImproved.forEach(subject => {
      strengths.push(
        `Remarkable improvement in ${subject.name} (+${subject.improvement.toFixed(0)} points over ${subject.scores.length} reports)`
      )
    })

    // Add teacher-identified strengths from latest report (with validation)
    if (latestReport.areasOfStrength && latestReport.areasOfStrength.length > 0) {
      latestReport.areasOfStrength.forEach(strength => {
        // Only add valid strengths (reasonable length, not garbage)
        if (strength.length >= 5 && strength.length <= 200 &&
            !strengths.some(s => s.toLowerCase().includes(strength.toLowerCase())) &&
            !/^\d{4}$|^\d+th/.test(strength)) { // Not a year or date
          strengths.push(strength)
        }
      })
    }

    // Check attendance (validate it's reasonable)
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
    subjectAnalysis: Map<string, SubjectPerformance>
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
      const latestGrade = subject.grades[subject.grades.length - 1]
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
        const latestGrade = subject.grades[subject.grades.length - 1]
        if (latestGrade && latestGrade.length <= 10) {
          improvements.push(
            `${subject.name} - developing skills (Current: ${latestGrade})`
          )
        }
      })
    }

    // Add teacher-identified areas of improvement (with validation)
    if (latestReport.areasOfImprovement && latestReport.areasOfImprovement.length > 0) {
      latestReport.areasOfImprovement.forEach(area => {
        // Validate improvement area is reasonable
        if (area.length >= 3 && area.length <= 200 &&
            !improvements.some(i => i.toLowerCase().includes(area.toLowerCase())) &&
            !/^\d+$|^\d{4}$/.test(area)) { // Not just numbers or years
          improvements.push(area)
        }
      })
    }

    // Check attendance (validate reasonable range)
    if (latestReport.attendance && latestReport.attendance >= 0 && latestReport.attendance < 90) {
      improvements.push(`Attendance could be better (${latestReport.attendance}%) - aim for 95%+`)
    }

    return improvements
  }

  private extractTrends(subjectAnalysis: Map<string, SubjectPerformance>): {
    improving: string[]
    declining: string[]
    stable: string[]
  } {
    const improving: string[] = []
    const declining: string[] = []
    const stable: string[] = []

    subjectAnalysis.forEach((performance, subjectName) => {
      if (performance.trend === 'improving') {
        improving.push(
          `${subjectName} (+${performance.improvement.toFixed(0)} points)`
        )
      } else if (performance.trend === 'declining') {
        declining.push(
          `${subjectName} (${performance.improvement.toFixed(0)} points)`
        )
      } else {
        stable.push(subjectName)
      }
    })

    return { improving, declining, stable }
  }

  private generateDetailedRecommendations(
    reports: IReport[],
    subjectAnalysis: Map<string, SubjectPerformance>,
    strengths: string[],
    improvements: string[],
    trends: { improving: string[]; declining: string[]; stable: string[] }
  ): string[] {
    const recommendations: string[] = []

    // Analyze overall trajectory
    const overallScores = reports.map(r => {
      const avg = r.subjects.reduce((sum, s) => {
        return sum + (s.percentage || this.gradeToScore(s.grade))
      }, 0) / r.subjects.length
      return avg
    })

    const overallTrend = this.calculateTrend(overallScores)
    const overallImprovement = overallScores[overallScores.length - 1] - overallScores[0]

    // Overall performance feedback
    if (overallTrend === 'improving') {
      recommendations.push(
        `📈 Excellent! Overall performance is improving (+${overallImprovement.toFixed(0)} points across ${reports.length} reports)`
      )
    } else if (overallTrend === 'declining') {
      recommendations.push(
        `⚠️ Overall performance needs attention (${overallImprovement.toFixed(0)} points). Let's work together to turn this around`
      )
    }

    // Specific subject recommendations
    if (trends.declining.length > 0) {
      recommendations.push(
        `🎯 Priority focus areas: ${trends.declining.map(s => s.split('(')[0].trim()).join(', ')}. Consider extra practice, tutoring, or study groups`
      )
    }

    if (trends.improving.length > 0) {
      recommendations.push(
        `✅ Keep up the great work in: ${trends.improving.map(s => s.split('(')[0].trim()).join(', ')}! Current study methods are working well`
      )
    }

    // Find subjects that need the most help
    const needsMostHelp = Array.from(subjectAnalysis.values())
      .filter(s => s.averageScore < 70)
      .sort((a, b) => a.averageScore - b.averageScore)[0]

    if (needsMostHelp) {
      recommendations.push(
        `💡 ${needsMostHelp.name} needs special attention. Try breaking study sessions into smaller chunks and using varied learning methods`
      )
    }

    // Leverage strengths
    const topStrength = Array.from(subjectAnalysis.values())
      .sort((a, b) => b.averageScore - a.averageScore)[0]

    if (topStrength && topStrength.averageScore >= 80) {
      recommendations.push(
        `🌟 Use success strategies from ${topStrength.name} (strongest subject) and apply them to other areas`
      )
    }

    // Time-based recommendations
    if (reports.length >= 3) {
      const recentReports = reports.slice(-3)
      const recentAvg = recentReports.reduce((sum, r) => {
        const avg = r.subjects.reduce((s, subj) =>
          s + (subj.percentage || this.gradeToScore(subj.grade)), 0
        ) / r.subjects.length
        return sum + avg
      }, 0) / recentReports.length

      if (recentAvg >= 85) {
        recommendations.push(
          `🏆 Outstanding recent performance! Maintain this momentum and consider challenging yourself with advanced material`
        )
      }
    }

    // Generic helpful tips
    if (recommendations.length < 4) {
      recommendations.push(
        `📚 Establish a consistent study routine and review material regularly, not just before exams`
      )
      recommendations.push(
        `👨‍👩‍👧 Maintain open communication with teachers about areas where extra help might be needed`
      )
    }

    return recommendations
  }
}

export default new AnalysisService()
