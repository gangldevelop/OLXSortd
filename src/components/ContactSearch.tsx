import { useState, useEffect } from 'react';
import type { ContactWithAnalysis } from '../types/contact';

interface ContactSearchProps {
  contacts: ContactWithAnalysis[];
  onFilteredContacts: (filteredContacts: ContactWithAnalysis[]) => void;
  placeholder?: string;
  showAdvancedFilters?: boolean;
}

interface FilterOptions {
  searchTerm: string;
  responseRateRange: [number, number];
  lastContactFilter: string;
  emailCountRange: [number, number];
  sortBy: 'default' | 'name' | 'emailCount' | 'lastContact' | 'responseRate';
  sortOrder: 'asc' | 'desc';
}

export function ContactSearch({ 
  contacts, 
  onFilteredContacts, 
  placeholder = "Search contacts...",
  showAdvancedFilters = false 
}: ContactSearchProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    responseRateRange: [0, 100],
    lastContactFilter: 'all',
    emailCountRange: [0, 1000],
    sortBy: 'default',
    sortOrder: 'desc'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filtered = applyFilters(contacts, filters);
      onFilteredContacts(filtered);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [contacts, filters, onFilteredContacts]);

  const applyFilters = (contactsToFilter: ContactWithAnalysis[], filterOptions: FilterOptions): ContactWithAnalysis[] => {
    let filtered = [...contactsToFilter];

    // Search term filter
    if (filterOptions.searchTerm.trim()) {
      const searchLower = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter(contact => {
        const nameLower = (contact.name || '').toLowerCase();
        const emailLower = (contact.email || '').toLowerCase();
        return nameLower.includes(searchLower) || emailLower.includes(searchLower);
      });
    }

    // Response rate filter
    filtered = filtered.filter(contact => 
      ((contact.responseRate ?? 0) * 100) >= filterOptions.responseRateRange[0] &&
      ((contact.responseRate ?? 0) * 100) <= filterOptions.responseRateRange[1]
    );

    // Last contact filter
    if (filterOptions.lastContactFilter !== 'all') {
      const now = Date.now();
      filtered = filtered.filter(contact => {
        if (!contact.lastContactDate) return filterOptions.lastContactFilter === 'never';
        const daysSince = Math.floor((now - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000));
        switch (filterOptions.lastContactFilter) {
          case 'never': return !contact.lastContactDate;
          case 'recent': return daysSince <= 7;
          case 'month': return daysSince <= 30;
          case 'old': return daysSince > 30;
          case 'year': return daysSince > 365;
          default: return true;
        }
      });
    }

    // Email count filter
    filtered = filtered.filter(contact => 
      (contact.emailCount ?? 0) >= filterOptions.emailCountRange[0] &&
      (contact.emailCount ?? 0) <= filterOptions.emailCountRange[1]
    );

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      const aName = (a.name || '');
      const bName = (b.name || '');
      const aEmailCount = a.emailCount ?? 0;
      const bEmailCount = b.emailCount ?? 0;
      const aTime = a.lastContactDate?.getTime() || 0;
      const bTime = b.lastContactDate?.getTime() || 0;
      const aResp = a.responseRate ?? 0;
      const bResp = b.responseRate ?? 0;
      
      switch (filterOptions.sortBy) {
        case 'name':
          comparison = aName.localeCompare(bName);
          // For names, we always want A-Z order (ascending)
          return comparison;
          
        case 'emailCount':
          comparison = aEmailCount - bEmailCount;
          // For email count, 'desc' means highest first (more emails = more important)
          return filterOptions.sortOrder === 'desc' ? -comparison : comparison;
          
        case 'lastContact':
          comparison = bTime - aTime; // More recent first (higher timestamp)
          // For last contact, 'desc' means most recent first
          return filterOptions.sortOrder === 'desc' ? comparison : -comparison;
          
        case 'responseRate':
          comparison = bResp - aResp; // Higher response rate first
          // For response rate, 'desc' means highest first
          return filterOptions.sortOrder === 'desc' ? comparison : -comparison;
          
        case 'default':
        default:
          // Smart default: response rate first (highest), then recency (most recent)
          if (aResp !== bResp) {
            comparison = bResp - aResp; // Higher response rate first
          } else {
            comparison = bTime - aTime; // More recent first
          }
          return comparison; // Smart sort always uses desc order (best first)
      }
    });

    return filtered;
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  const handleLastContactChange = (value: string) => {
    setFilters(prev => ({ ...prev, lastContactFilter: value }));
  };

  const handleResponseRateInput = (index: 0 | 1, value: string) => {
    const numValue = value === '' ? (index === 0 ? 0 : 100) : parseInt(value) || (index === 0 ? 0 : 100);
    const newRange: [number, number] = index === 0 
      ? [numValue, filters.responseRateRange[1]]
      : [filters.responseRateRange[0], numValue];
    setFilters(prev => ({ ...prev, responseRateRange: newRange }));
  };

  const handleEmailCountInput = (index: 0 | 1, value: string) => {
    const numValue = value === '' ? (index === 0 ? 0 : 1000) : parseInt(value) || (index === 0 ? 0 : 1000);
    const newRange: [number, number] = index === 0 
      ? [numValue, filters.emailCountRange[1]]
      : [filters.emailCountRange[0], numValue];
    setFilters(prev => ({ ...prev, emailCountRange: newRange }));
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      responseRateRange: [0, 100],
      lastContactFilter: 'all',
      emailCountRange: [0, 1000],
      sortBy: 'default',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.searchTerm || 
    filters.responseRateRange[0] > 0 || 
    filters.responseRateRange[1] < 100 ||
    filters.lastContactFilter !== 'all' ||
    filters.emailCountRange[0] > 0 ||
    filters.emailCountRange[1] < 1000;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {filters.searchTerm && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.lastContactFilter}
          onChange={(e) => handleLastContactChange(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="recent">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="old">Older than 30 days</option>
          <option value="year">Over 1 year</option>
          <option value="never">Never</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => handleSortChange(e.target.value as FilterOptions['sortBy'])}
          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="default">Smart Sort (Best First)</option>
          <option value="name">Name A-Z</option>
          <option value="responseRate">Response Rate (High First)</option>
          <option value="emailCount">Email Count (Most First)</option>
          <option value="lastContact">Last Contact (Recent First)</option>
        </select>

        {showAdvancedFilters && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {showAdvanced ? 'Hide' : 'More'} Filters
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && showAdvancedFilters && (
        <div className="bg-gray-50 p-3 rounded border space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Response Rate Range (%)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={filters.responseRateRange[0] === 0 ? '' : filters.responseRateRange[0].toString()}
                onChange={(e) => handleResponseRateInput(0, e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Min"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="text"
                value={filters.responseRateRange[1] === 100 ? '' : filters.responseRateRange[1].toString()}
                onChange={(e) => handleResponseRateInput(1, e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Max"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Email Count Range
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={filters.emailCountRange[0] === 0 ? '' : filters.emailCountRange[0].toString()}
                onChange={(e) => handleEmailCountInput(0, e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Min"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="text"
                value={filters.emailCountRange[1] === 1000 ? '' : filters.emailCountRange[1].toString()}
                onChange={(e) => handleEmailCountInput(1, e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Max"
              />
              <span className="text-xs text-gray-500">emails</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
