import venueSearchService, { Venue } from './venue-search.service';

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
  venues?: Venue[]; // Nearby venues where this activity can be pursued
}

export class ActivityRecommendationService {
  /**
   * Generate personalized activity recommendations based on report analysis
   * Returns 3-5 highly targeted recommendations prioritizing:
   * 1. Areas of improvement (60%)
   * 2. Reinforcing strengths (30%)
   * 3. Age-appropriate well-rounded development (10%)
   */
  generateRecommendations(report: any): ActivityRecommendation[] {
    const grade = this.parseGrade(report.grade);
    const ageGroup = this.getAgeGroup(grade);
    const age = this.estimateAge(report.grade);

    console.log(`Generating recommendations for age ${age}, grade ${report.grade}, ageGroup ${ageGroup}`);

    // Analyze strengths and weaknesses from the report
    const analysis = this.analyzeReportForRecommendations(report);

    console.log('Analysis:', {
      weakAttributes: analysis.weakAttributes,
      strongAttributes: analysis.strongAttributes
    });

    // Collect all potential activities
    const allActivities: ActivityRecommendation[] = [];

    // Get activities for ALL categories
    allActivities.push(...this.getPhysicalActivities(ageGroup));
    allActivities.push(...this.getCulturalActivities(ageGroup));
    allActivities.push(...this.getSTEMActivities(ageGroup));
    allActivities.push(...this.getMindfulnessActivities(ageGroup));
    allActivities.push(...this.getStrengthMaintenanceActivities(report, ageGroup));

    // Filter by age appropriateness
    const ageAppropriateActivities = allActivities.filter(activity =>
      this.isAgeAppropriate(activity, age)
    );

    // Score and rank activities based on alignment with needs
    const scoredActivities = ageAppropriateActivities.map(activity => {
      const score = this.scoreActivity(activity, analysis);
      return { activity, score };
    });

    // Sort by score (highest first)
    scoredActivities.sort((a, b) => b.score - a.score);

    // Select top 3-5 activities ensuring diversity
    const selectedActivities = this.selectDiverseActivities(
      scoredActivities,
      analysis,
      3, // minimum
      5  // maximum
    );

    console.log(`Selected ${selectedActivities.length} activities`);

    return selectedActivities;
  }

  /**
   * Enrich recommendations with nearby venue information
   */
  async enrichWithVenues(
    recommendations: ActivityRecommendation[],
    latitude: number,
    longitude: number,
    radiusMeters: number = 10000 // Default 10km
  ): Promise<ActivityRecommendation[]> {
    console.log(`Searching for venues near ${latitude}, ${longitude} within ${radiusMeters}m`);

    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          const venues = await venueSearchService.searchVenuesForActivity(
            rec.name,
            rec.category,
            latitude,
            longitude,
            radiusMeters
          );

          console.log(`Found ${venues.length} venues for ${rec.name}`);

          return {
            ...rec,
            venues
          };
        } catch (error) {
          console.error(`Error searching venues for ${rec.name}:`, error);
          return rec; // Return recommendation without venues if search fails
        }
      })
    );

    return enrichedRecommendations;
  }

  /**
   * Analyze report to extract strengths and areas needing improvement
   */
  private analyzeReportForRecommendations(report: any): {
    weakAttributes: string[];
    strongAttributes: string[];
    needsCategories: string[];
  } {
    const analysis = {
      weakAttributes: [] as string[],
      strongAttributes: [] as string[],
      needsCategories: [] as string[]
    };

    // Extract from AI-generated summary
    if (report.summary) {
      // Areas needing attention = weaknesses
      const areasNeedingAttention = report.summary.areasNeedingAttention || [];
      areasNeedingAttention.forEach((area: string) => {
        const areaLower = area.toLowerCase();

        // Extract IB learner profile attributes mentioned
        const ibAttributes = [
          'inquirer', 'knowledgeable', 'thinker', 'communicator',
          'principled', 'open-minded', 'caring', 'risk-taker',
          'balanced', 'reflective'
        ];

        ibAttributes.forEach(attr => {
          if (areaLower.includes(attr) || areaLower.includes(attr.replace('-', ' '))) {
            if (!analysis.weakAttributes.includes(attr)) {
              analysis.weakAttributes.push(attr);
            }
          }
        });
      });

      // Key strengths
      const keyStrengths = report.summary.keyStrengths || [];
      keyStrengths.forEach((strength: string) => {
        const strengthLower = strength.toLowerCase();

        const ibAttributes = [
          'inquirer', 'knowledgeable', 'thinker', 'communicator',
          'principled', 'open-minded', 'caring', 'risk-taker',
          'balanced', 'reflective'
        ];

        ibAttributes.forEach(attr => {
          if (strengthLower.includes(attr) || strengthLower.includes(attr.replace('-', ' '))) {
            if (!analysis.strongAttributes.includes(attr)) {
              analysis.strongAttributes.push(attr);
            }
          }
        });
      });
    }

    return analysis;
  }

  /**
   * Score an activity based on how well it addresses the child's needs
   */
  private scoreActivity(
    activity: ActivityRecommendation,
    analysis: { weakAttributes: string[]; strongAttributes: string[] }
  ): number {
    let score = 0;

    // Primary goal: Address weaknesses (60% weight)
    const targetAttrsLower = activity.targetAttributes.map(a => a.toLowerCase());

    analysis.weakAttributes.forEach(weakAttr => {
      if (targetAttrsLower.some(target =>
        target.includes(weakAttr) || weakAttr.includes(target)
      )) {
        score += 60; // High score for addressing weakness
      }
    });

    // Secondary goal: Reinforce strengths (30% weight)
    analysis.strongAttributes.forEach(strongAttr => {
      if (targetAttrsLower.some(target =>
        target.includes(strongAttr) || strongAttr.includes(target)
      )) {
        score += 30; // Medium score for reinforcing strength
      }
    });

    // Tertiary: Well-rounded development (10% weight)
    score += 10; // Base score for all age-appropriate activities

    // Boost for HIGH priority activities
    if (activity.priority === 'HIGH') {
      score += 20;
    } else if (activity.priority === 'MEDIUM') {
      score += 10;
    }

    return score;
  }

  /**
   * Select 3-5 diverse activities from scored list
   */
  private selectDiverseActivities(
    scoredActivities: { activity: ActivityRecommendation; score: number }[],
    analysis: { weakAttributes: string[]; strongAttributes: string[] },
    minActivities: number,
    maxActivities: number
  ): ActivityRecommendation[] {
    const selected: ActivityRecommendation[] = [];
    const usedCategories = new Set<string>();
    const addressedWeakAttributes = new Set<string>();

    // Priority 1: Ensure we address the top 2-3 weaknesses
    const topWeaknesses = analysis.weakAttributes.slice(0, 3);

    for (const activity of scoredActivities) {
      if (selected.length >= maxActivities) break;

      const activityWeaknesses = activity.activity.targetAttributes
        .map(a => a.toLowerCase())
        .filter(a => topWeaknesses.some(w => a.includes(w) || w.includes(a)));

      // Select if it addresses an unaddressed weakness
      if (activityWeaknesses.length > 0) {
        const hasNewWeakness = activityWeaknesses.some(w =>
          !Array.from(addressedWeakAttributes).some(aw => w.includes(aw) || aw.includes(w))
        );

        if (hasNewWeakness) {
          selected.push(activity.activity);
          usedCategories.add(activity.activity.category);
          activityWeaknesses.forEach(w => addressedWeakAttributes.add(w));
          continue;
        }
      }
    }

    // Priority 2: Add strength-reinforcing activities (max 1-2)
    let strengthActivities = 0;
    for (const activity of scoredActivities) {
      if (selected.length >= maxActivities) break;
      if (strengthActivities >= 2) break;
      if (selected.includes(activity.activity)) continue;

      const activityStrengths = activity.activity.targetAttributes
        .map(a => a.toLowerCase())
        .filter(a => analysis.strongAttributes.some(s => a.includes(s) || s.includes(a)));

      if (activityStrengths.length > 0 && activity.score >= 40) {
        selected.push(activity.activity);
        usedCategories.add(activity.activity.category);
        strengthActivities++;
      }
    }

    // Priority 3: Fill to minimum with highest-scored diverse activities
    for (const activity of scoredActivities) {
      if (selected.length >= minActivities) break;
      if (selected.includes(activity.activity)) continue;

      // Prefer different categories for diversity
      if (!usedCategories.has(activity.activity.category) || selected.length < minActivities) {
        selected.push(activity.activity);
        usedCategories.add(activity.activity.category);
      }
    }

    return selected;
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

    // Handle IB format like "EYP 3", "PYP 3D", "4A", etc.
    const numMatch = grade.match(/\d+/);
    if (numMatch) {
      return parseInt(numMatch[0]);
    }

    return 3; // Default to grade 3
  }

  /**
   * Estimate age from grade level
   * EYP (Early Years Programme): ages 3-6
   * PYP (Primary Years Programme): ages 6-12
   */
  private estimateAge(grade?: string): number {
    if (!grade) return 5;

    const gradeLower = grade.toLowerCase();

    // EYP (Early Years Programme) - ages 3-6
    if (gradeLower.includes('eyp')) {
      const num = this.parseGrade(grade);
      return Math.min(2 + num, 6); // EYP 1 = age 3, EYP 2 = age 4, etc., max 6
    }

    // PYP (Primary Years Programme) or numeric grades
    const gradeNum = this.parseGrade(grade);

    // Grade to age mapping (assuming child starts Grade 1 at age 6)
    if (gradeNum <= 0) return 5;  // Pre-K/Kindergarten
    return 5 + gradeNum; // Grade 1 = age 6, Grade 2 = age 7, etc.
  }

  /**
   * Check if activity is age-appropriate
   */
  private isAgeAppropriate(activity: ActivityRecommendation, age: number): boolean {
    // All activities in the current database are marked ageAppropriate: true
    // but we can add more granular age filtering here

    const category = activity.category.toLowerCase();

    // Some activities have minimum age requirements
    if (category.includes('art therapy') && age < 4) return false;
    if (category.includes('language immersion') && age < 3) return false;
    if (category.includes('engineering') && age < 5) return false;

    // Multi-sport is better for ages 4+
    if (activity.id === 'multi-sport' && age < 4) return false;

    // Swimming can start early
    if (activity.id === 'swimming-lessons' && age < 3) return false;

    // Gymnastics can start at age 3
    if (activity.id === 'gymnastics-toddler' && age < 3) return false;

    // Most activities are fine for ages 3-12
    return true;
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
