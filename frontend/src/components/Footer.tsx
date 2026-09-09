import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-3 px-4 sm:px-6 lg:px-8 mt-auto shrink-0 z-10">
      <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-sans">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-brand-900">CyberScope v1.0 SOC</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-medium">Offline-First Platform</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Evidence-Driven Cybersecurity Intelligence • Autonomous SOC Architecture
        </div>
      </div>
    </footer>
  );
};
