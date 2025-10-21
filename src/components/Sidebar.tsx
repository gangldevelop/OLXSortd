import React from 'react';
import { 
  Users, 
  Mail, 
  FileText, 
  BarChart3, 
  Settings,
  Plus,
  Clock,
  UserCheck
} from 'lucide-react';

export function Sidebar() {
  const menuItems = [
    { icon: Users, label: 'Contacts', count: 0, active: true },
    { icon: Mail, label: 'Email Drafts', count: 0 },
    { icon: FileText, label: 'Templates', count: 4 },
    { icon: BarChart3, label: 'Analytics', count: 0 },
    { icon: Settings, label: 'Settings', count: 0 },
  ];

  const quickActions = [
    { icon: Plus, label: 'New Draft', action: 'new-draft' },
    { icon: Clock, label: 'Inactive Contacts', action: 'inactive' },
    { icon: UserCheck, label: 'Frequent Contacts', action: 'frequent' },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Navigation</h2>
        
        <nav className="space-y-2 mb-8">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                item.active
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
