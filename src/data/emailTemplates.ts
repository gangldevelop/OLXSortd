import type { EmailTemplate } from '../types/email';

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'follow-up-frequent',
    name: 'Quick Check-in',
    subject: 'Quick check-in',
    body: `Hi {{name}},

Hope you're doing great! Just wanted to check in and see how everything is going.

Is there anything I can help you with or any updates you'd like to share?

Looking forward to hearing from you.

Best,
{{senderName}}`,
    category: 'frequent',
    variables: ['name', 'senderName']
  },
  {
    id: 'reconnect-inactive',
    name: 'Reconnect',
    subject: "It's been a while - let's reconnect",
    body: `Hi {{name}},

I hope this email finds you well. It's been a while since we last connected, and I wanted to reach out to see how you're doing.

I'd love to catch up and hear about what's new with you and {{company}}.

Would you be interested in a brief call to reconnect?

Best regards,
{{senderName}}`,
    category: 'inactive',
    variables: ['name', 'company', 'senderName']
  },
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    subject: 'Quick question about {{company}}',
    body: `Hi {{name}},

I hope you're doing well. I came across {{company}} and was impressed by what you're doing in {{industry}}.

I'd love to learn more about your current challenges and see if there's any way I could be helpful.

Do you have a few minutes for a brief conversation this week?

Best regards,
{{senderName}}`,
    category: 'cold',
    variables: ['name', 'company', 'industry', 'senderName']
  }
];

export function getTemplateByCategory(category: 'frequent' | 'inactive' | 'cold'): EmailTemplate | undefined {
  return emailTemplates.find(template => template.category === category);
}

export function processTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Replace variables in subject and body
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
    body = body.replace(new RegExp(placeholder, 'g'), value);
  });

  return { subject, body };
}
