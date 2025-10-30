import type { ContactCategory } from '../types/contact';

export function getCategoryColorClasses(category: ContactCategory): string {
  switch (category) {
    case 'recent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_touch':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'inactive':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getCategoryPillClasses(category: ContactCategory): string {
  switch (category) {
    case 'recent':
      return 'bg-green-100 text-green-800';
    case 'in_touch':
      return 'bg-blue-100 text-blue-800';
    case 'inactive':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getCategoryIcon(category: ContactCategory): string {
  switch (category) {
    case 'recent':
      return '✅';
    case 'in_touch':
      return '💬';
    case 'inactive':
    default:
      return '❄️';
  }
}

export function getCategoryTooltip(category: ContactCategory): string {
  switch (category) {
    case 'recent':
      return 'Recent contact or frequent emails; likely to respond.';
    case 'in_touch':
      return 'Good history and decent responsiveness; not very recent.';
    case 'inactive':
    default:
      return 'Little or older activity; may need re-engagement.';
  }
}

export function getCategoryLabel(category: ContactCategory): string {
  switch (category) {
    case 'recent':
      return 'Recent';
    case 'in_touch':
      return 'In Touch';
    case 'inactive':
    default:
      return 'Inactive';
  }
}


