import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
  Building2,
  Calendar,
  X,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';

export const ApprovalCenterView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'need_my_approval' | 'my_requests'>('need_my_approval');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | 'Returned for Revision'>('Approved');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canApprove = hasPermission('perm_approve_requests') || ['role_manager', 'role_gm', 'role_vp', 'role_headit', 'role_admin'].includes(user?.role_id || '');

  const fetchApprovalData = async () => {
    setLoading(true);
    try {
      const filterParam = activeSubTab === 'need_my_approval' ? 'need_my_approval' : 'mine';
      const data = await apiRequest(`/forms/submissions?filter=${filterParam}`);
      setSubmissions(data.submissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalData();
  }, [activeSubTab, user]);

  const handleOpenReview = (sub: any) => {
    setSelectedSub(sub);
    setComments('');
    setDecision('Approved');
    setReviewModalOpen(true);
  };

  const handleProcessReview = async () => {
    if ((decision === 'Rejected' || decision === 'Returned for Revision') && (!comments || comments.trim().length === 0)) {
      alert('Mandatory reason/comments are required for Rejection or Return for Revision.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest(`/forms/submissions/${selectedSub.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, comments })
      });
      alert(res.message);
      setReviewModalOpen(false);
      fetchApprovalData();
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Approval Center
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review formal authorization requests, sign-off on capital expenditure & access requests, and trigger automatic ticket creation.
          </p>
        </div>

        {/* 2 Sub-Menus as explicitly requested in Section 5 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('need_my_approval')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'need_my_approval'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Need My Approval
            {canApprove && (
              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                {submissions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('my_requests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'my_requests'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Approval Requests
          </button>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading approval records...</div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">
            {activeSubTab === 'need_my_approval' ? 'All Clear! No Pending Approvals' : 'No Active Requests'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeSubTab === 'need_my_approval'
              ? 'You have no forms waiting for your approval right now.'
              : 'You have not submitted any forms pending approval.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {sub.reference_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    sub.status === 'Pending Approval' ? 'bg-purple-100 text-purple-800' :
                    sub.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {sub.status} (Stage {sub.current_approval_level}/{sub.total_approval_levels})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Assigned: {sub.current_approver_role || 'Manager'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  {sub.template_name}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {sub.requester_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {sub.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Form quick parameters preview */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 max-w-2xl">
                  {Object.entries(sub.data || {}).slice(0, 2).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="font-semibold text-slate-600 capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-800 truncate">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Action */}
              <div className="flex items-center gap-2 shrink-0">
                {activeSubTab === 'need_my_approval' && canApprove ? (
                  <button
                    onClick={() => handleOpenReview(sub)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Review & Decide
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenReview(sub)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW & APPROVAL MODAL */}
      {reviewModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedSub.reference_number}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Stage {selectedSub.current_approval_level} of {selectedSub.total_approval_levels}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSub.template_name}
                </h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Requester Banner */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Requester</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSub.requester_name}</p>
                  <p className="text-slate-500">{selectedSub.requester_email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSub.department}</p>
                  <p className="text-slate-500">Date: {new Date(selectedSub.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Form Data Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Request Details & Field Submissions
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {Object.entries(selectedSub.data || {}).map(([key, value]) => (
                    <div key={key} className="p-3 grid grid-cols-3 gap-2 bg-white">
                      <span className="font-semibold text-slate-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="col-span-2 text-slate-900 whitespace-pre-line">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Ticket Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <Ticket className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Automatic IT Ticket Generation:</p>
                  <p className="text-amber-800 text-[11px]">
                    Upon final sign-off, the ACPI system will automatically provision an official IT service ticket (ACPI-IT-YYYY-MM-XXXX) linked directly to this form reference.
                  </p>
                </div>
              </div>

              {/* Decision Section (only if user can approve) */}
              {canApprove && selectedSub.status === 'Pending Approval' && (
                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Authorization Decision
                  </h4>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision('Approved')}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                        decision === 'Approved'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold'
                          : 'border-slate-200 hover:border-emerald-300 text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${decision === 'Approved' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs">Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('Rejected')}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                        decision === 'Rejected'
                          ? 'border-rose-600 bg-rose-50/70 text-rose-900 font-bold'
                          : 'border-slate-200 hover:border-rose-300 text-slate-700'
                      }`}
                    >
                      <XCircle className={`w-5 h-5 ${decision === 'Rejected' ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span className="text-xs">Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('Returned for Revision')}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                        decision === 'Returned for Revision'
                          ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold'
                          : 'border-slate-200 hover:border-amber-300 text-slate-700'
                      }`}
                    >
                      <RotateCcw className={`w-5 h-5 ${decision === 'Returned for Revision' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="text-xs">Return Revision</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {decision === 'Approved' ? 'Approver Remarks / Conditions (Optional)' : 'Mandatory Justification / Feedback *'}
                    </label>
                    <textarea
                      rows={3}
                      required={decision !== 'Approved'}
                      placeholder={decision === 'Approved' ? 'Add any notes, conditions, or budget allocations...' : 'Explain clearly why this request is rejected or what needs correction.'}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>

              {canApprove && selectedSub.status === 'Pending Approval' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleProcessReview}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50 ${
                    decision === 'Approved' ? 'bg-emerald-700 hover:bg-emerald-800' :
                    decision === 'Rejected' ? 'bg-rose-700 hover:bg-rose-800' :
                    'bg-amber-700 hover:bg-amber-800'
                  }`}
                >
                  {submitting ? 'Processing Decision...' : `Confirm ${decision}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
