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
   * Calculates key metrics from email interactions - OPTIMIZED single-pass version
   */
  private calculateMetrics(interactions: EmailInteraction[]) {
    if (interactions.length === 0) {
      return {
        totalEmails: 0,
        sentEmails: 0,
        receivedEmails: 0,
        responseRate: 0,
        daysSinceLastContact: Infinity,
        averageResponseTime: 0,
        conversationCount: 0,
        emailsLast30Days: 0,
        emailsLast90Days: 0
      };
    }

    const now = new Date();
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;

    let sentEmails = 0;
    let receivedEmails = 0;
    let emailsLast30Days = 0;
    let emailsLast90Days = 0;
    let lastContactTime = 0;
    const sentEmailDates: number[] = [];
    const threadIds = new Set<string>();

    // Single pass through interactions - MUCH faster than multiple filters
    for (const interaction of interactions) {
      const interactionTime = interaction.date.getTime();
      
      if (interaction.direction === 'sent') {
        sentEmails++;
        sentEmailDates.push(interactionTime);
      } else {
        receivedEmails++;
      }
      
      if (interactionTime >= thirtyDaysAgo) emailsLast30Days++;
      if (interactionTime >= ninetyDaysAgo) emailsLast90Days++;
      
      if (interactionTime > lastContactTime) {
        lastContactTime = interactionTime;
      }
      
      if (interaction.threadId) {
        threadIds.add(interaction.threadId);
      }
    }

    const lastContactDate = lastContactTime > 0 ? new Date(lastContactTime) : null;
    const daysSinceLastContact = lastContactDate 
      ? Math.floor((now.getTime() - lastContactTime) / (24 * 60 * 60 * 1000))
      : Infinity;

    const responseRate = this.calculateResponseRateThreadAware(interactions, sentEmailDates);
    const averageResponseTime = this.calculateAverageResponseTimeThreadAware(interactions);

    return {
      totalEmails: interactions.length,
      sentEmails,
      receivedEmails,
      responseRate,
      daysSinceLastContact,
      averageResponseTime,
      conversationCount: threadIds.size,
      emailsLast30Days,
      emailsLast90Days
    };
  }

  /**
   * Determines contact category based on metrics and interactions
   */
  private determineCategory(metrics: ReturnType<ContactAnalyzer['calculateMetrics']>): ContactCategory {
    // RECENT: recent or frequent touch and some responsiveness
    if (
      metrics.daysSinceLastContact <= 30 ||
      metrics.emailsLast30Days >= 2 ||
      (metrics.emailsLast90Days >= 5 && metrics.responseRate >= 0.2)
    ) {
      return 'recent';
    }

    // IN_TOUCH: good history and reasonable responsiveness in last ~4 months
    if (
      metrics.totalEmails >= 3 &&
      metrics.responseRate >= 0.3 &&
      metrics.daysSinceLastContact <= 120
    ) {
      return 'in_touch';
    }

    // INACTIVE: everyone else (long time since last touch or very sparse history)
    return 'inactive';
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
    // Category weights adjusted for simplified model
    switch (category) {
      case 'recent':
        score += 10;
        break;
      case 'in_touch':
        score += 5;
        break;
      case 'inactive':
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

    if (category === 'recent') {
      insights.push(`Active communication with ${metrics.totalEmails} emails`);
      if (metrics.daysSinceLastContact < 3) {
        insights.push('Very recent contact - relationship is active');
      }
      if (metrics.responseRate > 0.8) {
        insights.push('Excellent response rate - highly engaged contact');
      }
    } else if (category === 'in_touch') {
      insights.push('Good relationship - not very recent but responsive');
      insights.push(`Last contact ${metrics.daysSinceLastContact} days ago`);
      if (metrics.responseRate > 0.5) {
        insights.push('Good historical response rate - likely to re-engage');
      }
    } else if (category === 'inactive') {
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
   * FAST response rate calculation - optimized to avoid O(n²) nested loops
   */
  private calculateResponseRateThreadAware(interactions: EmailInteraction[], sentEmailDates: number[]): number {
    if (sentEmailDates.length === 0) return 0;

    const replyWindow = 14 * 24 * 60 * 60 * 1000;

    // Group by threadId (fallback to 'global' when missing)
    const threadToTimes: Map<string, { sent: number[]; received: number[] }> = new Map();
    for (const i of interactions) {
      const key = i.threadId || 'global';
      let entry = threadToTimes.get(key);
      if (!entry) {
        entry = { sent: [], received: [] };
        threadToTimes.set(key, entry);
      }
      const t = i.date.getTime();
      if (i.direction === 'sent') entry.sent.push(t); else entry.received.push(t);
    }

    // Ensure times are sorted ascending per thread (should already be, but safe)
    for (const entry of threadToTimes.values()) {
      if (entry.sent.length > 1) entry.sent.sort((a, b) => a - b);
      if (entry.received.length > 1) entry.received.sort((a, b) => a - b);
    }

    // Helper lower_bound
    const lowerBound = (arr: number[], target: number): number => {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (arr[mid] < target) lo = mid + 1; else hi = mid;
      }
      return lo;
    };

    let repliedCount = 0;

    // For each thread, count replies to sent emails within window using binary search
    for (const entry of threadToTimes.values()) {
      for (const sentTime of entry.sent) {
        if (entry.received.length === 0) continue;
        const idx = lowerBound(entry.received, sentTime + 1);
        if (idx < entry.received.length) {
          const firstReplyTime = entry.received[idx];
          if (firstReplyTime - sentTime < replyWindow) {
            repliedCount++;
          }
        }
      }
    }

    return repliedCount / sentEmailDates.length;
  }

  /**
   * FAST average response time calculation
   */
  private calculateAverageResponseTimeThreadAware(interactions: EmailInteraction[]): number {
    const responseTimes: number[] = [];

    // Group by threadId
    const threadToTimes: Map<string, { sent: number[]; received: number[] }> = new Map();
    for (const i of interactions) {
      const key = i.threadId || 'global';
      let entry = threadToTimes.get(key);
      if (!entry) {
        entry = { sent: [], received: [] };
        threadToTimes.set(key, entry);
      }
      const t = i.date.getTime();
      if (i.direction === 'sent') entry.sent.push(t); else entry.received.push(t);
    }

    // Sort
    for (const entry of threadToTimes.values()) {
      if (entry.sent.length > 1) entry.sent.sort((a, b) => a - b);
      if (entry.received.length > 1) entry.received.sort((a, b) => a - b);
    }

    // Lower bound helper
    const lowerBound = (arr: number[], target: number): number => {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (arr[mid] < target) lo = mid + 1; else hi = mid;
      }
      return lo;
    };

    for (const entry of threadToTimes.values()) {
      if (entry.sent.length === 0 || entry.received.length === 0) continue;
      for (const sentTime of entry.sent) {
        const idx = lowerBound(entry.received, sentTime + 1);
        if (idx < entry.received.length) {
          const firstReplyTime = entry.received[idx];
          const hours = (firstReplyTime - sentTime) / (1000 * 60 * 60);
          responseTimes.push(hours);
        }
      }
    }

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
  }

}
