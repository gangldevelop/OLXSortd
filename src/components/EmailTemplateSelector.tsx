import { useState, useEffect } from 'react';
import type { EmailTemplate } from '../types/email';
import type { ContactCategory } from '../types/contact';
import { emailTemplates } from '../data/emailTemplates';
import { getCategoryLabel } from '../utils/contactCategory';

interface EmailTemplateSelectorProps {
  selectedCategory: ContactCategory;
  onTemplateSelect: (template: EmailTemplate) => void;
}

export function EmailTemplateSelector({ selectedCategory, onTemplateSelect }: EmailTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Reset selection when category changes
  useEffect(() => {
    setSelectedTemplate('');
  }, [selectedCategory]);

  const categoryTemplates = emailTemplates.filter(template => template.category === selectedCategory);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  return (
    <div className="glass-panel p-3">
      <h3 className="text-sm font-semibold text-slate-100 mb-3">
        Templates - {getCategoryLabel(selectedCategory)}
      </h3>
      
      {categoryTemplates.length === 0 ? (
        <p className="text-xs text-slate-400">No templates for {selectedCategory}</p>
      ) : (
        <div className="space-y-2">
          {categoryTemplates.map((template) => (
            <div 
              key={template.id}
              className={`p-2 border rounded cursor-pointer transition-colors ${
                selectedTemplate === template.id 
                  ? 'border-blue-500/50 bg-blue-500/15' 
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
              }`}
              onClick={() => handleTemplateChange(template.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-100 truncate">{template.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{template.subject}</p>
                </div>
                <input
                  type="radio"
                  checked={selectedTemplate === template.id}
                  onChange={() => handleTemplateChange(template.id)}
                  className="text-blue-500 ml-2"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedTemplate && (
        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-200">
            Template selected! Click "Create Draft" below.
          </p>
        </div>
      )}
    </div>
  );
}
