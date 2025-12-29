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
}

export class ActivityRecommendationService {
  /**
   * Generate personalized activity recommendations based on report analysis
   */
  generateRecommendations(report: any): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];
    const grade = this.parseGrade(report.grade);
    const ageGroup = this.getAgeGroup(grade);

    // Analyze the report to determine development needs
    const developmentNeeds = this.analyzeDevelopmentNeeds(report);

    // For early years children, ensure well-rounded development across all areas
    // Even if no specific needs are identified, provide baseline recommendations
    const isEarlyYears = ageGroup === 'early-years' || ageGroup === 'primary-lower';

    // Generate recommendations based on identified needs OR baseline for early years
    if (developmentNeeds.needsRiskTaking || isEarlyYears) {
      recommendations.push(...this.getPhysicalActivities(ageGroup));
    }

    if (developmentNeeds.needsCulturalExposure || isEarlyYears) {
      recommendations.push(...this.getCulturalActivities(ageGroup));
    }

    if (developmentNeeds.needsInquiryDevelopment || isEarlyYears) {
      recommendations.push(...this.getSTEMActivities(ageGroup));
    }

    if (developmentNeeds.needsReflection || (isEarlyYears && grade >= 3)) {
      recommendations.push(...this.getMindfulnessActivities(ageGroup));
    }

    // Always include activities to maintain strengths
    if (report.summary?.keyStrengths?.length > 0) {
      recommendations.push(...this.getStrengthMaintenanceActivities(report, ageGroup));
    }

    // If we still have too few recommendations, ensure minimum variety
    if (recommendations.length < 6 && isEarlyYears) {
      const categories = new Set(recommendations.map(r => r.category));
      if (!categories.has('Physical Development')) {
        recommendations.push(...this.getPhysicalActivities(ageGroup).slice(0, 1));
      }
      if (!categories.has('Cultural Exposure')) {
        recommendations.push(...this.getCulturalActivities(ageGroup).slice(0, 1));
      }
      if (!categories.has('STEM & Inquiry')) {
        recommendations.push(...this.getSTEMActivities(ageGroup).slice(0, 1));
      }
    }

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
      .slice(0, 8); // Return top 8 recommendations
  }

  /**
   * Analyze report to determine development needs
   */
  private analyzeDevelopmentNeeds(report: any): any {
    const needs = {
      needsRiskTaking: false,
      needsCulturalExposure: false,
      needsInquiryDevelopment: false,
      needsReflection: false,
      needsSocialSkills: false
    };

    // Check AI-generated summary
    if (report.summary) {
      const areasNeedingAttention = (report.summary.areasNeedingAttention || [])
        .join(' ')
        .toLowerCase();

      needs.needsRiskTaking =
        areasNeedingAttention.includes('risk-taker') ||
        areasNeedingAttention.includes('risk taker') ||
        areasNeedingAttention.includes('trying new') ||
        areasNeedingAttention.includes('uncertainty');

      needs.needsCulturalExposure =
        areasNeedingAttention.includes('open-minded') ||
        areasNeedingAttention.includes('open minded') ||
        areasNeedingAttention.includes('diverse') ||
        areasNeedingAttention.includes('perspectives');

      needs.needsInquiryDevelopment =
        areasNeedingAttention.includes('knowledgeable') ||
        areasNeedingAttention.includes('inquirer') ||
        areasNeedingAttention.includes('cross-disciplinary') ||
        areasNeedingAttention.includes('disciplines');

      needs.needsReflection =
        areasNeedingAttention.includes('reflective') ||
        areasNeedingAttention.includes('self-assessment') ||
        areasNeedingAttention.includes('strengths and weaknesses');

      needs.needsSocialSkills =
        areasNeedingAttention.includes('caring') ||
        areasNeedingAttention.includes('communicator') ||
        areasNeedingAttention.includes('social');
    }

    return needs;
  }

  /**
   * Get physical/risk-taking activities
   */
  private getPhysicalActivities(ageGroup: string): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];

    if (ageGroup === 'early-years' || ageGroup === 'primary-lower') {
      activities.push({
        id: 'gymnastics-toddler',
        name: 'Gymnastics/Tumbling Program',
        category: 'Physical Development',
        priority: 'HIGH',
        targetAttributes: ['Risk-taker', 'Balanced', 'Reflective'],
        description: 'Age-appropriate gymnastics focusing on body awareness, balance, and controlled risk-taking in a safe environment.',
        benefits: [
          'Builds confidence in trying new physical challenges',
          'Develops body awareness and coordination',
          'Teaches safe risk assessment',
          'Promotes resilience through trying again after falls'
        ],
        frequency: '2x per week, 45-60 minutes',
        estimatedCost: '$100-150 per month',
        ageAppropriate: true,
        whyRecommended: 'Directly addresses risk-taking development in a structured, safe environment. Most critical for IB learner profile growth.'
      });

      activities.push({
        id: 'swimming-lessons',
        name: 'Swimming Lessons',
        category: 'Physical Development',
        priority: 'HIGH',
        targetAttributes: ['Risk-taker', 'Balanced', 'Principled'],
        description: 'Water safety and swimming skills for young children, focusing on confidence and safety awareness.',
        benefits: [
          'Overcomes water fear through gradual exposure',
          'Teaches important safety skills',
          'Builds confidence in unfamiliar environments',
          'Develops gross motor skills'
        ],
        frequency: '1-2x per week, 30-45 minutes',
        estimatedCost: '$80-150 per month',
        ageAppropriate: true,
        whyRecommended: 'Essential life skill that naturally develops risk-taking and confidence. Safe environment for facing fears.'
      });

      activities.push({
        id: 'multi-sport',
        name: 'Multi-Sport Introduction',
        category: 'Physical Development',
        priority: 'HIGH',
        targetAttributes: ['Risk-taker', 'Balanced', 'Thinker', 'Caring'],
        description: 'Non-competitive introduction to various sports (soccer, basketball, t-ball) through fun games and activities.',
        benefits: [
          'Exposure to multiple sports without pressure',
          'Develops varied motor skills',
          'Teaches teamwork and cooperation',
          'Builds confidence through play'
        ],
        frequency: '1-2x per week, 45-60 minutes',
        estimatedCost: '$60-120 per month',
        ageAppropriate: true,
        whyRecommended: 'Variety keeps engagement high while developing multiple physical competencies and risk-taking in a team environment.'
      });
    }

    return activities;
  }

  /**
   * Get cultural/language activities
   */
  private getCulturalActivities(ageGroup: string): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];

    activities.push({
      id: 'world-music',
      name: 'World Music & Movement',
      category: 'Cultural Exposure',
      priority: 'HIGH',
      targetAttributes: ['Open-minded', 'Knowledgeable', 'Communicator', 'Balanced'],
      description: 'Explore music, instruments, and dances from cultures around the world through interactive, play-based learning.',
      benefits: [
        'Exposure to diverse cultural traditions',
        'Develops rhythm and musical awareness',
        'Builds appreciation for different perspectives',
        'Combines physical movement with cultural learning'
      ],
      frequency: '1x per week, 45 minutes',
      estimatedCost: '$60-100 per month',
      ageAppropriate: true,
      whyRecommended: 'Directly develops open-minded attribute through joyful, engaging cultural exposure. Leverages existing communication strengths.'
    });

    activities.push({
      id: 'language-immersion',
      name: 'Language Immersion Class',
      category: 'Cultural Exposure',
      priority: 'HIGH',
      targetAttributes: ['Open-minded', 'Communicator', 'Risk-taker', 'Knowledgeable'],
      description: 'Play-based language learning in Spanish, French, or Mandarin through songs, games, and stories.',
      benefits: [
        'Early language acquisition advantage',
        'Cultural understanding through language',
        'Cognitive benefits of bilingualism',
        'Confidence in communication'
      ],
      frequency: '1-2x per week, 45-60 minutes',
      estimatedCost: '$80-150 per month',
      ageAppropriate: true,
      whyRecommended: 'IB values multilingualism highly. Builds on existing language strengths while developing cultural awareness.'
    });

    activities.push({
      id: 'cultural-storytelling',
      name: 'Cultural Storytelling & Arts',
      category: 'Cultural Exposure',
      priority: 'MEDIUM',
      targetAttributes: ['Open-minded', 'Knowledgeable', 'Caring', 'Communicator'],
      description: 'Stories, arts, and crafts from cultures worldwide. Each session explores a different tradition.',
      benefits: [
        'Deep dive into various cultures',
        'Develops empathy through stories',
        'Hands-on cultural art forms',
        'Critical thinking about perspectives'
      ],
      frequency: '1x per week, 60 minutes',
      estimatedCost: '$60-120 per month',
      ageAppropriate: true,
      whyRecommended: 'Combines artistic strength with cultural learning. Develops open-minded perspective through narrative and art.'
    });

    return activities;
  }

  /**
   * Get STEM/inquiry activities
   */
  private getSTEMActivities(ageGroup: string): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];

    activities.push({
      id: 'science-exploration',
      name: 'Science Exploration Club',
      category: 'STEM & Inquiry',
      priority: 'HIGH',
      targetAttributes: ['Inquirer', 'Knowledgeable', 'Thinker', 'Risk-taker'],
      description: 'Hands-on science experiments designed for young children. Focus on observation, prediction, and discovery.',
      benefits: [
        'Develops inquiry mindset',
        'Cross-disciplinary knowledge building',
        'Safe experimentation and "failure"',
        'Scientific thinking foundations'
      ],
      frequency: '1x per week or bi-weekly, 60 minutes',
      estimatedCost: '$60-120 per month',
      ageAppropriate: true,
      whyRecommended: 'Addresses need for cross-disciplinary knowledge. Develops inquiry skills essential for IB learning.'
    });

    activities.push({
      id: 'nature-exploration',
      name: 'Nature & Outdoor Exploration',
      category: 'STEM & Inquiry',
      priority: 'HIGH',
      targetAttributes: ['Inquirer', 'Knowledgeable', 'Caring', 'Risk-taker'],
      description: 'Regular outdoor sessions in natural settings. Environmental education and hands-on exploration.',
      benefits: [
        'Environmental awareness and stewardship',
        'Inquiry in natural context',
        'Physical risk-taking opportunities',
        'Connection to global issues'
      ],
      frequency: '1-2x per month, 90-120 minutes',
      estimatedCost: '$40-80 per month',
      ageAppropriate: true,
      whyRecommended: 'Combines inquiry, knowledge, and caring attributes. Addresses need for engagement with local/global issues.'
    });

    activities.push({
      id: 'building-engineering',
      name: 'Building & Engineering for Kids',
      category: 'STEM & Inquiry',
      priority: 'MEDIUM',
      targetAttributes: ['Thinker', 'Inquirer', 'Risk-taker', 'Knowledgeable'],
      description: 'Engineering concepts through building challenges with LEGO, blocks, and various materials.',
      benefits: [
        'Problem-solving and design thinking',
        'Safe failure environment',
        'Spatial reasoning development',
        'Physics and engineering basics'
      ],
      frequency: '1x per week, 60 minutes',
      estimatedCost: '$60-120 per month',
      ageAppropriate: true,
      whyRecommended: 'Develops critical thinking and problem-solving. Natural risk-taking through building and testing.'
    });

    return activities;
  }

  /**
   * Get mindfulness/reflection activities
   */
  private getMindfulnessActivities(ageGroup: string): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];

    activities.push({
      id: 'kids-yoga',
      name: 'Kids Yoga & Mindfulness',
      category: 'Mindfulness & Reflection',
      priority: 'MEDIUM',
      targetAttributes: ['Reflective', 'Balanced', 'Caring', 'Principled'],
      description: 'Playful yoga practice with breathing exercises and simple meditation for young children.',
      benefits: [
        'Develops self-awareness and reflection',
        'Teaches self-regulation techniques',
        'Builds body awareness',
        'Provides calming strategies'
      ],
      frequency: '1x per week, 30-45 minutes (can also practice at home daily)',
      estimatedCost: '$40-80 per month',
      ageAppropriate: true,
      whyRecommended: 'Directly develops reflective attribute. Can be practiced at home for sustained impact.'
    });

    activities.push({
      id: 'art-therapy',
      name: 'Art Therapy / Expressive Arts',
      category: 'Mindfulness & Reflection',
      priority: 'MEDIUM',
      targetAttributes: ['Reflective', 'Communicator', 'Caring', 'Balanced'],
      description: 'Therapeutic art program using creative expression to explore emotions and build self-awareness.',
      benefits: [
        'Emotional awareness and regulation',
        'Safe expression of feelings',
        'Self-understanding development',
        'Coping strategy development'
      ],
      frequency: '1-2x per month, 45-60 minutes',
      estimatedCost: '$80-150 per month',
      ageAppropriate: true,
      whyRecommended: 'Leverages artistic strength for emotional development. Supports reflective thinking about self.'
    });

    return activities;
  }

  /**
   * Get activities to maintain existing strengths
   */
  private getStrengthMaintenanceActivities(report: any, ageGroup: string): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];
    const strengths = report.summary?.keyStrengths?.join(' ').toLowerCase() || '';

    // If strong in communication/arts
    if (strengths.includes('communicator') || strengths.includes('art')) {
      activities.push({
        id: 'creative-drama',
        name: 'Creative Drama / Theater Arts',
        category: 'Creative Expression',
        priority: 'MEDIUM',
        targetAttributes: ['Communicator', 'Risk-taker', 'Open-minded', 'Reflective'],
        description: 'Imaginative play, storytelling, and performance activities for young children.',
        benefits: [
          'Leverages communication strength',
          'Builds confidence through performance',
          'Develops perspective-taking',
          'Risk-taking in creative context'
        ],
        frequency: '1x per week, 45-60 minutes',
        estimatedCost: '$60-120 per month',
        ageAppropriate: true,
        whyRecommended: 'Builds on existing communication excellence while developing risk-taking and open-mindedness.'
      });
    }

    return activities;
  }

  /**
   * Helper methods
   */
  private parseGrade(grade?: string): number {
    if (!grade) return 3;

    // Handle IB format like "3D", "4A", etc.
    const numMatch = grade.match(/\d+/);
    if (numMatch) {
      return parseInt(numMatch[0]);
    }

    return 3; // Default to 3 years old
  }

  private getAgeGroup(grade: number): string {
    if (grade <= 1) return 'early-years';
    if (grade <= 3) return 'primary-lower';
    if (grade <= 5) return 'primary-upper';
    return 'primary-upper';
  }

  private priorityWeight(priority: string): number {
    switch (priority) {
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  }
}

export default new ActivityRecommendationService();
