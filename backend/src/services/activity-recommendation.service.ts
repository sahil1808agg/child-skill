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
  estimatedCostUSD: { min: number; max: number }; // Cost range in USD for conversion
  activityType: 'indoor' | 'outdoor' | 'both'; // Indoor, outdoor, or both
  ageAppropriate: boolean;
  whyRecommended: string;
  recommendationType?: 'improvement' | 'strength' | 'age-based'; // Why this was recommended (computed during selection)
  targetedAttributes?: string[]; // Specific weak or strong attributes this addresses (computed during selection)
  venues?: Venue[]; // Nearby venues where this activity can be pursued
  regionalSuitability?: {
    climatePreference?: Array<'tropical' | 'subtropical' | 'temperate' | 'cold' | 'arid'>;
    requiresCoastal?: boolean;
  };
  feasibilityScore?: {
    budgetMatch: number;
    climateMatch: number;
    overall: number;
  };
}

export interface CurrentActivityEvaluation {
  activityName: string;
  recommendation: 'continue' | 'reconsider' | 'stop';
  reasoning: string;
  alignment: number; // 0-100 score for how well it aligns with needs
  alternatives?: string[]; // Suggested alternatives if stop/reconsider
}

export interface ParentAction {
  category: 'improvement' | 'strength-maintenance';
  targetArea: string; // e.g., "Writing Skills", "Reading Comprehension"
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  activities: Array<{
    activity: string;
    frequency: string;
    duration: string;
    tips: string[];
  }>;
  expectedOutcome: string;
  timeToSeeResults: string;
}

export class ActivityRecommendationService {
  /**
   * Generate personalized activity recommendations based on report analysis
   * Returns 3-5 highly targeted recommendations prioritizing:
   * 1. Areas of improvement (60%)
   * 2. Reinforcing strengths (30%)
   * 3. Age-appropriate well-rounded development (10%)
   */
  generateRecommendations(
    report: any,
    options?: {
      budget?: number;
      budgetFlexibility?: 'strict' | 'moderate' | 'flexible';
      climateZone?: string;
      isCoastal?: boolean;
      minFeasibilityScore?: number;
    }
  ): ActivityRecommendation[] {
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
    allActivities.push(...this.getAtHomeActivities(ageGroup, age));
    allActivities.push(...this.getStrengthMaintenanceActivities(report, ageGroup));

    // Filter by age appropriateness
    const ageAppropriateActivities = allActivities.filter(activity =>
      this.isAgeAppropriate(activity, age)
    );

    // Calculate feasibility scores for all activities
    const activitiesWithFeasibility = ageAppropriateActivities.map(activity => {
      const feasibilityScore = this.calculateFeasibilityScore(activity, {
        budget: options?.budget,
        budgetFlexibility: options?.budgetFlexibility || 'moderate',
        climateZone: options?.climateZone,
        isCoastal: options?.isCoastal
      });

      return {
        ...activity,
        feasibilityScore
      };
    });

    // Filter by minimum feasibility score (default 30)
    const minScore = options?.minFeasibilityScore ?? 30;
    const feasibleActivities = activitiesWithFeasibility.filter(
      a => a.feasibilityScore!.overall >= minScore
    );

    // If too few activities pass filter, relax to show top 15 by feasibility
    const candidateActivities = feasibleActivities.length >= 15
      ? feasibleActivities
      : activitiesWithFeasibility
          .sort((a, b) => b.feasibilityScore!.overall - a.feasibilityScore!.overall)
          .slice(0, 15);

    console.log(`Feasibility filtering: ${activitiesWithFeasibility.length} total, ${feasibleActivities.length} passed threshold, ${candidateActivities.length} candidates`);

    // Score and rank activities based on alignment with needs
    const scoredActivities = candidateActivities.map(activity => {
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
   * Convert USD cost to local currency based on location
   */
  private convertCurrency(usdMin: number, usdMax: number, country: string): string {
    const currencyRates: { [key: string]: { rate: number; symbol: string; name: string } } = {
      'India': { rate: 83, symbol: '₹', name: 'INR' },
      'United States': { rate: 1, symbol: '$', name: 'USD' },
      'United Kingdom': { rate: 0.79, symbol: '£', name: 'GBP' },
      'Singapore': { rate: 1.34, symbol: 'S$', name: 'SGD' },
      'UAE': { rate: 3.67, symbol: 'AED', name: 'AED' },
      'Australia': { rate: 1.52, symbol: 'A$', name: 'AUD' },
      'Canada': { rate: 1.35, symbol: 'C$', name: 'CAD' }
    };

    // Default to USD if country not found
    const currencyInfo = currencyRates[country] || currencyRates['United States'];

    const localMin = Math.round(usdMin * currencyInfo.rate);
    const localMax = Math.round(usdMax * currencyInfo.rate);

    return `${currencyInfo.symbol}${localMin}-${localMax} per month`;
  }

  /**
   * Detect country from coordinates (simplified - based on common locations)
   */
  private async detectCountry(latitude: number, longitude: number): Promise<string> {
    // Simplified country detection based on lat/long ranges
    // India: roughly 8-35°N, 68-97°E
    if (latitude >= 8 && latitude <= 35 && longitude >= 68 && longitude <= 97) {
      return 'India';
    }
    // Singapore: roughly 1.2-1.5°N, 103-104°E
    if (latitude >= 1.2 && latitude <= 1.5 && longitude >= 103 && longitude <= 104) {
      return 'Singapore';
    }
    // UAE: roughly 22-26°N, 51-56°E
    if (latitude >= 22 && latitude <= 26 && longitude >= 51 && longitude <= 56) {
      return 'UAE';
    }
    // Default to USD
    return 'United States';
  }

  /**
   * Enrich recommendations with nearby venue information and local currency
   * Prioritizes activities based on local availability
   */
  async enrichWithVenues(
    recommendations: ActivityRecommendation[],
    latitude: number,
    longitude: number,
    radiusMeters: number = 10000 // Default 10km
  ): Promise<ActivityRecommendation[]> {
    console.log(`Searching for venues near ${latitude}, ${longitude} within ${radiusMeters}m`);

    // Detect country from coordinates for currency conversion
    const country = await this.detectCountry(latitude, longitude);
    console.log(`Detected country: ${country}`);

    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          // At-home activities don't need venue search
          if (rec.category === 'At-Home Learning') {
            const localCost = this.convertCurrency(
              rec.estimatedCostUSD.min,
              rec.estimatedCostUSD.max,
              country
            );
            return {
              ...rec,
              estimatedCost: localCost
            };
          }

          const venues = await venueSearchService.searchVenuesForActivity(
            rec.name,
            rec.category,
            latitude,
            longitude,
            radiusMeters
          );

          console.log(`Found ${venues.length} venues for ${rec.name}`);

          // Convert cost to local currency
          const localCost = this.convertCurrency(
            rec.estimatedCostUSD.min,
            rec.estimatedCostUSD.max,
            country
          );

          return {
            ...rec,
            estimatedCost: localCost, // Override with local currency
            venues
          };
        } catch (error) {
          console.error(`Error searching venues for ${rec.name}:`, error);
          return rec; // Return recommendation without venues if search fails
        }
      })
    );

    // Re-prioritize based on venue availability
    // Activities with venues nearby should be prioritized
    const prioritized = this.prioritizeByVenueAvailability(enrichedRecommendations);

    return prioritized;
  }

  /**
   * Prioritize recommendations based on venue availability
   * Activities with more venues get higher priority as they're more accessible
   */
  private prioritizeByVenueAvailability(recommendations: ActivityRecommendation[]): ActivityRecommendation[] {
    // Separate at-home activities (always keep them) from formal activities
    const atHomeActivities = recommendations.filter(r => r.category === 'At-Home Learning');
    const formalActivities = recommendations.filter(r => r.category !== 'At-Home Learning');

    // Sort formal activities by venue count (descending)
    formalActivities.sort((a, b) => {
      const venuesA = a.venues?.length || 0;
      const venuesB = b.venues?.length || 0;

      // If both have 0 venues, keep original order
      if (venuesA === 0 && venuesB === 0) return 0;

      // Prioritize activities with venues
      return venuesB - venuesA;
    });

    // Interleave: Include at least 1-2 at-home activities, rest from venue-prioritized formal activities
    const result: ActivityRecommendation[] = [];
    const maxAtHome = Math.min(2, atHomeActivities.length);
    const maxFormal = recommendations.length - maxAtHome;

    // Add top at-home activities
    result.push(...atHomeActivities.slice(0, maxAtHome));

    // Add venue-prioritized formal activities
    result.push(...formalActivities.slice(0, maxFormal));

    console.log('Venue-based prioritization:', {
      total: result.length,
      atHome: maxAtHome,
      formal: result.length - maxAtHome,
      withVenues: result.filter(r => r.venues && r.venues.length > 0).length
    });

    return result.slice(0, recommendations.length); // Keep same count as input
  }

  /**
   * Evaluate current activities the child is engaged in
   * Determines whether each activity should be continued, reconsidered, or stopped
   */
  evaluateCurrentActivities(
    report: any,
    currentActivities: string[]
  ): CurrentActivityEvaluation[] {
    console.log(`Evaluating ${currentActivities.length} current activities`);

    // Analyze the child's strengths and weaknesses
    const analysis = this.analyzeReportForRecommendations(report);

    const evaluations: CurrentActivityEvaluation[] = currentActivities.map(activityName => {
      // Determine what attributes this activity likely develops
      const activityAttributes = this.inferActivityAttributes(activityName);

      // Calculate alignment score based on how well it addresses needs
      const { score, reasoning } = this.calculateActivityAlignment(
        activityAttributes,
        analysis,
        activityName
      );

      // Determine recommendation based on alignment score
      let recommendation: 'continue' | 'reconsider' | 'stop';
      let alternatives: string[] | undefined;

      if (score >= 60) {
        recommendation = 'continue';
      } else if (score >= 30) {
        recommendation = 'reconsider';
        alternatives = this.suggestAlternatives(activityName, analysis);
      } else {
        recommendation = 'stop';
        alternatives = this.suggestAlternatives(activityName, analysis);
      }

      return {
        activityName,
        recommendation,
        reasoning,
        alignment: score,
        alternatives
      };
    });

    return evaluations;
  }

  /**
   * Generate personalized "Actions for Parents" - home-based activities
   * parents can do with their child based on strengths and areas of improvement
   */
  generateParentActions(report: any, currentActivities?: string[]): ParentAction[] {
    const analysis = this.analyzeReportForRecommendations(report);
    const age = this.estimateAge(report.grade);
    const actions: ParentAction[] = [];

    console.log('Generating parent actions for improvement and strength maintenance');

    // Determine which attributes are already covered by current activities
    const coveredAttributes = new Set<string>();
    if (currentActivities && currentActivities.length > 0) {
      console.log(`Analyzing ${currentActivities.length} current activities to avoid duplicates`);
      for (const activity of currentActivities) {
        const attributes = this.inferActivityAttributes(activity);
        attributes.forEach(attr => coveredAttributes.add(attr));
      }
      console.log(`Attributes already covered by current activities:`, Array.from(coveredAttributes));
    }

    // Generate actions for areas of improvement (prioritize top 3 weak areas)
    const topWeakAreas = analysis.weakAttributes.slice(0, 3);

    for (const weakArea of topWeakAreas) {
      // Skip if this attribute is already covered by a current activity
      if (coveredAttributes.has(weakArea.toLowerCase())) {
        console.log(`Skipping parent action for ${weakArea} - already covered by current activities`);
        continue;
      }

      const action = this.getImprovementAction(weakArea, age, report);
      if (action) {
        actions.push(action);
      }
    }

    // Generate actions to maintain strengths (top 2 strong areas)
    const topStrongAreas = analysis.strongAttributes.slice(0, 2);

    for (const strongArea of topStrongAreas) {
      // Skip if this attribute is already covered by a current activity
      if (coveredAttributes.has(strongArea.toLowerCase())) {
        console.log(`Skipping parent action for ${strongArea} - already covered by current activities`);
        continue;
      }

      const action = this.getStrengthMaintenanceAction(strongArea, age, report);
      if (action) {
        actions.push(action);
      }
    }

    // Add general foundational activities based on age (if not too many activities already)
    const foundationalAction = this.getFoundationalAction(age, analysis);
    if (foundationalAction && actions.length < 5) {
      actions.push(foundationalAction);
    }

    // Sort by priority (HIGH > MEDIUM > LOW)
    actions.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return actions;
  }

  /**
   * Get improvement action for a specific weak attribute
   */
  private getImprovementAction(attribute: string, age: number, report: any): ParentAction | null {
    const actionMap: { [key: string]: () => ParentAction } = {
      'Communicator': () => ({
        category: 'improvement',
        targetArea: 'Communication Skills',
        priority: 'HIGH',
        title: 'Build Communication & Expression',
        description: 'Help your child express thoughts clearly and confidently through daily conversations and storytelling.',
        activities: [
          {
            activity: 'Daily Story Time Discussion',
            frequency: 'Every day',
            duration: '15-20 minutes',
            tips: [
              'Ask open-ended questions: "What do you think happened next?" or "How did that make you feel?"',
              'Encourage detailed descriptions: "Tell me more about..."',
              'Practice active listening - make eye contact and respond thoughtfully',
              'Let them retell their day at dinner time'
            ]
          },
          {
            activity: 'Show and Tell Practice',
            frequency: '2-3 times per week',
            duration: '10-15 minutes',
            tips: [
              'Have them choose a toy or object and describe it to family members',
              'Practice speaking clearly and in complete sentences',
              'Encourage them to explain "why" they chose that item',
              'Praise specific efforts: "I loved how you explained that!"'
            ]
          },
          {
            activity: 'Family Conversation Time',
            frequency: 'Daily at meals',
            duration: '15-30 minutes',
            tips: [
              'Turn off TV/devices during meals',
              'Ask about their opinions on age-appropriate topics',
              'Model good communication by sharing your own day',
              'Practice turn-taking in conversations'
            ]
          }
        ],
        expectedOutcome: 'Improved ability to express thoughts clearly, increased confidence in speaking, better vocabulary and sentence structure.',
        timeToSeeResults: '4-6 weeks of consistent practice'
      }),

      'Inquirer': () => ({
        category: 'improvement',
        targetArea: 'Curiosity & Questioning Skills',
        priority: 'HIGH',
        title: 'Foster Natural Curiosity',
        description: 'Encourage questioning, exploration, and discovery through everyday experiences.',
        activities: [
          {
            activity: 'Wonder Questions',
            frequency: 'Daily',
            duration: '10-15 minutes',
            tips: [
              'Start questions with "I wonder..." and explore answers together',
              'Examples: "I wonder why the sky is blue?" "I wonder how birds fly?"',
              'Look up answers together in books or online (age-appropriate sources)',
              'Encourage them to ask their own "I wonder" questions'
            ]
          },
          {
            activity: 'Nature Observation',
            frequency: '2-3 times per week',
            duration: '20-30 minutes',
            tips: [
              'Go on backyard or neighborhood "discovery walks"',
              'Observe insects, plants, clouds, or seasonal changes',
              'Ask: "What do you notice?" "What\'s different from yesterday?"',
              'Keep a simple nature journal with drawings and observations'
            ]
          },
          {
            activity: 'Kitchen Science Experiments',
            frequency: 'Once a week',
            duration: '30 minutes',
            tips: [
              'Simple experiments: mixing baking soda and vinegar, making slime, floating vs sinking objects',
              'Ask predictions: "What do you think will happen?"',
              'Discuss results: "Why did that happen?"',
              'Let them lead the experimentation'
            ]
          }
        ],
        expectedOutcome: 'Increased curiosity, more frequent questioning, better observation skills, and natural desire to learn.',
        timeToSeeResults: '3-5 weeks'
      }),

      'Knowledgeable': () => ({
        category: 'improvement',
        targetArea: 'Knowledge Building',
        priority: 'HIGH',
        title: 'Expand Knowledge & Understanding',
        description: 'Build a broad knowledge base through reading, conversations, and exploration of diverse topics.',
        activities: [
          {
            activity: 'Daily Reading Together',
            frequency: 'Every day',
            duration: '20-30 minutes',
            tips: [
              'Read age-appropriate books on various topics (animals, space, cultures, history)',
              'Visit library weekly and let child choose books',
              'Discuss what you read: "What did you learn today?"',
              'Connect books to real life: "Remember when we saw..."'
            ]
          },
          {
            activity: 'Educational Videos & Discussions',
            frequency: '3-4 times per week',
            duration: '15-20 minutes',
            tips: [
              'Watch age-appropriate educational content (nature documentaries, how things work)',
              'Discuss afterward: "What was the most interesting part?"',
              'Follow up with related books or activities',
              'Limit screen time but make it educational'
            ]
          },
          {
            activity: 'Topic of the Week',
            frequency: 'Weekly theme',
            duration: 'Ongoing',
            tips: [
              'Choose a topic together (e.g., dinosaurs, ocean, space)',
              'Find 3-4 books, videos, or activities about that topic',
              'Visit related places if possible (museum, aquarium, planetarium)',
              'Let child become the "expert" and teach others'
            ]
          }
        ],
        expectedOutcome: 'Broader general knowledge, better retention of information, increased vocabulary, and confidence in discussions.',
        timeToSeeResults: '6-8 weeks'
      }),

      'Thinker': () => ({
        category: 'improvement',
        targetArea: 'Critical Thinking & Problem Solving',
        priority: 'HIGH',
        title: 'Develop Problem-Solving Skills',
        description: 'Strengthen critical thinking through puzzles, open-ended questions, and real-world problem solving.',
        activities: [
          {
            activity: 'Puzzle Time',
            frequency: '4-5 times per week',
            duration: '15-20 minutes',
            tips: [
              'Age-appropriate jigsaw puzzles, logic puzzles, or mazes',
              'Start with easier puzzles and gradually increase difficulty',
              'Encourage persistence: "What could you try next?"',
              'Celebrate effort, not just completion'
            ]
          },
          {
            activity: 'Problem-Solving Discussions',
            frequency: 'Daily opportunities',
            duration: '5-10 minutes',
            tips: [
              'When problems arise, ask: "What could we do to solve this?"',
              'Brainstorm multiple solutions together',
              'Let them choose a solution and try it',
              'Reflect afterward: "Did it work? What would you do differently?"'
            ]
          },
          {
            activity: 'Building & Construction Play',
            frequency: '3-4 times per week',
            duration: '30-45 minutes',
            tips: [
              'Provide blocks, LEGO, cardboard boxes, or craft materials',
              'Set challenges: "Can you build a bridge?" "Make a house for this toy"',
              'Encourage planning: "What will you build? How?"',
              'Let them experiment and fail - it\'s part of learning'
            ]
          }
        ],
        expectedOutcome: 'Better problem-solving skills, increased persistence, logical thinking development, and creative solution-finding.',
        timeToSeeResults: '5-7 weeks'
      }),

      'Risk-taker': () => ({
        category: 'improvement',
        targetArea: 'Confidence & Risk-Taking',
        priority: 'HIGH',
        title: 'Build Confidence Through Safe Challenges',
        description: 'Help your child develop confidence by encouraging calculated risks and celebrating efforts.',
        activities: [
          {
            activity: 'Try Something New',
            frequency: 'Weekly',
            duration: 'Varies',
            tips: [
              'Each week, try one new thing together (new food, new route, new game)',
              'Model trying new things yourself',
              'Emphasize it\'s okay if they don\'t like it - trying is what matters',
              'Celebrate the courage to try: "You were so brave to try that!"'
            ]
          },
          {
            activity: 'Physical Challenges at Home',
            frequency: '3-4 times per week',
            duration: '20-30 minutes',
            tips: [
              'Set up safe obstacle courses with pillows, cushions, tape lines',
              'Encourage trying slightly challenging physical activities',
              'Provide spotting/support but let them do it themselves',
              'Focus on effort: "You tried even though it was hard!"'
            ]
          },
          {
            activity: 'Mistake Celebration',
            frequency: 'Ongoing mindset',
            duration: 'Daily moments',
            tips: [
              'When they make a mistake, say: "Great! What can we learn?"',
              'Share your own mistakes and what you learned',
              'Read books about famous people who failed before succeeding',
              'Create a "Mistakes Help Us Grow" chart'
            ]
          }
        ],
        expectedOutcome: 'Increased willingness to try new things, reduced fear of failure, better resilience, and growing independence.',
        timeToSeeResults: '6-8 weeks'
      }),

      'Balanced': () => ({
        category: 'improvement',
        targetArea: 'Balance & Well-being',
        priority: 'MEDIUM',
        title: 'Promote Healthy Balance',
        description: 'Help your child develop physical, emotional, and mental balance through varied activities and self-awareness.',
        activities: [
          {
            activity: 'Daily Movement Time',
            frequency: 'Every day',
            duration: '30-60 minutes',
            tips: [
              'Mix of active play (running, jumping, dancing) and calm activities',
              'Get outside whenever possible',
              'Practice balance activities: walking on lines, yoga poses, standing on one foot',
              'Make it fun, not forced'
            ]
          },
          {
            activity: 'Mindful Moments',
            frequency: 'Daily',
            duration: '5-10 minutes',
            tips: [
              'Practice deep breathing together before bed',
              'Body awareness: "How does your body feel right now?"',
              'Gratitude practice: Share 3 things you\'re grateful for',
              'Use calming activities when needed (drawing, quiet music)'
            ]
          },
          {
            activity: 'Routine & Rest',
            frequency: 'Daily structure',
            duration: 'Consistent schedule',
            tips: [
              'Maintain consistent sleep schedule (age-appropriate bedtime)',
              'Balance active time with quiet time',
              'Create predictable routines for mornings and evenings',
              'Teach the importance of rest and recovery'
            ]
          }
        ],
        expectedOutcome: 'Better physical coordination, improved emotional regulation, healthier habits, and overall well-being.',
        timeToSeeResults: '4-6 weeks'
      }),

      'Reflective': () => ({
        category: 'improvement',
        targetArea: 'Self-Reflection & Awareness',
        priority: 'MEDIUM',
        title: 'Encourage Thoughtful Reflection',
        description: 'Develop your child\'s ability to think about their own learning, feelings, and experiences.',
        activities: [
          {
            activity: 'Daily Reflection Time',
            frequency: 'Every evening',
            duration: '10-15 minutes',
            tips: [
              'Ask: "What made you happy today?" "What was challenging?"',
              'Discuss: "What did you learn today?"',
              'Reflect on emotions: "How did you feel when that happened?"',
              'Keep it light and conversational, not like an interview'
            ]
          },
          {
            activity: 'Feeling Check-ins',
            frequency: 'Multiple times daily',
            duration: '2-3 minutes',
            tips: [
              'Use feelings chart or emotions wheel',
              'Ask: "How are you feeling right now?"',
              'Validate feelings: "It\'s okay to feel..."',
              'Help name complex emotions'
            ]
          },
          {
            activity: 'Journal or Drawing Time',
            frequency: '3-4 times per week',
            duration: '15-20 minutes',
            tips: [
              'Let them draw or write about their day (age-appropriate)',
              'No pressure - it\'s their space to express',
              'Younger kids can draw and narrate while you write',
              'Review together if they want to share'
            ]
          }
        ],
        expectedOutcome: 'Better self-awareness, improved emotional intelligence, stronger ability to think about thinking (metacognition).',
        timeToSeeResults: '5-7 weeks'
      }),

      'Caring': () => ({
        category: 'improvement',
        targetArea: 'Empathy & Compassion',
        priority: 'MEDIUM',
        title: 'Nurture Empathy & Kindness',
        description: 'Develop compassion and caring through modeling, discussion, and acts of kindness.',
        activities: [
          {
            activity: 'Acts of Kindness',
            frequency: 'Daily opportunities',
            duration: '5-10 minutes',
            tips: [
              'Look for chances to help others (holding doors, helping siblings)',
              'Practice at home: set table, help with chores, comfort sad family member',
              'Point out when they\'re being kind: "That was thoughtful!"',
              'Discuss how kindness makes people feel'
            ]
          },
          {
            activity: 'Empathy Discussions',
            frequency: 'Daily moments',
            duration: '5 minutes',
            tips: [
              'When reading stories, ask: "How do you think they felt?"',
              'Observe others: "Look at that person\'s face - what might they be feeling?"',
              'Relate to their experiences: "Remember when you felt sad like that?"',
              'Model empathy in your own reactions'
            ]
          },
          {
            activity: 'Care for Living Things',
            frequency: 'Daily',
            duration: '10-15 minutes',
            tips: [
              'Water plants together, feed pets, care for garden',
              'Discuss needs: "What does this plant need to grow?"',
              'Teach responsibility and nurturing',
              'Celebrate when things thrive under their care'
            ]
          }
        ],
        expectedOutcome: 'Increased empathy, more frequent acts of kindness, better understanding of others\' feelings, and compassionate behavior.',
        timeToSeeResults: '6-8 weeks'
      }),

      'Principled': () => ({
        category: 'improvement',
        targetArea: 'Integrity & Responsibility',
        priority: 'MEDIUM',
        title: 'Build Strong Values',
        description: 'Help your child understand right from wrong and develop a sense of responsibility.',
        activities: [
          {
            activity: 'Family Values Discussion',
            frequency: 'Weekly',
            duration: '10-15 minutes',
            tips: [
              'Discuss what\'s important: honesty, fairness, responsibility',
              'Use real-life examples: "Was that fair? Why or why not?"',
              'Read stories that explore moral themes',
              'Let them explain their reasoning'
            ]
          },
          {
            activity: 'Age-Appropriate Responsibilities',
            frequency: 'Daily',
            duration: 'Integrated into routine',
            tips: [
              'Assign simple chores (put away toys, set table, feed pet)',
              'Follow through consistently - responsibilities matter',
              'Natural consequences when not done: toys not put away stay out of reach',
              'Praise responsibility: "You remembered without being asked!"'
            ]
          },
          {
            activity: 'Honesty Practice',
            frequency: 'Ongoing mindset',
            duration: 'Daily moments',
            tips: [
              'Model honesty in your own behavior',
              'When they tell truth about mistake: "Thank you for being honest"',
              'Make it safe to tell the truth - don\'t punish honesty',
              'Discuss why honesty matters'
            ]
          }
        ],
        expectedOutcome: 'Stronger sense of right and wrong, increased responsibility, better integrity, and trustworthy behavior.',
        timeToSeeResults: '8-10 weeks (values take time)'
      }),

      'Open-minded': () => ({
        category: 'improvement',
        targetArea: 'Open-mindedness & Perspective-Taking',
        priority: 'MEDIUM',
        title: 'Expand Perspectives',
        description: 'Help your child appreciate different viewpoints, cultures, and ways of thinking.',
        activities: [
          {
            activity: 'Cultural Exploration',
            frequency: '2-3 times per week',
            duration: '20-30 minutes',
            tips: [
              'Read books about different cultures and traditions',
              'Try foods from different countries',
              'Listen to music from around the world',
              'Celebrate different holidays (learn about them)'
            ]
          },
          {
            activity: 'Different Perspectives',
            frequency: 'Daily opportunities',
            duration: '5-10 minutes',
            tips: [
              'When disagreements happen: "Let\'s hear both sides"',
              'Ask: "How might they see it differently?"',
              'Role-play different viewpoints',
              'Model changing your mind: "You\'re right, I didn\'t think of it that way"'
            ]
          },
          {
            activity: 'Try New Things Together',
            frequency: 'Weekly',
            duration: 'Varies',
            tips: [
              'New foods, new routes, new activities, new games',
              'Model openness: "Let\'s try it and see what happens"',
              'Discuss what you liked or didn\'t like',
              'Emphasize learning from new experiences'
            ]
          }
        ],
        expectedOutcome: 'Greater appreciation for diversity, willingness to try new things, better ability to see multiple perspectives.',
        timeToSeeResults: '6-8 weeks'
      })
    };

    return actionMap[attribute] ? actionMap[attribute]() : null;
  }

  /**
   * Get action to maintain and celebrate a strength
   */
  private getStrengthMaintenanceAction(attribute: string, age: number, report: any): ParentAction | null {
    // Simplified strength maintenance - just acknowledge and encourage continued practice
    const attributeDescriptions: { [key: string]: string } = {
      'Communicator': 'communication and expression',
      'Inquirer': 'curiosity and questioning',
      'Knowledgeable': 'knowledge and learning',
      'Thinker': 'critical thinking',
      'Risk-taker': 'confidence and courage',
      'Balanced': 'balance and well-being',
      'Reflective': 'self-reflection',
      'Caring': 'empathy and kindness',
      'Principled': 'integrity and responsibility',
      'Open-minded': 'open-mindedness'
    };

    if (!attributeDescriptions[attribute]) return null;

    return {
      category: 'strength-maintenance',
      targetArea: attributeDescriptions[attribute],
      priority: 'LOW',
      title: `Celebrate & Maintain: ${attribute}`,
      description: `Your child shows strength in ${attributeDescriptions[attribute]}. Continue to nurture this through encouragement and opportunities.`,
      activities: [
        {
          activity: 'Recognize and Praise',
          frequency: 'When you notice it',
          duration: '1-2 minutes',
          tips: [
            `Point out when they demonstrate ${attribute} qualities`,
            'Be specific: "I noticed how you..." instead of generic praise',
            'Let them know you value this strength',
            'Share examples with other family members'
          ]
        },
        {
          activity: 'Provide Opportunities',
          frequency: 'Regularly',
          duration: 'Varies',
          tips: [
            `Create situations where they can use their ${attribute} strength`,
            'Let them lead in areas where they excel',
            'Challenge them to grow even stronger',
            'Connect this strength to other learning areas'
          ]
        }
      ],
      expectedOutcome: `Continued growth in ${attributeDescriptions[attribute]}, increased confidence in this area.`,
      timeToSeeResults: 'Ongoing maintenance'
    };
  }

  /**
   * Get foundational action based on age
   */
  private getFoundationalAction(age: number, analysis: any): ParentAction | null {
    if (age <= 5) {
      return {
        category: 'improvement',
        targetArea: 'Early Literacy & Numeracy',
        priority: 'HIGH',
        title: 'Build Strong Foundations',
        description: 'Essential early literacy and numeracy activities for lifelong learning success.',
        activities: [
          {
            activity: 'Daily Reading Together',
            frequency: 'Every day',
            duration: '20-30 minutes',
            tips: [
              'Read a variety of books - stories, rhymes, picture books',
              'Point to words as you read',
              'Ask questions about the story',
              'Let them "read" to you by describing pictures'
            ]
          },
          {
            activity: 'Letter & Number Recognition',
            frequency: '3-4 times per week',
            duration: '10-15 minutes',
            tips: [
              'Point out letters in environment (signs, labels)',
              'Practice writing name',
              'Count everyday objects (toys, stairs, snacks)',
              'Sing alphabet and number songs'
            ]
          },
          {
            activity: 'Fine Motor Practice',
            frequency: 'Daily',
            duration: '15-20 minutes',
            tips: [
              'Drawing, coloring, tracing',
              'Playdough, beads, building blocks',
              'Cutting with safety scissors',
              'These skills support writing readiness'
            ]
          }
        ],
        expectedOutcome: 'Strong pre-reading and pre-math skills, better fine motor control, school readiness.',
        timeToSeeResults: '6-8 weeks'
      };
    } else if (age <= 10) {
      return {
        category: 'improvement',
        targetArea: 'Reading & Writing Skills',
        priority: 'HIGH',
        title: 'Strengthen Core Literacy',
        description: 'Build strong reading and writing habits for academic success.',
        activities: [
          {
            activity: 'Independent Reading Time',
            frequency: 'Every day',
            duration: '20-30 minutes',
            tips: [
              'Create a cozy reading spot',
              'Let them choose books at their level',
              'Visit library weekly',
              'Discuss what they\'re reading'
            ]
          },
          {
            activity: 'Writing Practice',
            frequency: '4-5 times per week',
            duration: '15-20 minutes',
            tips: [
              'Keep a simple journal or diary',
              'Write letters to family members',
              'Create stories or comic books',
              'Focus on expression, not perfect spelling at first'
            ]
          },
          {
            activity: 'Word Games & Puzzles',
            frequency: '3 times per week',
            duration: '15 minutes',
            tips: [
              'Play word games (Scrabble Junior, Boggle, rhyming games)',
              'Do crossword puzzles together',
              'Make word searches',
              'Practice spelling through fun activities'
            ]
          }
        ],
        expectedOutcome: 'Improved reading fluency, better writing skills, larger vocabulary, and love of reading.',
        timeToSeeResults: '8-10 weeks'
      };
    }

    return null;
  }

  /**
   * Infer what IB learner profile attributes an activity develops
   */
  private inferActivityAttributes(activityName: string): string[] {
    const name = activityName.toLowerCase();
    const attributes: string[] = [];

    // Physical/Sports activities
    if (
      name.includes('sport') ||
      name.includes('soccer') ||
      name.includes('basketball') ||
      name.includes('swim') ||
      name.includes('gymnastics') ||
      name.includes('dance') ||
      name.includes('karate') ||
      name.includes('tennis') ||
      name.includes('yoga')
    ) {
      attributes.push('risk-taker', 'balanced', 'principled');
    }

    // Arts/Creative activities
    if (
      name.includes('art') ||
      name.includes('music') ||
      name.includes('piano') ||
      name.includes('guitar') ||
      name.includes('paint') ||
      name.includes('draw') ||
      name.includes('theater') ||
      name.includes('drama')
    ) {
      attributes.push('communicator', 'open-minded', 'reflective', 'risk-taker');
    }

    // Language activities
    if (
      name.includes('language') ||
      name.includes('spanish') ||
      name.includes('french') ||
      name.includes('mandarin') ||
      name.includes('english') ||
      name.includes('reading')
    ) {
      attributes.push('communicator', 'open-minded', 'knowledgeable');
    }

    // STEM activities
    if (
      name.includes('science') ||
      name.includes('math') ||
      name.includes('coding') ||
      name.includes('robot') ||
      name.includes('engineering') ||
      name.includes('lego') ||
      name.includes('stem')
    ) {
      attributes.push('inquirer', 'knowledgeable', 'thinker');
    }

    // Social/Community activities
    if (
      name.includes('volunteer') ||
      name.includes('community') ||
      name.includes('scout') ||
      name.includes('club')
    ) {
      attributes.push('caring', 'principled', 'communicator', 'open-minded');
    }

    // Mindfulness/Reflection activities
    if (
      name.includes('meditation') ||
      name.includes('mindfulness') ||
      name.includes('journal')
    ) {
      attributes.push('reflective', 'balanced', 'caring');
    }

    // If no specific match, assign general attributes
    if (attributes.length === 0) {
      attributes.push('balanced', 'knowledgeable');
    }

    return attributes;
  }

  /**
   * Calculate how well an activity aligns with the child's needs
   */
  private calculateActivityAlignment(
    activityAttributes: string[],
    analysis: { weakAttributes: string[]; strongAttributes: string[] },
    activityName: string
  ): { score: number; reasoning: string } {
    let score = 30; // Base score - every activity has some value
    const reasons: string[] = [];

    const activityAttrsLower = activityAttributes.map(a => a.toLowerCase());

    // Check if activity addresses weaknesses (highest priority)
    let addressesWeaknesses = 0;
    analysis.weakAttributes.forEach(weakAttr => {
      if (activityAttrsLower.some(attr =>
        attr.includes(weakAttr.toLowerCase()) || weakAttr.toLowerCase().includes(attr)
      )) {
        score += 25; // Significant bonus for addressing weakness
        addressesWeaknesses++;
      }
    });

    if (addressesWeaknesses > 0) {
      reasons.push(`addresses ${addressesWeaknesses} area${addressesWeaknesses > 1 ? 's' : ''} needing development (${analysis.weakAttributes.slice(0, 3).join(', ')})`);
    }

    // Check if activity reinforces strengths (medium priority)
    let reinforcesStrengths = 0;
    analysis.strongAttributes.forEach(strongAttr => {
      if (activityAttrsLower.some(attr =>
        attr.includes(strongAttr.toLowerCase()) || strongAttr.toLowerCase().includes(attr)
      )) {
        score += 15; // Medium bonus for reinforcing strength
        reinforcesStrengths++;
      }
    });

    if (reinforcesStrengths > 0) {
      reasons.push(`reinforces existing strengths in ${analysis.strongAttributes.slice(0, 2).join(' and ')}`);
    }

    // Determine overall recommendation reasoning
    let reasoning = `${activityName} `;

    if (score >= 60) {
      reasoning += `is well-aligned with your child's development needs. It ${reasons.join(' and ')}. This is a valuable activity to continue.`;
    } else if (score >= 30) {
      if (addressesWeaknesses === 0 && reinforcesStrengths === 0) {
        reasoning += `has limited alignment with current development priorities. While not harmful, it doesn't specifically target areas needing attention (${analysis.weakAttributes.slice(0, 2).join(', ')}) or build on strengths (${analysis.strongAttributes.slice(0, 2).join(', ')}). Consider whether this is the best use of time and resources.`;
      } else if (addressesWeaknesses === 0) {
        reasoning += `primarily ${reasons.join(' but ')}. Consider balancing this with activities that address areas needing development like ${analysis.weakAttributes.slice(0, 2).join(' and ')}.`;
      } else {
        reasoning += `shows moderate alignment. It ${reasons.join(' and ')}, but there may be more targeted options available.`;
      }
    } else {
      reasoning += `has minimal alignment with your child's current development needs. It doesn't address key areas needing attention (${analysis.weakAttributes.slice(0, 2).join(', ')}) and may not be the most beneficial use of time. Consider replacing with activities more aligned with developmental goals.`;
    }

    // Cap score at 100
    score = Math.min(100, score);

    return { score, reasoning };
  }

  /**
   * Suggest alternative activities that better align with needs
   */
  private suggestAlternatives(
    currentActivity: string,
    analysis: { weakAttributes: string[]; strongAttributes: string[] }
  ): string[] {
    const alternatives: string[] = [];

    // Suggest activities based on top weaknesses
    const topWeaknesses = analysis.weakAttributes.slice(0, 3);

    topWeaknesses.forEach(weakness => {
      const weaknessLower = weakness.toLowerCase();

      if (weaknessLower.includes('risk-taker') || weaknessLower.includes('risk taker')) {
        alternatives.push('Swimming lessons or Gymnastics to build confidence in new challenges');
      }

      if (weaknessLower.includes('open-minded') || weaknessLower.includes('open minded')) {
        alternatives.push('World Music & Movement or Language Immersion classes');
      }

      if (weaknessLower.includes('inquirer')) {
        alternatives.push('Science Exploration Club or Nature & Outdoor Exploration');
      }

      if (weaknessLower.includes('knowledgeable')) {
        alternatives.push('STEM activities or Cross-disciplinary learning programs');
      }

      if (weaknessLower.includes('reflective')) {
        alternatives.push('Kids Yoga & Mindfulness or Art Therapy');
      }

      if (weaknessLower.includes('communicator')) {
        alternatives.push('Creative Drama/Theater Arts or Language classes');
      }

      if (weaknessLower.includes('caring')) {
        alternatives.push('Community service projects or Team sports');
      }
    });

    // Remove duplicates and limit to top 3
    return [...new Set(alternatives)].slice(0, 3);
  }

  /**
   * Analyze report to extract strengths and areas needing improvement
   * Now extracts directly from IB Learner Profile Attributes with strength categorization
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

    // PRIMARY SOURCE: IB Learner Profile Attributes from report
    if (report.learnerProfileAttributes && report.learnerProfileAttributes.length > 0) {
      // Keywords to categorize strength levels
      const strengthKeywords = [
        'excellent', 'strong', 'consistently', 'always', 'demonstrates well',
        'exceptional', 'outstanding', 'impressive', 'highly', 'very well',
        'effectively', 'confidently', 'proficient', 'mastery', 'excels'
      ];

      const developingKeywords = [
        'developing', 'sometimes', 'occasionally', 'beginning to', 'needs',
        'should', 'could improve', 'working on', 'learning to', 'emerging',
        'inconsistent', 'requires support', 'struggles', 'difficulty'
      ];

      report.learnerProfileAttributes.forEach((attr: any) => {
        const attributeName = attr.attribute.toLowerCase();
        const evidence = (attr.evidence || '').toLowerCase();

        // Categorize based on evidence keywords
        const hasStrengthIndicators = strengthKeywords.some(keyword => evidence.includes(keyword));
        const hasDevelopingIndicators = developingKeywords.some(keyword => evidence.includes(keyword));

        if (hasStrengthIndicators && !hasDevelopingIndicators) {
          // This is a strength
          if (!analysis.strongAttributes.includes(attributeName)) {
            analysis.strongAttributes.push(attributeName);
          }
        } else if (hasDevelopingIndicators || !hasStrengthIndicators) {
          // This needs work (either explicitly developing or neutral/no clear strength)
          if (!analysis.weakAttributes.includes(attributeName)) {
            analysis.weakAttributes.push(attributeName);
          }
        }
      });

      console.log('IB Attributes Analysis:', {
        total: report.learnerProfileAttributes.length,
        strong: analysis.strongAttributes,
        developing: analysis.weakAttributes
      });
    }

    // SECONDARY SOURCE: AI-generated summary (for additional context)
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
   * Ensures a good mix of sports/physical activities and other categories
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
    let hasSportsActivity = false;
    let indoorCount = 0;
    let outdoorCount = 0;

    // Track indoor/outdoor counts
    const trackActivityType = (activity: ActivityRecommendation) => {
      if (activity.activityType === 'indoor') {
        indoorCount++;
      } else if (activity.activityType === 'outdoor') {
        outdoorCount++;
      } else if (activity.activityType === 'both') {
        // Count 'both' as half indoor and half outdoor
        indoorCount += 0.5;
        outdoorCount += 0.5;
      }
    };

    // Priority 0: Ensure at least ONE physical/sports activity for balanced development
    const physicalCategories = ['Physical Development', 'Physical', 'Sports'];
    const physicalActivities = scoredActivities.filter(sa =>
      physicalCategories.some(cat => sa.activity.category.includes(cat))
    );

    if (physicalActivities.length > 0 && selected.length < maxActivities) {
      // Select highest-scored physical activity
      const bestPhysical = physicalActivities[0];
      const weaknesses = bestPhysical.activity.targetAttributes
        .map(a => a.toLowerCase())
        .filter(a => analysis.weakAttributes.some(w => a.includes(w) || w.includes(a)));

      const enrichedActivity = {
        ...bestPhysical.activity,
        recommendationType: weaknesses.length > 0 ? 'improvement' as const : 'age-based' as const,
        targetedAttributes: weaknesses.length > 0 ? weaknesses : []
      };

      selected.push(enrichedActivity);
      usedCategories.add(bestPhysical.activity.category);
      hasSportsActivity = true;
      trackActivityType(enrichedActivity);
      weaknesses.forEach(w => addressedWeakAttributes.add(w));

      console.log(`Added physical activity: ${bestPhysical.activity.name} (${enrichedActivity.activityType})`);
    }

    // Priority 1: Ensure we address the top 2-3 weaknesses with indoor/outdoor balance
    const topWeaknesses = analysis.weakAttributes.slice(0, 3);

    for (const activity of scoredActivities) {
      if (selected.length >= maxActivities) break;
      if (selected.some(a => a.id === activity.activity.id)) continue;

      const activityWeaknesses = activity.activity.targetAttributes
        .map(a => a.toLowerCase())
        .filter(a => topWeaknesses.some(w => a.includes(w) || w.includes(a)));

      // Select if it addresses an unaddressed weakness
      if (activityWeaknesses.length > 0) {
        const hasNewWeakness = activityWeaknesses.some(w =>
          !Array.from(addressedWeakAttributes).some(aw => w.includes(aw) || aw.includes(w))
        );

        if (hasNewWeakness) {
          // Consider indoor/outdoor balance when selecting
          const needsMoreOutdoor = outdoorCount < 1 && selected.length >= 2;
          const needsMoreIndoor = indoorCount < 1 && selected.length >= 2;

          // Prefer outdoor if we need it and this is outdoor
          if (needsMoreOutdoor && activity.activity.activityType !== 'indoor') {
            const enrichedActivity = {
              ...activity.activity,
              recommendationType: 'improvement' as const,
              targetedAttributes: activityWeaknesses
            };
            selected.push(enrichedActivity);
            usedCategories.add(activity.activity.category);
            trackActivityType(enrichedActivity);
            activityWeaknesses.forEach(w => addressedWeakAttributes.add(w));
            continue;
          }

          // Prefer indoor if we need it and this is indoor
          if (needsMoreIndoor && activity.activity.activityType !== 'outdoor') {
            const enrichedActivity = {
              ...activity.activity,
              recommendationType: 'improvement' as const,
              targetedAttributes: activityWeaknesses
            };
            selected.push(enrichedActivity);
            usedCategories.add(activity.activity.category);
            trackActivityType(enrichedActivity);
            activityWeaknesses.forEach(w => addressedWeakAttributes.add(w));
            continue;
          }

          // If balance is fine or this helps balance, add it
          if (!needsMoreIndoor && !needsMoreOutdoor) {
            const enrichedActivity = {
              ...activity.activity,
              recommendationType: 'improvement' as const,
              targetedAttributes: activityWeaknesses
            };
            selected.push(enrichedActivity);
            usedCategories.add(activity.activity.category);
            trackActivityType(enrichedActivity);
            activityWeaknesses.forEach(w => addressedWeakAttributes.add(w));
            continue;
          }
        }
      }
    }

    // Priority 2: Add strength-reinforcing activities (max 1-2) with balance
    let strengthActivities = 0;
    for (const activity of scoredActivities) {
      if (selected.length >= maxActivities) break;
      if (strengthActivities >= 2) break;
      if (selected.some(a => a.id === activity.activity.id)) continue;

      const activityStrengths = activity.activity.targetAttributes
        .map(a => a.toLowerCase())
        .filter(a => analysis.strongAttributes.some(s => a.includes(s) || s.includes(a)));

      if (activityStrengths.length > 0 && activity.score >= 40) {
        // Add metadata about why this was recommended
        const enrichedActivity = {
          ...activity.activity,
          recommendationType: 'strength' as const,
          targetedAttributes: activityStrengths
        };
        selected.push(enrichedActivity);
        usedCategories.add(activity.activity.category);
        trackActivityType(enrichedActivity);
        strengthActivities++;
      }
    }

    // Priority 3: Fill to minimum with highest-scored diverse activities
    // Prefer different categories for a well-rounded program
    // Also ensure indoor/outdoor balance
    for (const activity of scoredActivities) {
      if (selected.length >= minActivities) break;
      if (selected.some(a => a.id === activity.activity.id)) continue;

      // Check if we need specific indoor/outdoor to balance
      const needsOutdoor = outdoorCount === 0 && selected.length >= 2;
      const needsIndoor = indoorCount === 0 && selected.length >= 2;

      // Prefer activities that help balance
      if (needsOutdoor && activity.activity.activityType === 'outdoor') {
        const enrichedActivity = {
          ...activity.activity,
          recommendationType: 'age-based' as const,
          targetedAttributes: []
        };
        selected.push(enrichedActivity);
        usedCategories.add(activity.activity.category);
        trackActivityType(enrichedActivity);
        continue;
      }

      if (needsIndoor && activity.activity.activityType === 'indoor') {
        const enrichedActivity = {
          ...activity.activity,
          recommendationType: 'age-based' as const,
          targetedAttributes: []
        };
        selected.push(enrichedActivity);
        usedCategories.add(activity.activity.category);
        trackActivityType(enrichedActivity);
        continue;
      }

      // Prefer different categories for diversity
      if (!usedCategories.has(activity.activity.category) || selected.length < minActivities) {
        // Add metadata about why this was recommended
        const enrichedActivity = {
          ...activity.activity,
          recommendationType: 'age-based' as const,
          targetedAttributes: []
        };
        selected.push(enrichedActivity);
        usedCategories.add(activity.activity.category);
        trackActivityType(enrichedActivity);
      }
    }

    console.log('Activity Mix Summary:', {
      total: selected.length,
      hasSports: hasSportsActivity,
      indoor: indoorCount,
      outdoor: outdoorCount,
      categories: Array.from(usedCategories),
      improvementFocus: selected.filter(a => a.recommendationType === 'improvement').length,
      strengthFocus: selected.filter(a => a.recommendationType === 'strength').length
    });

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
        estimatedCostUSD: { min: 100, max: 150 },
        activityType: 'indoor',
        ageAppropriate: true,
        whyRecommended: 'Directly addresses risk-taking development in a structured, safe environment. Most critical for IB learner profile growth.',
        regionalSuitability: {
          climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
          requiresCoastal: false
        }
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
        estimatedCostUSD: { min: 80, max: 150 },
        activityType: 'indoor',
        ageAppropriate: true,
        whyRecommended: 'Essential life skill that naturally develops risk-taking and confidence. Safe environment for facing fears.',
        regionalSuitability: {
          climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
          requiresCoastal: false
        }
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
        estimatedCostUSD: { min: 60, max: 120 },
        activityType: 'outdoor',
        ageAppropriate: true,
        whyRecommended: 'Variety keeps engagement high while developing multiple physical competencies and risk-taking in a team environment.',
        regionalSuitability: {
          climatePreference: ['tropical', 'subtropical', 'temperate'],
          requiresCoastal: false
        }
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
      estimatedCostUSD: { min: 60, max: 100 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Directly develops open-minded attribute through joyful, engaging cultural exposure. Leverages existing communication strengths.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 80, max: 150 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'IB values multilingualism highly. Builds on existing language strengths while developing cultural awareness.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 60, max: 120 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Combines artistic strength with cultural learning. Develops open-minded perspective through narrative and art.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 60, max: 120 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Addresses need for cross-disciplinary knowledge. Develops inquiry skills essential for IB learning.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 40, max: 80 },
      activityType: 'outdoor',
      ageAppropriate: true,
      whyRecommended: 'Combines inquiry, knowledge, and caring attributes. Addresses need for engagement with local/global issues.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 60, max: 120 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Develops critical thinking and problem-solving. Natural risk-taking through building and testing.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 40, max: 80 },
      activityType: 'both',
      ageAppropriate: true,
      whyRecommended: 'Directly develops reflective attribute. Can be practiced at home for sustained impact.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
      estimatedCostUSD: { min: 80, max: 150 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Leverages artistic strength for emotional development. Supports reflective thinking about self.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
    });

    return activities;
  }

  /**
   * Get at-home activities that don't require formal classes or tutors
   */
  private getAtHomeActivities(ageGroup: string, age: number): ActivityRecommendation[] {
    const activities: ActivityRecommendation[] = [];

    activities.push({
      id: 'reading-program',
      name: 'Daily Reading & Storytelling',
      category: 'At-Home Learning',
      priority: 'HIGH',
      targetAttributes: ['Knowledgeable', 'Communicator', 'Reflective', 'Open-minded'],
      description: 'Parent-guided daily reading sessions with age-appropriate books, followed by discussion and storytelling.',
      benefits: [
        'Develops language and vocabulary',
        'Builds imagination and creativity',
        'Strengthens parent-child bond',
        'Can be done anytime at home',
        'No additional cost'
      ],
      frequency: 'Daily, 20-30 minutes',
      estimatedCost: 'Free (library books) or minimal book costs',
      estimatedCostUSD: { min: 0, max: 20 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Reading is fundamental for all learning. Daily practice at home builds strong foundations without needing formal classes.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
    });

    activities.push({
      id: 'home-science',
      name: 'Kitchen Science Experiments',
      category: 'At-Home Learning',
      priority: 'HIGH',
      targetAttributes: ['Inquirer', 'Thinker', 'Knowledgeable', 'Risk-taker'],
      description: 'Simple, safe science experiments using household items (baking soda volcanoes, water density, plant growth).',
      benefits: [
        'Hands-on learning of scientific concepts',
        'Develops curiosity and inquiry',
        'Uses readily available materials',
        'Parent can supervise and guide',
        'Makes learning fun'
      ],
      frequency: '2-3 times per week, 30-45 minutes',
      estimatedCost: 'Minimal (household items)',
      estimatedCostUSD: { min: 0, max: 15 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Develops scientific thinking through play. Parents can easily guide these activities using online resources.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
    });

    activities.push({
      id: 'creative-play',
      name: 'Creative Arts & Crafts',
      category: 'At-Home Learning',
      priority: 'MEDIUM',
      targetAttributes: ['Communicator', 'Risk-taker', 'Reflective', 'Balanced'],
      description: 'Open-ended art projects using basic supplies (drawing, painting, clay, collage, building with recycled materials).',
      benefits: [
        'Develops fine motor skills',
        'Encourages creative expression',
        'Low-cost materials',
        'Therapeutic and relaxing',
        'Builds confidence through creation'
      ],
      frequency: '3-4 times per week, 30-60 minutes',
      estimatedCost: 'Minimal art supplies',
      estimatedCostUSD: { min: 10, max: 30 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Art provides emotional expression and builds creativity. No formal instruction needed - let the child explore freely.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
    });

    if (age >= 4) {
      activities.push({
        id: 'outdoor-play',
        name: 'Unstructured Outdoor Play',
        category: 'At-Home Learning',
        priority: 'HIGH',
        targetAttributes: ['Risk-taker', 'Balanced', 'Caring', 'Principled'],
        description: 'Daily outdoor playtime in park, garden, or yard - running, climbing, exploring nature, playing with neighbors.',
        benefits: [
          'Physical development and health',
          'Social interaction with peers',
          'Risk assessment and independence',
          'Connection with nature',
          'Free activity'
        ],
        frequency: 'Daily, 60-90 minutes',
        estimatedCost: 'Free',
        estimatedCostUSD: { min: 0, max: 0 },
        activityType: 'outdoor',
        ageAppropriate: true,
        whyRecommended: 'Free play is essential for holistic development. Children learn social skills, physical coordination, and independence through play.',
        regionalSuitability: {
          climatePreference: ['tropical', 'subtropical', 'temperate'],
          requiresCoastal: false
        }
      });
    }

    activities.push({
      id: 'family-projects',
      name: 'Family Projects & Chores',
      category: 'At-Home Learning',
      priority: 'MEDIUM',
      targetAttributes: ['Principled', 'Caring', 'Balanced', 'Thinker'],
      description: 'Age-appropriate household responsibilities and family projects (cooking together, gardening, organizing, repairs).',
      benefits: [
        'Teaches responsibility and life skills',
        'Builds self-reliance',
        'Strengthens family bonds',
        'Real-world problem solving',
        'Sense of contribution'
      ],
      frequency: 'Daily tasks + weekly projects',
      estimatedCost: 'Free',
      estimatedCostUSD: { min: 0, max: 0 },
      activityType: 'both',
      ageAppropriate: true,
      whyRecommended: 'Involving children in family life builds character, responsibility, and practical skills that formal classes cannot teach.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
    });

    activities.push({
      id: 'music-dance-home',
      name: 'Music & Dance at Home',
      category: 'At-Home Learning',
      priority: 'MEDIUM',
      targetAttributes: ['Communicator', 'Balanced', 'Risk-taker', 'Open-minded'],
      description: 'Playing music from different cultures, dancing freely, singing songs, making simple instruments.',
      benefits: [
        'Cultural exposure through music',
        'Physical coordination and rhythm',
        'Emotional expression',
        'Can use streaming services',
        'Family bonding activity'
      ],
      frequency: '3-4 times per week, 20-40 minutes',
      estimatedCost: 'Free (streaming services)',
      estimatedCostUSD: { min: 0, max: 10 },
      activityType: 'indoor',
      ageAppropriate: true,
      whyRecommended: 'Music and movement are naturally engaging. Exposure to diverse music builds cultural awareness without formal lessons.',
      regionalSuitability: {
        climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
        requiresCoastal: false
      }
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
        estimatedCostUSD: { min: 60, max: 120 },
        activityType: 'indoor',
        ageAppropriate: true,
        whyRecommended: 'Builds on existing communication excellence while developing risk-taking and open-mindedness.',
        regionalSuitability: {
          climatePreference: ['tropical', 'subtropical', 'temperate', 'cold', 'arid'],
          requiresCoastal: false
        }
      });
    }

    return activities;
  }

  /**
   * Calculate feasibility score for an activity based on budget and climate constraints
   */
  private calculateFeasibilityScore(
    activity: ActivityRecommendation,
    context: {
      budget?: number;
      budgetFlexibility?: string;
      climateZone?: string;
      isCoastal?: boolean;
    }
  ): { budgetMatch: number; climateMatch: number; overall: number } {
    // 1. Budget Match (0-100)
    let budgetMatch = 100;
    if (context.budget) {
      const avgCost = (activity.estimatedCostUSD.min + activity.estimatedCostUSD.max) / 2;

      if (avgCost <= context.budget) {
        budgetMatch = 100; // Within budget
      } else {
        const overage = avgCost - context.budget;
        const overagePercent = overage / context.budget;

        // Apply penalty based on flexibility
        if (context.budgetFlexibility === 'strict') {
          budgetMatch = Math.max(0, 100 - overagePercent * 200); // Heavy penalty
        } else if (context.budgetFlexibility === 'moderate') {
          budgetMatch = Math.max(20, 100 - overagePercent * 100); // Moderate penalty
        } else {
          // flexible
          budgetMatch = Math.max(50, 100 - overagePercent * 50); // Light penalty
        }
      }
    }

    // 2. Climate Match (0-100)
    let climateMatch = 100;
    if (context.climateZone && activity.regionalSuitability) {
      const { climatePreference, requiresCoastal } = activity.regionalSuitability;

      // Check climate preference
      if (climatePreference && !climatePreference.includes(context.climateZone as any)) {
        climateMatch = 40; // Penalize but don't eliminate
      }

      // Check coastal requirement
      if (requiresCoastal && !context.isCoastal) {
        climateMatch = 20; // Heavy penalty for coastal activities inland
      }
    }

    // Overall score (average)
    const overall = (budgetMatch + climateMatch) / 2;

    return { budgetMatch, climateMatch, overall };
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
