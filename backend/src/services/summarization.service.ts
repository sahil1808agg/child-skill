import OpenAI from 'openai';

export class SummarizationService {
  private openai: OpenAI | null = null;

  private getOpenAIClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  /**
   * Summarizes teacher comments into 2-3 concise sentences
   */
  async summarizeTeacherComments(comments: string): Promise<string> {
    // If comments are already short, return as-is
    if (comments.length <= 300) {
      return comments;
    }

    const openai = this.getOpenAIClient();

    if (openai) {
      try {
        return await this.summarizeWithAI(comments, openai);
      } catch (error) {
        console.error('Error summarizing with OpenAI:', error);
        return this.summarizeWithExtraction(comments);
      }
    } else {
      return this.summarizeWithExtraction(comments);
    }
  }

  /**
   * AI-powered summarization using OpenAI
   */
  private async summarizeWithAI(comments: string, openai: OpenAI): Promise<string> {
    const prompt = `Summarize the following teacher comments into 2-3 concise, clear sentences. Focus on the most important observations about the student's performance, strengths, and areas to focus on. Keep the tone positive and constructive.

Teacher Comments:
${comments}

Summary (2-3 sentences):`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    const summary = completion.choices[0].message.content?.trim() || comments;

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
}

export default new SummarizationService();
