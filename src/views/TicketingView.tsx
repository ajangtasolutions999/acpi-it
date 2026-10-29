import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Lock,
  Send,
  User,
  Building2,
  Calendar,
  X,
  FileText,
  HardDrive,
  RotateCcw,
  CheckSquare2,
  Trash2,
  ChevronRight,
  Shield,
  Layers
} from 'lucide-react';

interface TicketingViewProps {
  initialSelectId?: string;
  initialFilter?: string;
}

export const TicketingView: React.FC<TicketingViewProps> = ({
  initialSelectId,
  initialFilter
}) => {
  const { user, hasPermission } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'assigned_me'>('all');

  // Ticket details modal state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status Change / Close / Reopen state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('In Progress');
  const [statusReason, setStatusReason] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // Create Ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState<'Request' | 'Incident' | 'New Procurement'>('Incident');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [location, setLocation] = useState('Cikarang Plant 1 - Production Floor');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // New Procurement specific fields
  const [procureItem, setProcureItem] = useState('');
  const [procureQty, setProcureQty] = useState(1);
  const [procurePrice, setProcurePrice] = useState(1000000);
  const [procureJustification, setProcureJustification] = useState('');
  const [procureDate, setProcureDate] = useState('');

  const isIT = ['role_itstaff', 'role_headit', 'role_admin'].includes(user?.role_id || '');
  const isHeadOfIT = user?.role_id === 'role_headit' || hasPermission('perm_close_tickets');
  const canUpdateStatus = hasPermission('perm_update_ticket_status') || isHeadOfIT;
  const canDeleteRecords = hasPermission('perm_delete_records');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const scopeParam = scopeFilter === 'mine' ? '&filter=mine' : scopeFilter === 'assigned_me' ? '&filter=assigned_me' : '';
      const catParam = categoryFilter !== 'all' ? `&category=${categoryFilter}` : '';
      const statParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await apiRequest(`/tickets?search=${encodeURIComponent(search)}${scopeParam}${catParam}${statParam}`);
      setTickets(res.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, categoryFilter, statusFilter, scopeFilter]);

  useEffect(() => {
    if (initialSelectId) {
      openTicketDetails(initialSelectId);
    }
  }, [initialSelectId]);

  const openTicketDetails = async (tktId: string) => {
    try {
      const res = await apiRequest(`/tickets/${tktId}`);
      setSelectedTicket(res.ticket);
      setComments(res.comments || []);
      setStatusHistory(res.statusHistory || []);
      setTargetStatus(res.ticket.status);
      setAssignedToId(res.ticket.assigned_to_id || '');
    } catch (err: any) {
      alert(`Error loading ticket: ${err.message}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    setSubmittingComment(true);
    try {
      await apiRequest(`/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          comment: newComment,
          is_internal: isInternalNote
        })
      });
      setNewComment('');
      setIsInternalNote(false);
      openTicketDetails(selectedTicket.id);
    } catch (err: any) {
      alert(`Comment error: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;

    const isReopen = (selectedTicket.status === 'Solved' || selectedTicket.status === 'Closed') && (targetStatus === 'Open' || targetStatus === 'In Progress');
    if (isReopen && (!statusReason || statusReason.trim().length === 0)) {
      alert('A documented reason is required to re-open a ticket.');
      return;
    }

    try {
      await apiRequest(`/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          reason: statusReason,
          resolution_summary: resolutionSummary,
          assigned_to_id: assignedToId || undefined
        })
      });
      setShowStatusModal(false);
      setStatusReason('');
      openTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const res = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: createCategory,
          subject,
          description,
          priority,
          location,
          procurement_item: procureItem,
          procurement_qty: procureQty,
          procurement_price: procurePrice,
          procurement_justification: procureJustification,
          procurement_date: procureDate
        })
      });
      setShowCreateModal(false);
      setSubject('');
      setDescription('');
      fetchTickets();
      openTicketDetails(res.id);
    } catch (err: any) {
      alert(`Create ticket error: ${err.message}`);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleDeleteTicket = async (tktId: string) => {
    if (!confirm('Are you sure you want to delete this ticket record permanently? (Admin action)')) return;
    try {
      await apiRequest(`/tickets/${tktId}`, { method: 'DELETE' });
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-cyan-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Centralized IT Ticketing System
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Service requests, production incident tracking, and new IT procurement orders across ACPI manufacturing plants.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Raise New Ticket
        </button>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          {isIT && (
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                scopeFilter === 'all' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Plant Tickets
            </button>
          )}
          <button
            onClick={() => setScopeFilter('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              scopeFilter === 'mine' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            My Submitted Tickets
          </button>
          {isIT && (
            <button
              onClick={() => setScopeFilter('assigned_me')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                scopeFilter === 'assigned_me' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Assigned to Me
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Categories</option>
            <option value="Request">Requests</option>
            <option value="Incident">Incidents</option>
            <option value="New Procurement">New Procurement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Solved">Solved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ticket number (ACPI-IT-...), subject, description, or requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Ticket Number</th>
                <th className="py-3 px-4">Category & Subject</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned IT</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading tickets...</td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No tickets found</td>
                </tr>
              ) : (
                tickets.map((tkt) => (
                  <tr key={tkt.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-800 whitespace-nowrap">
                      {tkt.ticket_number}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          tkt.category === 'Incident' ? 'bg-rose-100 text-rose-800' :
                          tkt.category === 'New Procurement' ? 'bg-amber-100 text-amber-800' :
                          'bg-cyan-100 text-cyan-800'
                        }`}>
                          {tkt.category}
                        </span>
                        {tkt.related_form_ref && (
                          <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 truncate">
                            Form: {tkt.related_form_ref}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 truncate">{tkt.subject}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{tkt.requester_name}</div>
                      <div className="text-[10px] text-slate-400">{tkt.requester_department}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tkt.priority === 'Critical' ? 'bg-rose-600 text-white' :
                        tkt.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {tkt.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tkt.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                        tkt.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                        tkt.status === 'Pending' ? 'bg-purple-100 text-purple-800' :
                        tkt.status === 'Solved' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-200 text-slate-800'
                      }`}>
                        {tkt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {tkt.assigned_to_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(tkt.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openTicketDetails(tkt.id)}
                        className="text-cyan-700 hover:text-cyan-900 font-semibold cursor-pointer"
                      >
                        Open Ticket
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-800 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                    {selectedTicket.ticket_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedTicket.category === 'Incident' ? 'bg-rose-100 text-rose-800' :
                    selectedTicket.category === 'New Procurement' ? 'bg-amber-100 text-amber-800' :
                    'bg-cyan-100 text-cyan-800'
                  }`}>
                    {selectedTicket.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                    selectedTicket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                    selectedTicket.status === 'Solved' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    Status: {selectedTicket.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Requester & Assignment Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Requester</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedTicket.requester_name}</p>
                  <p className="text-[11px] text-slate-500">{selectedTicket.requester_department}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedTicket.location || 'ACPI Plant'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Priority</span>
                  <p className="font-semibold text-rose-700 mt-0.5">{selectedTicket.priority}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned IT</span>
                  <p className="font-semibold text-cyan-800 mt-0.5">{selectedTicket.assigned_to_name || 'Unassigned'}</p>
                </div>
              </div>

              {/* Linked Form / Linked Asset References */}
              {(selectedTicket.related_form_ref || selectedTicket.related_asset_name) && (
                <div className="flex flex-wrap gap-3">
                  {selectedTicket.related_form_ref && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>Linked Form Reference: <strong>{selectedTicket.related_form_ref}</strong></span>
                    </div>
                  )}
                  {selectedTicket.related_asset_name && (
                    <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
                      <HardDrive className="w-4 h-4 text-indigo-700" />
                      <span>Linked Asset: <strong>{selectedTicket.related_asset_name}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Issue Description & Initial Report
                </h4>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Procurement specific block if applicable */}
              {selectedTicket.category === 'New Procurement' && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <h4 className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                    Procurement Specifications & Financial Estimates
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-500 text-[10px]">Item:</span>
                      <p className="font-semibold">{selectedTicket.procurement_item_description || selectedTicket.subject}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Quantity:</span>
                      <p className="font-semibold">{selectedTicket.procurement_quantity || 1} units</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Total Cost:</span>
                      <p className="font-mono font-bold text-amber-900">
                        Rp {Number(selectedTicket.procurement_total_cost || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  {selectedTicket.procurement_justification && (
                    <div className="pt-2 text-[11px] text-slate-700">
                      <strong>Justification:</strong> {selectedTicket.procurement_justification}
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Summary if Solved or Closed */}
              {selectedTicket.resolution_summary && (
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Official Resolution Summary
                  </h4>
                  <p>{selectedTicket.resolution_summary}</p>
                </div>
              )}

              {/* Reopen notice if reopened */}
              {selectedTicket.reopen_reason && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs text-blue-900">
                  <span className="font-bold block">Re-Opened by Head of IT:</span>
                  <p className="text-[11px] mt-0.5">Reason: "{selectedTicket.reopen_reason}" (by {selectedTicket.reopened_by_name})</p>
                </div>
              )}

              {/* Status History Audit Trail */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Status Transition History
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {statusHistory.map((sh) => (
                    <div key={sh.id} className="p-2.5 bg-slate-50 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800">{sh.from_status} → {sh.to_status}</span>
                        <span className="text-slate-500 ml-2">by {sh.actor_name} ({sh.actor_role})</span>
                        {sh.reason && <p className="text-slate-500 italic mt-0.5">{sh.reason}</p>}
                      </div>
                      <span className="text-slate-400">{new Date(sh.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments & Work Notes Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Activity & Communication Stream
                </h4>

                <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      No comments or notes yet.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          c.is_internal
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.user_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {c.user_role}
                            </span>
                            {c.is_internal && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Internal IT Work Note
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-line">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Type your response, troubleshooting steps or update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      {isIT && (
                        <label className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <Lock className="w-3.5 h-3.5" />
                          Mark as Internal IT Note (strictly hidden from user)
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post Update
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                {canDeleteRecords && (
                  <button
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Ticket
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Status action buttons */}
                {canUpdateStatus && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Update Status & Assignment
                  </button>
                )}

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS & ASSIGNMENT MODAL (Section 13) */}
      {showStatusModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Update Status & Workflow
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ticket: <strong className="font-mono text-cyan-800">{selectedTicket.ticket_number}</strong> (Current: {selectedTicket.status})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending (Awaiting Parts / Feedback)</option>
                  <option value="Solved">Solved (Work Complete)</option>
                  {isHeadOfIT && <option value="Closed">Closed (Official Head of IT Close)</option>}
                </select>
                {!isHeadOfIT && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Final ticket closure is restricted to Head of IT authority.
                  </p>
                )}
              </div>

              {/* Assignment */}
              {isIT && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign IT Engineer</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="">Unassigned</option>
                    <option value="usr_itstaff">Farhan Maulana (IT Support)</option>
                    <option value="usr_headit">Rian Pratama (Head of IT)</option>
                  </select>
                </div>
              )}

              {/* Resolution summary if solved */}
              {targetStatus === 'Solved' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Document how the incident or service request was resolved..."
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {/* Mandatory Reason if Reopening */}
              {((selectedTicket.status === 'Solved' || selectedTicket.status === 'Closed') && (targetStatus === 'Open' || targetStatus === 'In Progress')) && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Mandatory Re-Open Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Specify why this ticket must be re-opened for additional work..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold"
                >
                  Apply Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Raise New IT Service Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Request', 'Incident', 'New Procurement'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCreateCategory(cat)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer text-center ${
                        createCategory === cat
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder={createCategory === 'Incident' ? 'e.g. Plant 1 Barcode scanner not connecting' : 'e.g. Need VPN remote access for plant supervision'}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="Low">Low - General Inquiry</option>
                    <option value="Normal">Normal - Standard Service</option>
                    <option value="High">High - Work Impeded</option>
                    <option value="Critical">Critical - Production Line Stoppage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plant Location *</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="Cikarang Plant 1 - Production Floor">Cikarang Plant 1 - Production Floor</option>
                    <option value="Cikarang Plant 1 - QA Laboratory">Cikarang Plant 1 - QA Laboratory</option>
                    <option value="Cikarang Plant 2 - Filling Hub">Cikarang Plant 2 - Filling Hub</option>
                    <option value="Finished Goods Warehouse">Finished Goods Warehouse</option>
                    <option value="Jakarta Head Office">Jakarta Head Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the symptoms, error messages, and steps taken..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              {/* Special Procurement Fields (Section 12.C) */}
              {createCategory === 'New Procurement' && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
                  <h4 className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                    Procurement Order Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Item Description</label>
                      <input
                        type="text"
                        placeholder="Model / Spec"
                        value={procureItem}
                        onChange={(e) => setProcureItem(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={procureQty}
                        onChange={(e) => setProcureQty(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Estimated Unit Price (IDR)</label>
                    <input
                      type="number"
                      value={procurePrice}
                      onChange={(e) => setProcurePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {submittingCreate ? 'Creating...' : 'Submit IT Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
