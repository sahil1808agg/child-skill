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
    const gradeLevel = report.grade || 'Unknown';

    const prompt = `You are an expert IB educator analyzing a Grade ${gradeLevel} student's report card. Your task is to provide a detailed, comparative analysis of this child's performance AGAINST the IB Primary Years Programme (PYP) learner profile standards specifically for Grade ${gradeLevel}.

STUDENT REPORT DATA:
${context}

IB LEARNER PROFILE STANDARDS EXPECTED FOR GRADE ${gradeLevel}:
${ibStandards}

CRITICAL ANALYSIS REQUIREMENTS:

Your analysis MUST compare this student's actual performance against what is EXPECTED for a Grade ${gradeLevel} student in the IB framework. For EACH of the 10 IB learner profile attributes, evaluate:
- Does the report show evidence the child demonstrates this attribute?
- Is it at, above, or below grade-level expectations?
- What specific evidence supports this assessment?

MANDATORY COMPARISON FRAMEWORK:
1. Read the Grade ${gradeLevel} IB standards above carefully
2. For each attribute (Inquirers, Knowledgeable, Thinkers, Communicators, Principled, Open-minded, Caring, Risk-takers, Balanced, Reflective):
   - Find evidence in the report (teacher comments, grades, behaviors, effort ratings)
   - Compare to what's expected at Grade ${gradeLevel}
   - Determine: Exceeding expectations / Meeting expectations / Developing toward expectations
3. Identify 3-4 attributes where child EXCEEDS expectations (for Key Strengths)
4. Identify 3-4 attributes where child is DEVELOPING or BELOW expectations (for Areas for Growth)

CRITICAL RULES FOR EVIDENCE AND EXAMPLES:
- NO STUDENT is perfect at all 10 IB attributes - you MUST identify areas for growth
- EVERY point MUST include SPECIFIC BEHAVIORS, ACTIONS, or EXAMPLES from the teacher comments
- EVERY point must include DIRECT QUOTES from teacher comments (use quotation marks)
- DO NOT just state grades or subject names - explain HOW the child demonstrates the attribute with concrete examples
- Every point must EXPLICITLY mention which IB learner profile attribute it relates to
- Compare behaviors to Grade ${gradeLevel} standards, not generic expectations
- If evidence is limited for an attribute, note this as an area to observe/develop

Generate a comprehensive summary with:

1. OVERALL PERFORMANCE (30-40 words):
   - Start with: "As a Grade ${gradeLevel} student in the IB PYP..."
   - Compare overall development to Grade ${gradeLevel} IB expectations
   - Mention 1-2 standout IB attributes where child excels for their grade
   - Note 1 key area for continued development
   - Be honest and balanced in assessment

2. KEY STRENGTHS (3-4 detailed bullet points):
   - Format: "[IB ATTRIBUTE] - [Specific behaviors and examples from teacher comments with direct quotes using ONLY single quotes]; [comparison to Grade ${gradeLevel} expectations]"
   - MANDATORY: Extract specific behaviors, actions, and examples from the teacher comments that demonstrate this attribute
   - MANDATORY: Include direct quotes from teacher comments using SINGLE QUOTES only (not double quotes)
   - Example: "COMMUNICATOR - Actively participates in Hindi lessons, clearly expressing ideas and listening attentively to stories; confidently uses visual cues and body language (Teacher: 'communicates ideas clearly and attentively listening'); exceeds Grade EYP 3 expectations for expressive communication"
   - Example: "INQUIRER - Asks probing questions in Science about plant life cycles and researches topics independently (Teacher: 'always engaged and curious'); shows inquiry skills typical of Grade 4 students"
   - DO NOT write generic statements like "Excels in Hindi (A level)" - this is TOO VAGUE
   - DO write specific examples of HOW they excel: what they do, how they behave, what skills they show
   - Each strength must reference a different IB learner profile attribute
   - Keep each bullet 30-45 words for clarity and proper JSON formatting

3. AREAS FOR GROWTH (3-4 detailed bullet points):
   - Format: "[IB ATTRIBUTE] - [Specific current behaviors or gaps]; [What growth looks like at Grade ${gradeLevel}]"
   - MANDATORY: Cite specific evidence from the report about what needs development
   - Use SINGLE QUOTES for any teacher quotes (not double quotes)
   - Example: "RISK-TAKER - Shows hesitation with challenging Math problems, waiting for teacher guidance (Teacher: 'needs encouragement'); Grade 3 students should approach uncertainty more independently"
   - Example: "REFLECTIVE - Limited evidence of self-assessment in report; Grade EYP 3 students should begin thinking about learning and improvement with teacher support"
   - MUST identify specific IB attributes where development is needed
   - Reference the Grade ${gradeLevel} standards to explain growth targets
   - Be constructive but honest about developmental areas
   - Look for: subjects with lower grades, teacher concerns, missing skills, behavioral observations, or attributes not mentioned
   - Keep each bullet 25-40 words for proper JSON formatting

4. TEACHER HIGHLIGHTS (2-3 detailed bullet points):
   - Extract MOST IMPORTANT specific observations and examples from teacher comments
   - Connect each to IB learner profile attributes
   - MANDATORY: Include the actual behavior or skill described, not just the subject
   - Use SINGLE QUOTES for teacher quotes (not double quotes)
   - Example: "Early writing shows excellent letter formation, spacing, and direction (Teacher: 'early writing skills are a particular strength'); demonstrates COMMUNICATOR attribute"
   - Example: "Cheerful and curious in Hindi lessons, actively participates and listens to stories; exemplifies INQUIRER and COMMUNICATOR attributes"
   - DO NOT write vague statements - extract concrete examples and behaviors
   - Keep each bullet 20-35 words for proper JSON formatting

EXAMPLES OF EXCELLENT DETAILED ANALYSIS (note: use single quotes for teacher quotes):

✓ EXCELLENT (STRENGTH): "COMMUNICATOR - Actively participates in Hindi lessons, clearly expressing ideas and using visual cues and body language; shows strong early writing with excellent letter formation and spacing (Teacher: 'communicates ideas clearly', 'early writing skills are a strength'); exceeds Grade EYP 3 expectations"

✓ EXCELLENT (GROWTH AREA): "RISK-TAKER - Shows reluctance with unfamiliar Math problems, waiting for teacher demonstration (Teacher: 'needs encouragement with challenging tasks'); Grade 3 students should approach uncertainty more independently"

✗ POOR (TOO VAGUE): "Good at math" (no IB attribute, no comparison to grade expectations, no specific evidence or examples)

✗ POOR (TOO GENERIC): "Excelling in Hindi (A level)" (no specific behaviors, no examples of HOW they excel, no teacher quotes)

✗ POOR (MISSING EXAMPLES): "COMMUNICATOR - Excels in Hindi, meeting Grade EYP 3 IB expectations" (missing specific behaviors, teacher quotes, and examples of what communication skills are demonstrated)

MANDATORY OUTPUT REQUIREMENTS:
- You MUST fill all 4 sections (overallPerformance, keyStrengths, areasNeedingAttention, teacherHighlights)
- areasNeedingAttention CANNOT be empty - every student has growth areas
- EVERY bullet point must mention a specific IB learner profile attribute
- EVERY bullet point must include concrete, specific examples and behaviors from the teacher comments
- EVERY bullet point in keyStrengths should include teacher quotes using SINGLE QUOTES (not double quotes)
- Keep bullets concise: keyStrengths 30-45 words, areasNeedingAttention 25-40 words, teacherHighlights 20-35 words
- CRITICAL: Use ONLY single quotes for all teacher quotes within the text (example: Teacher: 'great work' NOT Teacher: "great work")
- Respond with ONLY valid JSON (no markdown, no code blocks)
- Ensure the JSON is complete and not truncated - all arrays and objects must be properly closed

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
        maxOutputTokens: 8192,  // Increased for detailed summaries with examples
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

    // Clean up common JSON formatting issues from AI responses
    // This handles cases where Gemini includes actual newlines in string values
    try {
      // Try to fix common JSON issues by parsing the structure manually
      const fixedJson = this.fixMalformedJSON(responseText);
      responseText = fixedJson;
    } catch (fixError) {
      console.log('JSON fix attempt failed, will try parsing as-is');
    }

    let summaryData;
    try {
      summaryData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText.substring(0, 1000));
      console.error('Parse error:', parseError);
      // Fall back to rule-based summary
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
    const gradeLevel = report.grade || 'Unknown';
    const ibAttributes = ['Inquirer', 'Knowledgeable', 'Thinker', 'Communicator', 'Principled',
                          'Open-minded', 'Caring', 'Risk-taker', 'Balanced', 'Reflective'];

    // Analyze IB subject areas
    const excellingCount = report.ibSubjectAreas?.filter((s: any) =>
      s.effortGrade === 'E' || s.effortGrade === 'A').length || 0;
    const developingCount = report.ibSubjectAreas?.filter((s: any) =>
      s.effortGrade === 'D' || s.effortGrade === 'B').length || 0;
    const totalSubjects = report.ibSubjectAreas?.length || 1;

    // Overall performance with grade-level context
    const excellingPercent = Math.round((excellingCount / totalSubjects) * 100);
    const programmeType = gradeLevel.includes('EYP') ? 'Early Years Programme (EYP)' :
                         gradeLevel.includes('PYP') ? 'Primary Years Programme (PYP)' :
                         gradeLevel.includes('MYP') ? 'Middle Years Programme (MYP)' : 'IB PYP';

    summary.overallPerformance = `As a ${gradeLevel} student in the IB ${programmeType}, showing ${excellingPercent}% achievement at A/E levels across ${totalSubjects} subject areas. ` +
      `Demonstrates strong ${report.learnerProfileAttributes?.[0]?.attribute || 'IB learner'} qualities with continued development needed in consistency across all attributes.`;

    // Key strengths - link subjects to IB attributes
    const subjectAttributeMap: { [key: string]: string } = {
      'English': 'COMMUNICATOR',
      'Mathematics': 'THINKER',
      'Math': 'THINKER',
      'Science': 'INQUIRER',
      'Hindi': 'COMMUNICATOR',
      'PSPE': 'BALANCED',
      'Arts': 'RISK-TAKER',
      'Unit of Inquiry': 'KNOWLEDGEABLE'
    };

    report.ibSubjectAreas?.forEach((area: any) => {
      if ((area.effortGrade === 'A' || area.effortGrade === 'E') &&
          summary.keyStrengths.length < 4) {
        const attribute = subjectAttributeMap[area.subjectName] || 'KNOWLEDGEABLE';
        summary.keyStrengths.push(
          `${attribute} - Excels in ${area.subjectName} (${area.effortGrade} level), meeting Grade ${gradeLevel} IB expectations`
        );
      }
    });

    // Add learner profile attributes with evidence
    if (report.learnerProfileAttributes?.length > 0 && summary.keyStrengths.length < 4) {
      report.learnerProfileAttributes.slice(0, 4 - summary.keyStrengths.length).forEach((attr: any) => {
        const evidence = attr.evidence?.substring(0, 100) || 'demonstrated throughout report';
        summary.keyStrengths.push(
          `${attr.attribute.toUpperCase()} - ${evidence}`
        );
      });
    }

    // Areas needing attention - always identify growth opportunities
    report.ibSubjectAreas?.forEach((area: any) => {
      if ((area.effortGrade === 'B' || area.effortGrade === 'D') &&
          summary.areasNeedingAttention.length < 3) {
        const attribute = subjectAttributeMap[area.subjectName] || 'KNOWLEDGEABLE';
        summary.areasNeedingAttention.push(
          `${attribute} - Continue developing in ${area.subjectName} (currently ${area.effortGrade} level); Grade ${gradeLevel} target is consistent A/E performance`
        );
      }
    });

    // If no areas identified yet, look for attributes not strongly demonstrated
    const demonstratedAttributes = new Set(
      report.learnerProfileAttributes?.map((a: any) => a.attribute.toLowerCase()) || []
    );

    if (summary.areasNeedingAttention.length < 3) {
      ibAttributes.forEach(attr => {
        if (!demonstratedAttributes.has(attr.toLowerCase()) &&
            summary.areasNeedingAttention.length < 3) {
          summary.areasNeedingAttention.push(
            `${attr.toUpperCase()} - Limited evidence in report; encourage development of ${attr.toLowerCase()} qualities aligned with Grade ${gradeLevel} IB expectations`
          );
        }
      });
    }

    // If still empty, add general development areas
    if (summary.areasNeedingAttention.length === 0) {
      summary.areasNeedingAttention.push(
        `REFLECTIVE - Encourage self-assessment and goal-setting practices typical for Grade ${gradeLevel}`,
        `RISK-TAKER - Foster independence in approaching challenging tasks without prompting`
      );
    }

    // Teacher highlights with IB connections
    if (report.teacherComments) {
      const sentences = this.extractKeyPoints(report.teacherComments, 3);
      summary.teacherHighlights = sentences.map((sentence, idx) => {
        // Try to connect to IB attributes
        const attr = report.learnerProfileAttributes?.[idx]?.attribute || '';
        return attr ? `${sentence} (${attr.toUpperCase()} attribute)` : sentence;
      });
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
    // Note: In IB, EYP (Early Years Programme) covers ages 3-6 (roughly Pre-K to Grade 1)
    // PYP (Primary Years Programme) covers ages 6-12 (roughly Grades 1-5)

    if (!grade) {
      return standards.middle; // Default to middle if unknown
    }

    // EYP (Early Years Programme) - All EYP grades are early years
    if (gradeLevel.includes('eyp')) {
      return standards.early;
    }
    // Pre-K, Kindergarten, Nursery, Grade 1
    else if (gradeLevel.includes('pre-k') || gradeLevel.includes('kindergarten') ||
             gradeLevel.includes('nursery') || gradeLevel === '1') {
      return standards.early;
    }
    // Grades 2-3: Middle Primary
    else if (gradeLevel === '2' || gradeLevel === '3') {
      return standards.middle;
    }
    // Grades 4-5: Upper Primary
    else if (gradeLevel === '4' || gradeLevel === '5') {
      return standards.upper;
    }
    // Grade 6+: Secondary
    else {
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

  /**
   * Helper: Fix malformed JSON from AI responses
   * Handles cases where AI includes literal newlines in string values
   */
  private fixMalformedJSON(jsonStr: string): string {
    // Strategy: Find string values and escape any unescaped newlines
    let fixed = jsonStr;

    // Replace all literal newlines within quoted strings with escaped newlines
    // This regex finds strings and processes them
    fixed = fixed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
      // Escape any literal newlines that aren't already escaped
      const escaped = content
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .replace(/\r/g, '')   // Remove carriage returns
        .replace(/\t/g, ' ')  // Replace tabs with spaces
        .replace(/\s+/g, ' '); // Collapse multiple spaces
      return `"${escaped}"`;
    });

    return fixed;
  }
}

export default new SummarizationService();
