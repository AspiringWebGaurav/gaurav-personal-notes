'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  name: string;
  href: string;
  icon?: string;
}

const pathMapping: Record<string, BreadcrumbItem> = {
  '/dashboard': { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  '/dashboard/notes': { name: 'Notes', href: '/dashboard/notes', icon: '📝' },
  '/dashboard/money': { name: 'Money Tracker', href: '/dashboard/money', icon: '💰' },
  '/dashboard/templates': { name: 'Templates', href: '/dashboard/templates', icon: '📋' },
  '/dashboard/settings': { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  '/dashboard/profile': { name: 'Profile', href: '/dashboard/profile', icon: '👤' },
  '/dashboard/help': { name: 'Help', href: '/dashboard/help', icon: '❓' },
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show breadcrumb on login page or root dashboard
  if (!pathname.startsWith('/dashboard') || pathname === '/dashboard') {
    return null;
  }

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard
    breadcrumbs.push(pathMapping['/dashboard']);

    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;
      
      if (currentPath === '/dashboard') continue; // Skip dashboard as it's already added

      const mappedItem = pathMapping[currentPath];
      if (mappedItem) {
        breadcrumbs.push(mappedItem);
      } else {
        // Handle dynamic routes like /dashboard/notes/[id]
        const parentPath = pathSegments.slice(0, i + 1).join('/');
        if (parentPath.includes('notes') && pathSegments[i] !== 'notes') {
          breadcrumbs.push({ name: 'Note Details', href: currentPath, icon: '📄' });
        } else if (parentPath.includes('money') && pathSegments[i] !== 'money') {
          breadcrumbs.push({ name: 'Money Details', href: currentPath, icon: '💳' });
        } else {
          // Generic fallback
          const segmentName = pathSegments[i].charAt(0).toUpperCase() + pathSegments[i].slice(1);
          breadcrumbs.push({ name: segmentName, href: currentPath });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav 
      className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3"
      aria-label="Breadcrumb"
    >
      <div className="max-w-7xl mx-auto">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <svg
                  className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              
              {index === breadcrumbs.length - 1 ? (
                // Current page - not clickable
                <span className="flex items-center text-gray-500 font-medium">
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  <span className="truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                </span>
              ) : (
                // Clickable breadcrumb
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(item.href)}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  aria-label={`Go to ${item.name}`}
                >
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  <span className="truncate max-w-[120px] sm:max-w-none">{item.name}</span>
                </motion.button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}