import type { 
  ContactWithAnalysis, 
  EmailInteraction
} from '../types/contact';
import { ContactAnalyzer } from './contactAnalyzer';
import { isCrosswareEmail, isResellerEmail } from '../utils/segmentation';

/**
 * Service for managing contact analysis operations
 */
export class ContactAnalysisService {
  private analyzer: ContactAnalyzer;
  private analysisCache: Map<string, ContactWithAnalysis> = new Map();

  constructor() {
    this.analyzer = new ContactAnalyzer();
  }

  /**
   * Analyzes all contacts and returns updated contact list with analysis - OPTIMIZED
   */
  public analyzeContacts(
    contacts: Array<{ id: string; name: string; email: string }>,
    emailInteractions: EmailInteraction[]
  ): ContactWithAnalysis[] {
    // Pre-group interactions by contact for O(1) lookup instead of O(n) filtering
    const interactionsByContact = new Map<string, EmailInteraction[]>();
    for (const interaction of emailInteractions) {
      if (!interactionsByContact.has(interaction.contactId)) {
        interactionsByContact.set(interaction.contactId, []);
      }
      interactionsByContact.get(interaction.contactId)!.push(interaction);
    }

    return contacts.map(contact => {
      const contactInteractions = interactionsByContact.get(contact.id) || [];
      // Ensure interactions are sorted by date ascending once per contact
      if (contactInteractions.length > 1) {
        contactInteractions.sort((a, b) => a.date.getTime() - b.date.getTime());
      }

      const analysis = this.analyzer.analyzeContact(contact.id, contactInteractions);
      
      // Extract last contact date more efficiently
      let lastContactDate: Date | null = null;
      let lastEmailSubject: string | undefined = undefined;
      
      if (contactInteractions.length > 0) {
        // Single pass to find both max date and last subject
        let maxTime = 0;
        for (const interaction of contactInteractions) {
          const time = interaction.date.getTime();
          if (time > maxTime) {
            maxTime = time;
            lastContactDate = interaction.date;
            lastEmailSubject = interaction.subject;
          }
        }
      }
      
      const contactWithAnalysis: ContactWithAnalysis = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        category: analysis.category,
        analysis,
        lastContactDate,
        emailCount: contactInteractions.length,
        responseRate: analysis.metrics.responseRate,
        isActive: analysis.category === 'recent',
        lastEmailSubject,
        tags: this.generateTags(contact.email, analysis)
      };

      this.analysisCache.set(contact.id, contactWithAnalysis);

      return contactWithAnalysis;
    });
  }

  /**
   * Analyze contacts with pre-grouped interactions - ULTRA FAST for batch processing
   */
  public analyzeContactsWithGroupedInteractions(
    contacts: Array<{ id: string; name: string; email: string }>,
    interactionsByContact: Map<string, EmailInteraction[]>
  ): ContactWithAnalysis[] {
    // Sort all interactions once, upfront
    const sortedInteractionsByContact = new Map<string, EmailInteraction[]>();
    for (const [contactId, interactions] of interactionsByContact) {
      if (interactions.length > 1) {
        interactions.sort((a, b) => a.date.getTime() - b.date.getTime());
      }
      sortedInteractionsByContact.set(contactId, interactions);
    }

    return contacts.map(contact => {
      const contactInteractions = sortedInteractionsByContact.get(contact.id) || [];

      const analysis = this.analyzer.analyzeContact(contact.id, contactInteractions);
      
      let lastContactDate: Date | null = null;
      let lastEmailSubject: string | undefined = undefined;
      
      if (contactInteractions.length > 0) {
        let maxTime = 0;
        for (const interaction of contactInteractions) {
          const time = interaction.date.getTime();
          if (time > maxTime) {
            maxTime = time;
            lastContactDate = interaction.date;
            lastEmailSubject = interaction.subject;
          }
        }
      }
      
      const contactWithAnalysis: ContactWithAnalysis = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        category: analysis.category,
        analysis,
        lastContactDate,
        emailCount: contactInteractions.length,
        responseRate: analysis.metrics.responseRate,
        isActive: analysis.category === 'recent',
        lastEmailSubject,
        tags: this.generateTags(contact.email, analysis)
      };

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
      recent: contacts.filter(c => c.category === 'recent').length,
      in_touch: contacts.filter(c => c.category === 'in_touch').length,
      inactive: contacts.filter(c => c.category === 'inactive').length,
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
      // Dormant contacts with some previous interaction or promising response rate
      if (contact.category === 'inactive' && (contact.emailCount > 0 || contact.responseRate > 0.3)) {
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
   * Clears the analysis cache
   */
  public clearCache(): void {
    this.analysisCache.clear();
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
  private generateTags(email: string, analysis: { metrics: { responseRate: number; daysSinceLastContact: number; totalEmails: number }; category: string }): string[] {
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

    // Add segmentation tags
    if (isCrosswareEmail(email)) {
      tags.push('crossware');
    }
    if (isResellerEmail(email)) {
      tags.push('reseller');
    }

    return tags;
  }
}
