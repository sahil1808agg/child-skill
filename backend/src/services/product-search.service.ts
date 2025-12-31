export interface ProductRecommendation {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  currency: string;
  url: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  source: 'amazon' | 'flipkart';
  ageRange?: string;
  inStock: boolean;
}

interface ProductSearchParams {
  query: string;
  ageInMonths: number;
  maxResults?: number;
}

class ProductSearchService {
  /**
   * Search for age-appropriate products for a given activity
   */
  async searchProducts(params: ProductSearchParams): Promise<ProductRecommendation[]> {
    const { query, ageInMonths, maxResults = 5 } = params;

    // Determine age category for better search results
    const ageCategory = this.getAgeCategory(ageInMonths);

    // Enhance query with age-appropriate keywords
    const enhancedQuery = `${query} for ${ageCategory}`;

    // For now, return mock product recommendations
    // In production, integrate with actual e-commerce APIs or web scraping
    return this.getMockProducts(query, ageCategory, maxResults);
  }

  /**
   * Get age category label for search queries
   */
  private getAgeCategory(ageInMonths: number): string {
    const years = Math.floor(ageInMonths / 12);

    if (years < 1) return 'babies 0-12 months';
    if (years < 2) return 'toddlers 1-2 years';
    if (years < 4) return 'toddlers 2-4 years';
    if (years < 6) return 'kids 4-6 years';
    if (years < 9) return 'kids 6-9 years';
    if (years < 13) return 'kids 9-12 years';
    return 'teens 12+ years';
  }

  /**
   * Generate mock product recommendations based on activity type
   * TODO: Replace with actual API integration
   */
  private getMockProducts(activity: string, ageCategory: string, maxResults: number): ProductRecommendation[] {
    const activityLower = activity.toLowerCase();
    const products: ProductRecommendation[] = [];

    // Product templates based on activity type
    if (activityLower.includes('puzzle')) {
      products.push(
        {
          id: 'pz1',
          name: `Age-Appropriate Jigsaw Puzzles Set for ${ageCategory}`,
          price: '₹499 - ₹999',
          priceValue: 749,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=puzzles+' + encodeURIComponent(ageCategory),
          imageUrl: undefined,
          rating: 4.5,
          reviewCount: 1250,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'pz2',
          name: `Educational Wooden Puzzle Collection`,
          price: '₹599',
          priceValue: 599,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=wooden+puzzles+' + encodeURIComponent(ageCategory),
          rating: 4.3,
          reviewCount: 850,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('lego') || activityLower.includes('building blocks')) {
      products.push(
        {
          id: 'lg1',
          name: `LEGO Building Set for ${ageCategory}`,
          price: '₹1,499 - ₹3,999',
          priceValue: 2499,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=lego+' + encodeURIComponent(ageCategory),
          rating: 4.7,
          reviewCount: 3200,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'lg2',
          name: `Building Blocks Construction Set`,
          price: '₹899',
          priceValue: 899,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=building+blocks+' + encodeURIComponent(ageCategory),
          rating: 4.4,
          reviewCount: 1500,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('book') || activityLower.includes('reading') || activityLower.includes('story')) {
      products.push(
        {
          id: 'bk1',
          name: `Age-Appropriate Story Books Collection for ${ageCategory}`,
          price: '₹299 - ₹799',
          priceValue: 499,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=books+for+' + encodeURIComponent(ageCategory),
          rating: 4.6,
          reviewCount: 2100,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'bk2',
          name: `Educational Picture Books Set`,
          price: '₹399',
          priceValue: 399,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=children+books+' + encodeURIComponent(ageCategory),
          rating: 4.5,
          reviewCount: 1800,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('art') || activityLower.includes('craft') || activityLower.includes('drawing') || activityLower.includes('coloring')) {
      products.push(
        {
          id: 'art1',
          name: `Complete Art & Craft Kit for ${ageCategory}`,
          price: '₹599 - ₹1,499',
          priceValue: 999,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=art+craft+kit+' + encodeURIComponent(ageCategory),
          rating: 4.4,
          reviewCount: 980,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'art2',
          name: `Coloring & Activity Book Set`,
          price: '₹299',
          priceValue: 299,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=coloring+books+' + encodeURIComponent(ageCategory),
          rating: 4.2,
          reviewCount: 750,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('board game') || activityLower.includes('game')) {
      products.push(
        {
          id: 'bg1',
          name: `Educational Board Games for ${ageCategory}`,
          price: '₹799 - ₹1,999',
          priceValue: 1299,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=board+games+' + encodeURIComponent(ageCategory),
          rating: 4.6,
          reviewCount: 1400,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('toy') || activityLower.includes('educational toy')) {
      products.push(
        {
          id: 'toy1',
          name: `Educational Learning Toys for ${ageCategory}`,
          price: '₹699 - ₹1,799',
          priceValue: 1199,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=educational+toys+' + encodeURIComponent(ageCategory),
          rating: 4.5,
          reviewCount: 1650,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('science') || activityLower.includes('experiment') || activityLower.includes('stem')) {
      products.push(
        {
          id: 'sci1',
          name: `Science Experiment Kit for ${ageCategory}`,
          price: '₹899 - ₹1,999',
          priceValue: 1399,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=science+kit+' + encodeURIComponent(ageCategory),
          rating: 4.6,
          reviewCount: 920,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'sci2',
          name: `STEM Learning Activity Set`,
          price: '₹799',
          priceValue: 799,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=stem+toys+' + encodeURIComponent(ageCategory),
          rating: 4.4,
          reviewCount: 680,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('building') || activityLower.includes('engineering') || activityLower.includes('construction')) {
      products.push(
        {
          id: 'eng1',
          name: `Engineering Building Set for ${ageCategory}`,
          price: '₹1,299 - ₹2,999',
          priceValue: 1999,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=building+engineering+toys+' + encodeURIComponent(ageCategory),
          rating: 4.7,
          reviewCount: 1240,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        },
        {
          id: 'eng2',
          name: `Construction & Mechanics Kit`,
          price: '₹999',
          priceValue: 999,
          currency: 'INR',
          url: 'https://www.flipkart.com/search?q=engineering+toys+' + encodeURIComponent(ageCategory),
          rating: 4.5,
          reviewCount: 890,
          source: 'flipkart',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('robot') || activityLower.includes('coding')) {
      products.push(
        {
          id: 'rob1',
          name: `Coding Robot Kit for ${ageCategory}`,
          price: '₹2,499 - ₹4,999',
          priceValue: 3499,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=coding+robot+' + encodeURIComponent(ageCategory),
          rating: 4.8,
          reviewCount: 560,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    if (activityLower.includes('math') || activityLower.includes('counting')) {
      products.push(
        {
          id: 'math1',
          name: `Math Learning Games for ${ageCategory}`,
          price: '₹499 - ₹1,299',
          priceValue: 799,
          currency: 'INR',
          url: 'https://www.amazon.in/s?k=math+learning+toys+' + encodeURIComponent(ageCategory),
          rating: 4.4,
          reviewCount: 750,
          source: 'amazon',
          ageRange: ageCategory,
          inStock: true
        }
      );
    }

    // Return limited results
    return products.slice(0, maxResults);
  }

  /**
   * Determine if an activity likely has physical products
   */
  hasPhysicalProducts(activityName: string): boolean {
    const activityLower = activityName.toLowerCase();
    const productKeywords = [
      'puzzle', 'lego', 'block', 'book', 'reading', 'story',
      'art', 'craft', 'drawing', 'coloring', 'paint',
      'board game', 'game', 'toy', 'kit', 'set',
      'instrument', 'music', 'building', 'science',
      'engineering', 'experiment', 'stem', 'robot',
      'coding', 'chess', 'writing', 'math', 'learning'
    ];

    return productKeywords.some(keyword => activityLower.includes(keyword));
  }
}

export default new ProductSearchService();
