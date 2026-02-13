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
      <h3 className="text-sm font-semibold text-slate-800 mb-3">
        Templates - {getCategoryLabel(selectedCategory)}
      </h3>
      
      {categoryTemplates.length === 0 ? (
        <p className="text-xs text-slate-500">No templates for {selectedCategory}</p>
      ) : (
        <div className="space-y-2">
          {categoryTemplates.map((template) => (
            <div 
              key={template.id}
              className={`p-2 border rounded cursor-pointer transition-colors ${
                selectedTemplate === template.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
              }`}
              onClick={() => handleTemplateChange(template.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-800 truncate">{template.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{template.subject}</p>
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
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            Template selected! Click "Create Draft" below.
          </p>
        </div>
      )}
    </div>
  );
}
