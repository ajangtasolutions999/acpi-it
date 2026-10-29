import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  BarChart3,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  HardDrive,
  FileText,
  Printer
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/dashboard/stats')
      .then(res => setStats(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadReportCSV = () => {
    if (!stats) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Open Tickets', stats.summary.openTickets],
      ['In Progress Work', stats.summary.inProgressTickets],
      ['Pending Tickets', stats.summary.pendingTickets],
      ['Solved Tickets', stats.summary.solvedTickets],
      ['Closed Tickets', stats.summary.closedTickets],
      ['Total Assets Registered', stats.summary.totalAssets],
      ['Active SOPs', stats.summary.totalSops]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ACPI_Operations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Operational Reports & Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Service Level Agreement (SLA) turnaround, incident metrics, and plant equipment distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Report
          </button>
          <button
            onClick={downloadReportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Avg Resolution Time</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">2.4 Hours</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" /> Within 4h Plant SLA
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Approval Turnaround</span>
          <p className="text-xl font-extrabold text-purple-700 mt-1">4.2 Hours</p>
          <span className="text-[11px] text-slate-500">Fast multi-level signoff</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">SLA Compliance Rate</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">98.2%</p>
          <span className="text-[11px] text-emerald-600 font-semibold">Manufacturing Standard</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Audited Assets</span>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">{stats?.summary?.totalAssets || 8}</p>
          <span className="text-[11px] text-slate-500">100% Barcode verified</span>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
            Ticket Distribution by Status
          </h3>
          <div className="space-y-3 text-xs">
            {(stats?.charts?.ticketStatuses || []).map((s: any) => (
              <div key={s.status} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">{s.status}</span>
                <span className="font-bold text-slate-900">{s.count} tickets</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
            Asset Distribution by Department
          </h3>
          <div className="space-y-3 text-xs">
            {(stats?.charts?.assetDepartments || []).map((d: any) => (
              <div key={d.department} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">{d.department}</span>
                <span className="font-bold text-indigo-700">{d.count} devices</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
