import { GoogleGenerativeAI } from '@google/generative-ai';

export class SummarizationService {
  private genAI: GoogleGenerativeAI | null = null;

  private getGeminiClient(): GoogleGenerativeAI | null {
    if (!process.env.GOOGLE_API_KEY) {
      return null;
    }
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Summarizes teacher comments into 2-3 concise sentences
   */
  async summarizeTeacherComments(comments: string): Promise<string> {
    // If comments are already short, return as-is
    if (comments.length <= 300) {
      return comments;
    }

    const genAI = this.getGeminiClient();

    if (genAI) {
      try {
        return await this.summarizeWithAI(comments, genAI);
      } catch (error) {
        console.error('Error summarizing with Gemini:', error);
        return this.summarizeWithExtraction(comments);
      }
    } else {
      return this.summarizeWithExtraction(comments);
    }
  }

  /**
   * AI-powered summarization using Gemini
   */
  private async summarizeWithAI(comments: string, genAI: GoogleGenerativeAI): Promise<string> {
    const prompt = `Summarize the following teacher comments into 2-3 concise, clear sentences. Focus on the most important observations about the student's performance, strengths, and areas to focus on. Keep the tone positive and constructive.

Teacher Comments:
${comments}

Summary (2-3 sentences):`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    // Ensure it's not too long
    return summary.length > 500 ? this.summarizeWithExtraction(comments) : summary;
  }

  /**
   * Simple extractive summarization (fallback)
   * Extracts the most important sentences based on keywords
   */
  private summarizeWithExtraction(comments: string): string {
    // Split into sentences
    const sentences = comments
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);

    if (sentences.length === 0) {
      return comments.substring(0, 300) + '...';
    }

    // Score sentences based on important keywords
    const importantKeywords = [
      'excellent', 'strong', 'improved', 'progress', 'growth',
      'demonstrates', 'confident', 'needs', 'working on', 'focus',
      'outstanding', 'remarkable', 'developing', 'showing'
    ];

    const scoredSentences = sentences.map(sentence => {
      const lowerSentence = sentence.toLowerCase();
      let score = 0;

      // Score based on keywords
      importantKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          score += 2;
        }
      });

      // Prefer sentences that mention specific subjects or skills
      if (/\b(math|english|science|reading|writing|language|hindi|pspe|arts)\b/i.test(sentence)) {
        score += 1;
      }

      // Prefer first and last sentences (often contain key info)
      if (sentences.indexOf(sentence) === 0 || sentences.indexOf(sentence) === sentences.length - 1) {
        score += 1;
      }

      return { sentence, score };
    });

    // Sort by score and take top 2-3 sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.sentence);

    // Reorder to maintain original order
    const summary = sentences
      .filter(s => topSentences.includes(s))
      .join('. ');

    return summary + (summary.endsWith('.') ? '' : '.');
  }

  /**
   * Truncates text to a maximum length while preserving complete sentences
   */
  truncateToSentences(text: string, maxLength: number = 300): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Find the last complete sentence within the limit
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentenceEnd > 0) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
  }

  /**
   * Generates a comprehensive pointwise summary of a report
   * Works for both traditional and IB standards-based reports
   */
  async generateReportSummary(report: any): Promise<any> {
    const genAI = this.getGeminiClient();

    if (genAI) {
      try {
        return await this.generateSummaryWithAI(report, genAI);
      } catch (error) {
        console.error('Error generating summary with Gemini:', error);
        return this.generateSummaryWithRules(report);
      }
    } else {
      console.log('Google API key not found, using rule-based fallback');
      return this.generateSummaryWithRules(report);
    }
  }

  /**
   * AI-powered summary generation using Gemini
   */
  private async generateSummaryWithAI(report: any, genAI: GoogleGenerativeAI): Promise<any> {
    const context = this.buildReportContext(report);
    const ibStandards = this.getIBLearnerProfileStandards(report.grade);

    const prompt = `You are an expert IB educator analyzing a student report card. Your task is to provide a detailed, evidence-based comparison of this child's performance against the IB Primary Years Programme (PYP) learner profile standards for their grade level.

STUDENT REPORT DATA:
${context}

IB LEARNER PROFILE STANDARDS FOR THIS GRADE LEVEL:
${ibStandards}

ANALYSIS REQUIREMENTS:

You MUST carefully analyze the report and:
1. Identify which IB learner profile attributes (Inquirers, Knowledgeable, Thinkers, Communicators, Principled, Open-minded, Caring, Risk-takers, Balanced, Reflective) the child demonstrates
2. Find specific evidence from the report (teacher comments, grades, effort levels, behaviors) that shows these attributes
3. Compare the child's demonstrated abilities against the grade-appropriate standards listed above
4. Determine if the child is excelling, meeting, or developing toward these standards

CRITICAL: Be specific and evidence-based. Don't make generic statements. Reference actual subjects, behaviors, or teacher comments.

Generate a comprehensive summary with:

1. OVERALL PERFORMANCE (25-35 words):
   - Mention the child's grade level
   - Give an honest assessment of where they stand relative to IB standards
   - Mention 1-2 standout attributes they demonstrate

2. KEY STRENGTHS (3-5 concise bullet points):
   - Identify SPECIFIC IB learner profile attributes the child demonstrates exceptionally well
   - Provide EVIDENCE from the report (mention specific subjects, comments, or behaviors)
   - Keep each point concise and focused
   - Example format: "Strong INQUIRER - Exceptional curiosity in Science, asks probing questions (Teacher: 'always engaged')"
   - Focus on areas where the child TRULY EXCELS compared to grade-level expectations

3. AREAS FOR GROWTH (3-5 bullet points):
   - Identify SPECIFIC IB learner profile attributes the child should develop further
   - Provide EVIDENCE from the report (mention specific subjects, effort grades, or teacher observations)
   - Explain what growth would look like at their grade level
   - Example format: "Developing as RISK-TAKER - Teacher notes hesitancy in trying new approaches in Math; encourage taking on challenging problems independently"
   - Frame constructively as opportunities aligned with grade-level IB expectations

4. TEACHER HIGHLIGHTS (2-3 bullet points):
   - Extract the MOST IMPORTANT observations from teacher comments
   - Connect these observations to IB learner profile development
   - Include specific examples or subjects mentioned

EXAMPLES OF GOOD ANALYSIS:
✓ "Exceptional COMMUNICATOR - Expresses ideas clearly in English (A grade) and actively participates in class discussions as noted by teacher"
✓ "Developing PRINCIPLED behavior - Teacher comments indicate inconsistency in taking responsibility for homework completion"
✓ "Strong THINKER - Demonstrates critical thinking in Science projects and asks analytical questions"

EXAMPLES OF POOR ANALYSIS (DON'T DO THIS):
✗ "Good at math" (too vague, no IB connection)
✗ "Needs improvement in communication" (no evidence, no specifics)
✗ "Nice student" (not analytical, no IB framework)

CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no explanations.
- Use proper escape sequences for quotes within strings
- Ensure all strings are properly closed
- Do not include line breaks within string values

Format:
{
  "overallPerformance": "string",
  "keyStrengths": ["point1", "point2", "point3"],
  "areasNeedingAttention": ["point1", "point2", "point3"],
  "teacherHighlights": ["point1", "point2", "point3"]
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,  // Increased to prevent truncation
        responseMimeType: 'application/json',  // Request JSON output directly
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text().trim();

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to extract JSON if there's extra text before/after
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    let summaryData;
    try {
      summaryData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON response from Gemini');
    }

    return {
      ...summaryData,
      generatedAt: new Date()
    };
  }

  /**
   * Rule-based summary generation (fallback when OpenAI unavailable)
   */
  private generateSummaryWithRules(report: any): any {
    const summary: any = {
      overallPerformance: '',
      keyStrengths: [],
      areasNeedingAttention: [],
      teacherHighlights: [],
      generatedAt: new Date()
    };

    if (report.reportType === 'ib-standards') {
      return this.generateIBSummary(report, summary);
    } else {
      return this.generateTraditionalSummary(report, summary);
    }
  }

  /**
   * Generate summary for traditional reports
   */
  private generateTraditionalSummary(report: any, summary: any): any {
    // Calculate overall performance
    const avgScore = report.overallPercentage ||
      (report.subjects?.reduce((sum: number, s: any) =>
        sum + (s.percentage || this.gradeToScore(s.grade)), 0) / (report.subjects?.length || 1)) || 0;

    if (avgScore >= 85) {
      summary.overallPerformance = `Excellent performance with ${avgScore.toFixed(0)}% overall average across all subjects.`;
    } else if (avgScore >= 70) {
      summary.overallPerformance = `Good progress with ${avgScore.toFixed(0)}% overall average, showing steady development.`;
    } else {
      summary.overallPerformance = `Currently developing skills with ${avgScore.toFixed(0)}% average, showing areas for growth.`;
    }

    // Identify strengths (subjects >= 85%)
    report.subjects?.forEach((subject: any) => {
      const score = subject.percentage || this.gradeToScore(subject.grade);
      if (score >= 85 && summary.keyStrengths.length < 4) {
        summary.keyStrengths.push(`Strong performance in ${subject.name} (${subject.grade})`);
      }
    });

    // Add explicit strengths
    if (report.areasOfStrength?.length > 0) {
      summary.keyStrengths.push(...report.areasOfStrength.slice(0, 4 - summary.keyStrengths.length));
    }

    // Identify areas needing attention (subjects < 70%)
    report.subjects?.forEach((subject: any) => {
      const score = subject.percentage || this.gradeToScore(subject.grade);
      if (score < 70 && summary.areasNeedingAttention.length < 4) {
        summary.areasNeedingAttention.push(`Focus needed in ${subject.name} (${subject.grade})`);
      }
    });

    // Add explicit improvements
    if (report.areasOfImprovement?.length > 0) {
      summary.areasNeedingAttention.push(
        ...report.areasOfImprovement.slice(0, 4 - summary.areasNeedingAttention.length)
      );
    }

    // Extract teacher highlights
    if (report.teacherComments) {
      const sentences = this.extractKeyPoints(report.teacherComments, 3);
      summary.teacherHighlights = sentences;
    }

    return summary;
  }

  /**
   * Generate summary for IB standards-based reports
   */
  private generateIBSummary(report: any, summary: any): any {
    // Analyze IB subject areas
    const excellingCount = report.ibSubjectAreas?.filter((s: any) =>
      s.effortGrade === 'E' || s.effortGrade === 'A').length || 0;
    const developingCount = report.ibSubjectAreas?.filter((s: any) =>
      s.effortGrade === 'D').length || 0;

    if (excellingCount > developingCount) {
      summary.overallPerformance = `Strong progress with ${excellingCount} subject areas at Achieving or Excelling level.`;
    } else {
      summary.overallPerformance = `Steady development across subject areas, with ${developingCount} areas actively building skills.`;
    }

    // Key strengths from high-performing subjects
    report.ibSubjectAreas?.forEach((area: any) => {
      if ((area.effortGrade === 'A' || area.effortGrade === 'E') &&
          summary.keyStrengths.length < 4) {
        summary.keyStrengths.push(`Excelling in ${area.subjectName} (${area.effortGrade} level)`);
      }
    });

    // Add learner profile attributes
    if (report.learnerProfileAttributes?.length > 0) {
      report.learnerProfileAttributes.slice(0, 2).forEach((attr: any) => {
        if (summary.keyStrengths.length < 4) {
          summary.keyStrengths.push(`Demonstrates ${attr.attribute} quality`);
        }
      });
    }

    // Areas needing attention
    report.ibSubjectAreas?.forEach((area: any) => {
      if ((area.effortGrade === 'B' || area.effortGrade === 'D') &&
          summary.areasNeedingAttention.length < 4) {
        summary.areasNeedingAttention.push(
          `Continue practicing ${area.subjectName} (Currently at ${area.effortGrade} level)`
        );
      }
    });

    // Teacher highlights
    if (report.teacherComments) {
      const sentences = this.extractKeyPoints(report.teacherComments, 3);
      summary.teacherHighlights = sentences;
    }

    return summary;
  }

  /**
   * Extract key points from text (helper method)
   */
  private extractKeyPoints(text: string, maxPoints: number): string[] {
    const sentences = text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 150);

    if (sentences.length === 0) {
      return [];
    }

    // Use existing scoring logic from summarizeWithExtraction
    const importantKeywords = [
      'excellent', 'strong', 'improved', 'progress', 'growth',
      'demonstrates', 'confident', 'needs', 'working on', 'focus',
      'outstanding', 'remarkable', 'developing', 'showing'
    ];

    const scoredSentences = sentences.map(sentence => {
      const lowerSentence = sentence.toLowerCase();
      let score = 0;

      importantKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) score += 2;
      });

      return { sentence, score };
    });

    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints)
      .map(s => s.sentence);
  }

  /**
   * Helper: Get IB Learner Profile expectations by grade level
   */
  private getIBLearnerProfileStandards(grade?: string): string {
    const gradeLevel = grade?.toLowerCase() || '';

    // IB Primary Years Programme (PYP) expectations by grade
    const standards = {
      early: `Early Years (Pre-K to Grade 1):
- Inquirers: Shows curiosity, asks questions, explores with support
- Knowledgeable: Beginning to understand basic concepts across subjects
- Thinkers: Makes simple choices, beginning problem-solving
- Communicators: Expresses ideas in multiple ways, developing language skills
- Principled: Understanding right and wrong, developing self-regulation
- Open-minded: Shows interest in others, beginning cultural awareness
- Caring: Shows empathy, helps others with prompting
- Risk-takers: Tries new things with encouragement, developing confidence
- Balanced: Developing physical skills, beginning to understand wellbeing
- Reflective: Beginning to think about own learning and actions`,

      middle: `Middle Primary (Grades 2-3):
- Inquirers: Asks relevant questions, investigates with growing independence
- Knowledgeable: Develops understanding across subject areas
- Thinkers: Applies thinking skills, solves problems with guidance
- Communicators: Communicates ideas clearly, listens to others
- Principled: Demonstrates honesty, fairness, and responsibility
- Open-minded: Respects different perspectives, appreciates diversity
- Caring: Shows compassion, takes action to help others
- Risk-takers: Approaches challenges with confidence, tries new strategies
- Balanced: Balances academics with physical/creative activities
- Reflective: Reflects on learning, considers own strengths and challenges`,

      upper: `Upper Primary (Grades 4-5):
- Inquirers: Independently pursues questions, conducts research
- Knowledgeable: Applies knowledge across subjects, makes connections
- Thinkers: Uses critical thinking, analyzes information effectively
- Communicators: Expresses complex ideas, adjusts communication for audience
- Principled: Acts with integrity, takes responsibility for actions
- Open-minded: Actively seeks and evaluates different perspectives
- Caring: Shows commitment to service, advocates for others
- Risk-takers: Embraces challenges, learns from mistakes independently
- Balanced: Maintains healthy balance, manages time effectively
- Reflective: Regularly self-assesses, sets goals for improvement`,

      secondary: `Secondary (Grades 6+):
- Inquirers: Pursues complex questions, conducts in-depth research independently
- Knowledgeable: Deep understanding across disciplines, synthesizes knowledge
- Thinkers: Applies sophisticated critical and creative thinking
- Communicators: Articulates complex ideas effectively in multiple languages/modes
- Principled: Demonstrates strong ethical reasoning and social responsibility
- Open-minded: Critically evaluates perspectives, challenges own assumptions
- Caring: Takes sustained action for social justice and community service
- Risk-takers: Tackles complex challenges, shows resilience and innovation
- Balanced: Independently maintains physical, emotional, and intellectual balance
- Reflective: Metacognitive awareness, continuous self-improvement mindset`
    };

    // Determine grade category
    if (!grade || gradeLevel.includes('pre-k') || gradeLevel.includes('kindergarten') || gradeLevel === '1') {
      return standards.early;
    } else if (gradeLevel === '2' || gradeLevel === '3') {
      return standards.middle;
    } else if (gradeLevel === '4' || gradeLevel === '5') {
      return standards.upper;
    } else {
      return standards.secondary;
    }
  }

  /**
   * Helper: Build context string for AI
   */
  private buildReportContext(report: any): string {
    let context = `Report Type: ${report.reportType || 'traditional'}\n`;
    context += `Term: ${report.term} ${report.academicYear}\n`;

    // Add grade information
    if (report.grade) {
      context += `Grade: ${report.grade}\n`;
    }

    context += '\n';

    if (report.reportType === 'ib-standards') {
      context += 'IB Subject Areas:\n';
      report.ibSubjectAreas?.forEach((area: any) => {
        context += `- ${area.subjectName}: ${area.effortGrade || 'N/A'}\n`;
        if (area.skills?.length) {
          area.skills.forEach((skill: any) => {
            context += `  • ${skill.skillName}: ${skill.indicator}\n`;
          });
        }
      });

      if (report.learnerProfileAttributes?.length) {
        context += '\nLearner Profile Attributes:\n';
        report.learnerProfileAttributes.forEach((attr: any) => {
          context += `- ${attr.attribute}`;
          if (attr.evidence) context += `: ${attr.evidence}`;
          context += '\n';
        });
      }
    } else {
      context += 'Subjects:\n';
      report.subjects?.forEach((subject: any) => {
        context += `- ${subject.name}: ${subject.grade}`;
        if (subject.percentage) context += ` (${subject.percentage}%)`;
        context += '\n';
      });
    }

    if (report.teacherComments) {
      context += `\nTeacher Comments:\n${report.teacherComments}\n`;
    }

    if (report.areasOfStrength?.length) {
      context += `\nStrengths: ${report.areasOfStrength.join(', ')}\n`;
    }

    if (report.areasOfImprovement?.length) {
      context += `\nAreas to Improve: ${report.areasOfImprovement.join(', ')}\n`;
    }

    return context;
  }

  /**
   * Helper: Convert grade to score
   */
  private gradeToScore(grade: string): number {
    const gradeMap: { [key: string]: number } = {
      'A+': 97, 'A': 93, 'A-': 90,
      'B+': 87, 'B': 83, 'B-': 80,
      'C+': 77, 'C': 73, 'C-': 70,
      'D+': 67, 'D': 63, 'D-': 60,
      'F': 50, 'E': 50
    };
    return gradeMap[grade?.trim()?.toUpperCase()] || 70;
  }
}

export default new SummarizationService();
