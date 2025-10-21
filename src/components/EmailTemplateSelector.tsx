import React, { useState } from 'react';
import type { EmailTemplate } from '../types/email';
import { emailTemplates } from '../data/emailTemplates';

interface EmailTemplateSelectorProps {
  selectedCategory: 'frequent' | 'inactive' | 'cold';
  onTemplateSelect: (template: EmailTemplate) => void;
}

export function EmailTemplateSelector({ selectedCategory, onTemplateSelect }: EmailTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const categoryTemplates = emailTemplates.filter(template => template.category === selectedCategory);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  return (
    <div className="bg-white rounded border p-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Templates - {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
      </h3>
      
      {categoryTemplates.length === 0 ? (
        <p className="text-xs text-gray-500">No templates for {selectedCategory}</p>
      ) : (
        <div className="space-y-2">
          {categoryTemplates.map((template) => (
            <div 
              key={template.id}
              className={`p-2 border rounded cursor-pointer transition-colors ${
                selectedTemplate === template.id 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleTemplateChange(template.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{template.name}</h4>
                  <p className="text-xs text-gray-600 truncate">{template.subject}</p>
                </div>
                <input
                  type="radio"
                  checked={selectedTemplate === template.id}
                  onChange={() => handleTemplateChange(template.id)}
                  className="text-primary-600 ml-2"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedTemplate && (
        <div className="mt-3 p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">
            Template selected! Click "Create Draft" below.
          </p>
        </div>
      )}
    </div>
  );
}
