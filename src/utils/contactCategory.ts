import type { ContactCategory } from '../types/contact';

export function getCategoryColorClasses(category: ContactCategory): string {
  switch (category) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'engaged':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'dormant':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getCategoryPillClasses(category: ContactCategory): string {
  switch (category) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'engaged':
      return 'bg-blue-100 text-blue-800';
    case 'dormant':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getCategoryIcon(category: ContactCategory): string {
  switch (category) {
    case 'active':
      return '✅';
    case 'engaged':
      return '💬';
    case 'dormant':
    default:
      return '❄️';
  }
}

export function getCategoryTooltip(category: ContactCategory): string {
  switch (category) {
    case 'active':
      return 'Recent contact or frequent emails; likely to respond.';
    case 'engaged':
      return 'Good history and decent responsiveness; not very recent.';
    case 'dormant':
    default:
      return 'Little or older activity; may need re-engagement.';
  }
}

export function getCategoryLabel(category: ContactCategory): string {
  switch (category) {
    case 'active':
      return 'Recent';
    case 'engaged':
      return 'In Touch';
    case 'dormant':
    default:
      return 'Inactive';
  }
}


