import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  History,
  Search,
  Download,
  Filter,
  ShieldCheck,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const modParam = moduleFilter !== 'all' ? `&module=${moduleFilter}` : '';
      const res = await apiRequest(`/audit-logs?search=${encodeURIComponent(search)}${modParam}&limit=150`);
      setLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [moduleFilter, search]);

  const exportCSV = () => {
    const headers = ['Event ID', 'Timestamp', 'Actor Name', 'Action', 'Module', 'Record ID', 'Previous Value', 'New Value', 'Reason', 'IP Address'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.created_at}"`,
      `"${l.actor_name}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${l.record_id || ''}"`,
      `"${l.previous_value || ''}"`,
      `"${l.new_value || ''}"`,
      `"${l.reason || ''}"`,
      `"${l.ip_address || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ACPI_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Compliance & Security Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Append-only enterprise record of logins, form submissions, approval decisions, asset transfers, and ticket updates.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Audit Log
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, actor name, or record reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 shadow-2xs"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 text-slate-700 shadow-2xs"
        >
          <option value="all">All Modules</option>
          <option value="Auth">Authentication</option>
          <option value="Forms">Digital Forms</option>
          <option value="Tickets">Ticketing</option>
          <option value="Assets">IT Assets</option>
          <option value="SOPs">SOP Documents</option>
          <option value="Admin">Administration</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (WIB)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Record / Transition</th>
                <th className="py-3 px-4">Reason / Comments</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading audit log entries...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No audit log records found</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition text-[11px]">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {l.actor_name}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {l.action}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                        {l.module}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      {l.previous_value && l.new_value ? (
                        <span className="text-slate-600">
                          {l.previous_value} &rarr; <strong className="text-slate-900">{l.new_value}</strong>
                        </span>
                      ) : (
                        <span className="font-mono text-slate-700">{l.record_id || l.new_value || '-'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 italic max-w-sm truncate">
                      {l.reason || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {l.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
