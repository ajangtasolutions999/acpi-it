import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckSquare,
  HardDrive,
  Ticket,
  BarChart3,
  History,
  Settings,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  pendingApprovalsCount = 0
}) => {
  const { user } = useAuth();

  const isPrivileged = ['role_admin', 'role_headit', 'role_gm', 'role_vp'].includes(user?.role_id || '');
  const isAdmin = user?.role_id === 'role_admin';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'KPI metrics & activity'
    },
    {
      id: 'sops',
      label: 'SOPs & IT Policies',
      icon: BookOpen,
      description: 'Authorized document repository'
    },
    {
      id: 'forms',
      label: 'Forms & Requests',
      icon: FileText,
      description: 'Standard digital request forms'
    },
    {
      id: 'approvals',
      label: 'Approval Center',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      description: 'Requests requiring sign-off'
    },
    {
      id: 'assets',
      label: 'IT Asset Management',
      icon: HardDrive,
      description: 'Hardware, software & network'
    },
    {
      id: 'tickets',
      label: 'Ticketing System',
      icon: Ticket,
      description: 'Incidents & service orders'
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      description: 'SLA turnaround & asset metrics'
    },
    ...(isPrivileged ? [
      {
        id: 'audit',
        label: 'Audit Trail',
        icon: History,
        description: 'Append-only event compliance'
      }
    ] : []),
    ...(isAdmin ? [
      {
        id: 'admin',
        label: 'Administration',
        icon: Settings,
        description: 'Users, roles & numbering'
      }
    ] : [])
  ];

  const handleNav = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-lg shadow-sm">
              <img
                src="/assets/aistudio/LogoACPIPNG_369387c8.png"
                alt="ACPI Logo"
                className="h-6 w-auto object-contain"
              />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wider uppercase block">
                ACPI Enterprise
              </span>
              <span className="text-[10px] text-cyan-400 font-medium">
                Information & IT System
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 mt-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-cyan-400 font-medium truncate">
                  {user?.role_name}
                </span>
                <span className="text-slate-600 text-[10px]">&bull;</span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.department?.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Main Modules
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-cyan-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-cyan-600 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 bg-slate-950/40">
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-500" /> Cikarang Plants
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" /> WIB Time
            </span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1 text-center">
            &copy; 2026 PT Alliance Consumer Products
          </p>
        </div>
      </aside>
    </>
  );
};
