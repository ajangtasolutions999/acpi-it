import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  HardDrive,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  RefreshCw
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string, extra?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard/stats');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading ACPI operational dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const isIT = user?.permissions.includes('perm_view_all_tickets');
  const isApprover = ['role_manager', 'role_gm', 'role_vp', 'role_headit', 'role_admin'].includes(user?.role_id || '');

  return (
    <div className="space-y-6">
      {/* Welcome & Plant Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-600/40 text-cyan-300 border border-cyan-500/40">
                PT Alliance Consumer Products Indonesia
              </span>
              <span className="text-[10px] text-slate-400">
                WIB &bull; ISO 27001 Ready
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {user?.full_name}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Role: <strong className="text-cyan-400 font-semibold">{user?.role_name}</strong> &bull; Department: <strong className="text-slate-200">{user?.department}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('forms', { action: 'new' })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Submit Form
            </button>
            <button
              onClick={() => onNavigate('tickets', { action: 'new' })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              Raise Ticket
            </button>
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div
          onClick={() => onNavigate('tickets', { filter: 'open' })}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-cyan-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isIT ? 'Total Open Tickets' : 'My Open Tickets'}
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{summary.openTickets}</span>
            <span className="text-[11px] font-medium text-slate-500">awaiting action</span>
          </div>
        </div>

        {/* In Progress Tickets */}
        <div
          onClick={() => onNavigate('tickets', { filter: 'in_progress' })}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In Progress Work
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{summary.inProgressTickets}</span>
            <span className="text-[11px] font-medium text-amber-600 font-semibold">active IT tasks</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isApprover ? 'Need My Approval' : 'My Pending Forms'}
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700">
              {isApprover ? summary.pendingApprovals : summary.myRequests}
            </span>
            <span className="text-[11px] font-medium text-slate-500">workflow requests</span>
          </div>
        </div>

        {/* IT Assets / SOPs */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              IT Assets Registered
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{summary.totalAssets}</span>
            <span className="text-[11px] font-medium text-emerald-600">audited plant items</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Distribution by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ticket Distribution by Category
              </h3>
              <p className="text-xs text-slate-500">Service requests vs plant incidents</p>
            </div>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(data?.charts?.ticketCategories || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No ticket records yet</div>
            ) : (
              (data.charts.ticketCategories as any[]).map((cat) => {
                const total = (data.charts.ticketCategories as any[]).reduce((sum, c) => sum + c.count, 0) || 1;
                const pct = Math.round((cat.count / total) * 100);
                const colorMap: Record<string, string> = {
                  Request: 'bg-cyan-600',
                  Incident: 'bg-rose-500',
                  'New Procurement': 'bg-amber-500'
                };
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{cat.category}</span>
                      <span className="text-slate-500">{cat.count} tickets ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorMap[cat.category] || 'bg-slate-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Asset Distribution by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                IT Asset Fleet by Category
              </h3>
              <p className="text-xs text-slate-500">Hardware, network, and industrial inventory</p>
            </div>
            <button
              onClick={() => onNavigate('assets')}
              className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Inventory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(data?.charts?.assetCategories || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No asset records yet</div>
            ) : (
              (data.charts.assetCategories as any[]).slice(0, 5).map((ast) => {
                const total = (data.charts.assetCategories as any[]).reduce((sum, c) => sum + c.count, 0) || 1;
                const pct = Math.round((ast.count / total) * 100);
                return (
                  <div key={ast.category}>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{ast.category}</span>
                      <span className="text-slate-500">{ast.count} units ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-cyan-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent IT Tickets
              </h3>
            </div>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.recentTickets || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No tickets found</div>
            ) : (
              (data.recentTickets as any[]).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onNavigate('tickets', { selectId: t.id })}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-left"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-cyan-700">{t.ticket_number}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        t.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                        t.status === 'Solved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        Priority: {t.priority}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{t.subject}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Requester: {t.requester_name} &bull; {t.requester_department}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Form Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Form Submissions
              </h3>
            </div>
            <button
              onClick={() => onNavigate('forms')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.recentForms || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No form submissions yet</div>
            ) : (
              (data.recentForms as any[]).map((f) => (
                <div
                  key={f.id}
                  onClick={() => onNavigate('forms', { selectId: f.id })}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-left"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-700">{f.reference_number}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        f.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        f.status === 'Pending Approval' ? 'bg-purple-100 text-purple-700' :
                        f.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{f.template_name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Submitted by: {f.requester_name} &bull; {f.department}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
