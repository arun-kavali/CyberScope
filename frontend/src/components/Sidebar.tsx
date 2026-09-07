import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bell, 
  Search, 
  FileText, 
  Database, 
  BarChart3, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  History 
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    name: string;
    path: string;
    icon: React.ElementType;
    phase: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { name: "System Foundation", path: "/", icon: LayoutDashboard, phase: "Phase 1" },
    ]
  },
  {
    title: "Security Intelligence (Future)",
    items: [
      { name: "Alert Ingestion", path: "/alerts", icon: Bell, phase: "Phase 3" },
      { name: "Evidence Analysis", path: "/analysis", icon: Search, phase: "Phase 5" },
      { name: "Incidents & Cases", path: "/incidents", icon: ShieldAlert, phase: "Phase 8" },
      { name: "Data Sources", path: "/sources", icon: Database, phase: "Phase 12" },
      { name: "Operational Analytics", path: "/analytics", icon: BarChart3, phase: "Phase 13" },
      { name: "AI Intelligence", path: "/ai-advisor", icon: Cpu, phase: "Phase 16" },
      { name: "Response Actions", path: "/response", icon: CheckCircle2, phase: "Phase 18" },
      { name: "Executive Reports", path: "/reports", icon: FileText, phase: "Phase 21" },
      { name: "Audit Trail", path: "/audit", icon: History, phase: "Phase 23" },
    ]
  }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
      <div className="p-4 space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
              {section.title}
            </h2>
            <nav className="space-y-1">
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isCurrentPhase = item.phase === "Phase 1";

                if (isCurrentPhase) {
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-900 border-l-4 border-brand-600 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-brand-900'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="h-4 w-4 text-brand-600" />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                        Active
                      </span>
                    </NavLink>
                  );
                }

                return (
                  <div
                    key={iIdx}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed opacity-60 rounded-md"
                    title={`Scheduled for ${item.phase}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {item.phase}
                    </span>
                  </div>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100 bg-surface-subtle">
        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-brand-900">Enterprise SOC System</p>
          <p className="text-[11px] text-slate-600">Local-First Architecture</p>
          <div className="pt-2 flex items-center space-x-2 text-[10px] text-slate-400">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>React + Vite</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
