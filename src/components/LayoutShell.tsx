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
    <div className="app-surface min-h-screen px-3 py-3">
      <div className="glass-panel px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>
            {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>
      <div className="pt-3 space-y-3 h-full flex flex-col">{children}</div>
    </div>
  );
}


