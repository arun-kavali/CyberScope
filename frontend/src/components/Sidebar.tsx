import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bell, 
  ShieldAlert, 
  Search, 
  Database, 
  BarChart3, 
  FileCheck, 
  Layers, 
  CheckCircle2, 
  FileText, 
  History,
  Send,
  Cpu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const analystNavSections: NavSection[] = [
  {
    title: 'MAIN MENU',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Alerts', path: '/alerts', icon: Bell },
      { name: 'Incidents', path: '/incidents', icon: ShieldAlert },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    ]
  },
  {
    title: 'SECURITY OPERATIONS',
    items: [
      { name: 'Investigations', path: '/investigations', icon: Search },
      { name: 'Findings', path: '/findings', icon: FileCheck },
      { name: 'Review Priorities', path: '/priorities', icon: Layers },
      { name: 'Data Sources', path: '/sources', icon: Database },
      { name: 'Response', path: '/response', icon: CheckCircle2 },
      { name: 'Reports', path: '/reports', icon: FileText },
      { name: 'Audit Trail', path: '/audit', icon: History },
    ]
  }
];

const alertSourceNavSections: NavSection[] = [
  {
    title: 'ALERT SOURCE PORTAL',
    items: [
      { name: 'Submit Alert', path: '/alert-source', icon: Send },
      { name: 'Scenario Generator', path: '/alert-source/scenarios', icon: Cpu },
      { name: 'Submission History', path: '/alert-source/history', icon: History },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user } = useAuth();
  const isAlertSource = user?.role === 'ALERT_SOURCE';
  const navSections = isAlertSource ? alertSourceNavSections : analystNavSections;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-xs">
      {/* Mobile Top Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between md:hidden bg-slate-50">
        <span className="text-[11px] font-bold text-brand-900 uppercase tracking-wider">
          {isAlertSource ? 'Alert Source Portal' : 'SOC Analyst Navigation'}
        </span>
        <button
          onClick={onCloseMobile}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="py-3 px-2 space-y-5 flex-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1">
              {section.title}
            </div>
            <nav aria-label={section.title} className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/' || item.path === '/alert-source'}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-brand-900 font-bold border-l-3 border-brand-600 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-52 bg-white border-r border-slate-200 flex-shrink-0 h-[calc(100vh-56px)] sticky top-14">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-56 bg-white z-50 transform transition-transform duration-200 ease-in-out md:hidden shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
