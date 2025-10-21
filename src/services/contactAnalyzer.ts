import type { 
  ContactAnalysis, 
  ContactAnalysisConfig, 
  ContactCategory, 
  EmailInteraction 
} from '../types/contact';

/**
 * Contact Analysis Engine
 * Analyzes email communication patterns to automatically categorize contacts
 */
export class ContactAnalyzer {
  private readonly config: ContactAnalysisConfig;

  constructor(config?: Partial<ContactAnalysisConfig>) {
    this.config = {
      frequent: {
        minEmailsLast30Days: 3,
        maxDaysSinceLastContact: 7,
        minResponseRate: 0.6,
        ...config?.frequent
      },
      inactive: {
        minDaysSinceLastContact: 30,
        maxDaysSinceLastContact: 90,
        minPreviousEmails: 2,
        ...config?.inactive
      },
      cold: {
        maxEmailsTotal: 2,
        maxDaysSinceLastContact: 90,
        ...config?.cold
      }
    };
  }

  /**
   * Analyzes a contact's email interactions and determines their category
   */
  public analyzeContact(
    contactId: string, 
    interactions: EmailInteraction[]
  ): ContactAnalysis {
    const metrics = this.calculateMetrics(interactions);
    const category = this.determineCategory(metrics);
    const score = this.calculateConfidenceScore(metrics, category);
    const insights = this.generateInsights(metrics, category);

    return {
      contactId,
      category,
      score,
      metrics,
      insights,
      lastAnalyzed: new Date()
    };
  }

  /**
   * Calculates key metrics from email interactions
   */
  private calculateMetrics(interactions: EmailInteraction[]) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const totalEmails = interactions.length;
    const sentEmails = interactions.filter(i => i.direction === 'sent').length;
    const receivedEmails = interactions.filter(i => i.direction === 'received').length;
    
    const emailsLast30Days = interactions.filter(i => i.date >= thirtyDaysAgo).length;
    const emailsLast90Days = interactions.filter(i => i.date >= ninetyDaysAgo).length;

    const lastContactDate = interactions.length > 0 
      ? new Date(Math.max(...interactions.map(i => i.date.getTime())))
      : null;

    const daysSinceLastContact = lastContactDate 
      ? Math.floor((now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
      : Infinity;

    const responseRate = this.calculateResponseRate(interactions);
    const averageResponseTime = this.calculateAverageResponseTime(interactions);
    const conversationCount = this.countConversations(interactions);

    return {
      totalEmails,
      sentEmails,
      receivedEmails,
      responseRate,
      daysSinceLastContact,
      averageResponseTime,
      conversationCount,
      emailsLast30Days,
      emailsLast90Days
    };
  }

  /**
   * Determines contact category based on metrics and interactions
   */
  private determineCategory(metrics: ReturnType<ContactAnalyzer['calculateMetrics']>): ContactCategory {
    // Frequent: Active recent communication
    if (
      metrics.emailsLast30Days >= this.config.frequent.minEmailsLast30Days &&
      metrics.daysSinceLastContact <= this.config.frequent.maxDaysSinceLastContact &&
      metrics.responseRate >= this.config.frequent.minResponseRate
    ) {
      return 'frequent';
    }

    // Inactive: Previously active but communication dropped off
    if (
      metrics.daysSinceLastContact >= this.config.inactive.minDaysSinceLastContact &&
      metrics.daysSinceLastContact <= this.config.inactive.maxDaysSinceLastContact &&
      metrics.totalEmails >= this.config.inactive.minPreviousEmails
    ) {
      return 'inactive';
    }

    // Warm: Some communication but not meeting frequent criteria
    if (metrics.totalEmails > 2 && metrics.responseRate > 0.3) {
      return 'warm';
    }

    // Cold: Minimal or no communication
    if (
      metrics.totalEmails <= this.config.cold.maxEmailsTotal &&
      metrics.daysSinceLastContact >= this.config.cold.maxDaysSinceLastContact
    ) {
      return 'cold';
    }

    // Hot: High engagement but not recent enough for frequent
    if (metrics.totalEmails > 5 && metrics.responseRate > 0.7 && metrics.daysSinceLastContact <= 30) {
      return 'hot';
    }

    // Default based on email count and response rate
    if (metrics.totalEmails > 2) {
      return 'warm';
    }
    
    return 'cold';
  }

  /**
   * Calculates confidence score for the analysis (0-100)
   */
  private calculateConfidenceScore(metrics: ReturnType<ContactAnalyzer['calculateMetrics']>, category: ContactCategory): number {
    let score = 50; // Base score

    // Increase confidence with more data
    if (metrics.totalEmails > 5) score += 20;
    if (metrics.totalEmails > 10) score += 10;

    // Increase confidence with recent activity
    if (metrics.daysSinceLastContact < 7) score += 15;
    if (metrics.daysSinceLastContact < 30) score += 10;

    // Increase confidence with good response rate
    if (metrics.responseRate > 0.7) score += 15;
    if (metrics.responseRate > 0.5) score += 10;

    // Category-specific adjustments
    switch (category) {
      case 'frequent':
        score += 10;
        break;
      case 'inactive':
        score += 5;
        break;
      case 'cold':
        score -= 10;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generates human-readable insights about the contact
   */
  private generateInsights(metrics: ReturnType<ContactAnalyzer['calculateMetrics']>, category: ContactCategory): string[] {
    const insights: string[] = [];

    if (category === 'frequent') {
      insights.push(`Active communication with ${metrics.totalEmails} emails`);
      if (metrics.daysSinceLastContact < 3) {
        insights.push('Very recent contact - relationship is active');
      }
      if (metrics.responseRate > 0.8) {
        insights.push('Excellent response rate - highly engaged contact');
      }
    } else if (category === 'inactive') {
      insights.push(`Previously active but no contact for ${metrics.daysSinceLastContact} days`);
      insights.push(`Had ${metrics.totalEmails} emails - relationship worth rekindling`);
      if (metrics.responseRate > 0.5) {
        insights.push('Good historical response rate - likely to re-engage');
      }
    } else if (category === 'cold') {
      insights.push('Limited communication history');
      if (metrics.totalEmails === 0) {
        insights.push('Never contacted - perfect for cold outreach');
      } else {
        insights.push(`${metrics.totalEmails} emails but no recent activity`);
      }
    }

    if (metrics.responseRate > 0.7) {
      insights.push('High response rate - very responsive contact');
    } else if (metrics.responseRate < 0.3) {
      insights.push('Low response rate - may need different approach');
    }

    return insights;
  }

  /**
   * Calculates response rate from email interactions with improved logic
   */
  private calculateResponseRate(interactions: EmailInteraction[]): number {
    const sentEmails = interactions.filter(i => i.direction === 'sent');
    if (sentEmails.length === 0) return 0;

    const repliedEmails = sentEmails.filter(email => {
      // Look for replies within 14 days (more realistic for business emails)
      const replies = interactions.filter(i => 
        i.direction === 'received' && 
        i.date > email.date && 
        i.date.getTime() - email.date.getTime() < 14 * 24 * 60 * 60 * 1000 &&
        // Check if it's likely a reply (same subject or thread)
        (i.subject.toLowerCase().includes('re:') || 
         i.subject.toLowerCase().includes(email.subject.toLowerCase().replace('re:', '').trim()) ||
         i.threadId === email.threadId)
      );
      return replies.length > 0;
    });

    return repliedEmails.length / sentEmails.length;
  }

  /**
   * Calculates average response time in hours
   */
  private calculateAverageResponseTime(interactions: EmailInteraction[]): number {
    const responseTimes: number[] = [];

    interactions.forEach(email => {
      if (email.direction === 'sent') {
        const replies = interactions.filter(i => 
          i.direction === 'received' && 
          i.date > email.date &&
          i.threadId === email.threadId
        );
        
        if (replies.length > 0) {
          const responseTime = (replies[0].date.getTime() - email.date.getTime()) / (1000 * 60 * 60);
          responseTimes.push(responseTime);
        }
      }
    });

    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
  }

  /**
   * Counts unique conversation threads
   */
  private countConversations(interactions: EmailInteraction[]): number {
    const threadIds = new Set(
      interactions
        .filter(i => i.threadId)
        .map(i => i.threadId)
    );
    return threadIds.size;
  }
}
