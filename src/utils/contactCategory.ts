import type { ContactCategory } from '../types/contact';

export function getCategoryColorClasses(category: ContactCategory): string {
  switch (category) {
    case 'frequent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'warm':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'hot':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cold':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getCategoryPillClasses(category: ContactCategory): string {
  switch (category) {
    case 'frequent':
      return 'bg-green-100 text-green-800';
    case 'warm':
      return 'bg-yellow-100 text-yellow-800';
    case 'hot':
      return 'bg-red-100 text-red-800';
    case 'cold':
      return 'bg-gray-100 text-gray-800';
    case 'inactive':
    default:
      return 'bg-orange-100 text-orange-800';
  }
}

export function getCategoryIcon(category: ContactCategory): string {
  switch (category) {
    case 'frequent':
      return '🔥';
    case 'inactive':
      return '⏰';
    case 'warm':
      return '🌡️';
    case 'hot':
      return '🔥';
    case 'cold':
    default:
      return '❄️';
  }
}


