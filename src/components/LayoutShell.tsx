import type { ReactNode } from 'react';

export function LayoutShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>
      <div className="p-4 space-y-4 h-full flex flex-col">{children}</div>
    </div>
  );
}


