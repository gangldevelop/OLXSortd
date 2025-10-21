import type { 
  ContactWithAnalysis, 
  EmailInteraction, 
  ContactAnalysisConfig 
} from '../types/contact';
import { ContactAnalyzer } from './contactAnalyzer';

/**
 * Service for managing contact analysis operations
 */
export class ContactAnalysisService {
  private analyzer: ContactAnalyzer;
  private analysisCache: Map<string, ContactWithAnalysis> = new Map();

  constructor(config?: Partial<ContactAnalysisConfig>) {
    this.analyzer = new ContactAnalyzer(config);
  }

  /**
   * Analyzes all contacts and returns updated contact list with analysis
   */
  public analyzeContacts(
    contacts: Array<{ id: string; name: string; email: string }>,
    emailInteractions: EmailInteraction[]
  ): ContactWithAnalysis[] {
    return contacts.map(contact => {
      const contactInteractions = emailInteractions.filter(
        interaction => interaction.contactId === contact.id
      );

      const analysis = this.analyzer.analyzeContact(contact.id, contactInteractions);
      
      const contactWithAnalysis: ContactWithAnalysis = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        category: analysis.category,
        analysis,
        lastContactDate: contactInteractions.length > 0 
          ? new Date(Math.max(...contactInteractions.map(i => i.date.getTime())))
          : null,
        emailCount: contactInteractions.length,
        responseRate: analysis.metrics.responseRate,
        isActive: analysis.category === 'frequent',
        lastEmailSubject: contactInteractions.length > 0 
          ? contactInteractions[contactInteractions.length - 1].subject 
          : undefined,
        tags: this.generateTags(analysis)
      };

      // Cache the analysis
      this.analysisCache.set(contact.id, contactWithAnalysis);

      return contactWithAnalysis;
    });
  }

  /**
   * Gets analysis summary statistics
   */
  public getAnalysisSummary(contacts: ContactWithAnalysis[]) {
    const summary = {
      total: contacts.length,
      frequent: contacts.filter(c => c.category === 'frequent').length,
      inactive: contacts.filter(c => c.category === 'inactive').length,
      cold: contacts.filter(c => c.category === 'cold').length,
      warm: contacts.filter(c => c.category === 'warm').length,
      averageResponseRate: 0,
      averageConfidenceScore: 0
    };

    if (contacts.length > 0) {
      summary.averageResponseRate = contacts.reduce(
        (sum, c) => sum + c.responseRate, 0
      ) / contacts.length;

      summary.averageConfidenceScore = contacts.reduce(
        (sum, c) => sum + c.analysis.score, 0
      ) / contacts.length;
    }

    return summary;
  }

  /**
   * Gets contacts that need attention (inactive or cold with potential)
   */
  public getContactsNeedingAttention(contacts: ContactWithAnalysis[]): ContactWithAnalysis[] {
    return contacts.filter(contact => {
      // Inactive contacts that were previously responsive
      if (contact.category === 'inactive' && contact.responseRate > 0.5) {
        return true;
      }

      // Cold contacts with some previous interaction
      if (contact.category === 'cold' && contact.emailCount > 0) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      // Sort by priority: response rate first, then recency
      if (a.responseRate !== b.responseRate) {
        return b.responseRate - a.responseRate;
      }
      
      if (a.lastContactDate && b.lastContactDate) {
        return b.lastContactDate.getTime() - a.lastContactDate.getTime();
      }
      
      return 0;
    });
  }

  /**
   * Updates analysis configuration
   */
  public updateConfig(config: Partial<ContactAnalysisConfig>): void {
    this.analyzer = new ContactAnalyzer(config);
    this.analysisCache.clear(); // Clear cache when config changes
  }

  /**
   * Gets cached analysis for a contact
   */
  public getCachedAnalysis(contactId: string): ContactWithAnalysis | null {
    return this.analysisCache.get(contactId) || null;
  }

  /**
   * Generates tags based on analysis
   */
  private generateTags(analysis: { metrics: { responseRate: number; daysSinceLastContact: number; totalEmails: number }; category: string }): string[] {
    const tags: string[] = [];

    if (analysis.metrics.responseRate > 0.8) {
      tags.push('highly-responsive');
    }
    
    if (analysis.metrics.daysSinceLastContact < 7) {
      tags.push('recent-contact');
    }
    
    if (analysis.metrics.totalEmails > 10) {
      tags.push('frequent-contact');
    }
    
    if (analysis.category === 'inactive' && analysis.metrics.totalEmails > 5) {
      tags.push('reconnect-opportunity');
    }

    return tags;
  }
}
