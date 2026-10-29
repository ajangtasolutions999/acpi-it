import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Printer,
  Download,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Send,
  Building2,
  Calendar,
  User,
  Hash
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormsViewProps {
  initialSelectId?: string;
}

export const FormsView: React.FC<FormsViewProps> = ({ initialSelectId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'submissions'>('catalog');
  const [templates, setTemplates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form filling modal state
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  // Submission detail modal state
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const fetchCatalog = async () => {
    try {
      const data = await apiRequest('/forms/templates');
      setTemplates(data.templates || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/forms/submissions');
      setSubmissions(data.submissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (initialSelectId) {
      openSubmissionDetails(initialSelectId);
      setActiveTab('submissions');
    }
  }, [initialSelectId]);

  const handleOpenForm = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    // Initialize form defaults
    const defaults: Record<string, any> = {};
    if (tmpl.fields) {
      tmpl.fields.forEach((f: any) => {
        if (f.type === 'dropdown' && f.options && f.options.length > 0) {
          defaults[f.id] = f.options[0];
        } else if (f.type === 'radio' && f.options && f.options.length > 0) {
          defaults[f.id] = f.options[0];
        } else {
          defaults[f.id] = '';
        }
      });
    }
    setFormData(defaults);
    setSubmitSuccess(null);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmitForm = async (isDraft: boolean = false) => {
    // Validate required fields
    if (!isDraft && selectedTemplate?.fields) {
      for (const f of selectedTemplate.fields) {
        if (f.required && (!formData[f.id] || String(formData[f.id]).trim() === '')) {
          alert(`Please complete mandatory field: "${f.label}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/forms/submissions', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          formData,
          isDraft
        })
      });
      setSubmitSuccess(res);
      fetchSubmissions();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmissionDetails = async (subId: string) => {
    setSubmissionLoading(true);
    try {
      const res = await apiRequest(`/forms/submissions/${subId}`);
      setActiveSubmission(res);
    } catch (err: any) {
      alert(`Error loading submission: ${err.message}`);
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Section 8: Printable Form Output as PDF
  const generateOfficialPDF = (sub: any, tmpl: any, approvals: any[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with corporate title
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PT ALLIANCE CONSUMER PRODUCTS INDONESIA', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Corporate Information System & Electronic Forms Audit Record', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FORM RECORD', pageWidth - 14, 14, { align: 'right' });

    // Document Meta Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sub.template_name, 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Official Document Reference: `, 14, 42);
    doc.setFont('courier', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text(sub.reference_number, 58, 42);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(sub.created_at).toLocaleDateString()} | Status: ${sub.status}`, 14, 48);

    // Requester Information Table
    const requesterRows = [
      ['Requester Name', sub.requester_name, 'Department', sub.department],
      ['Email Address', sub.requester_email, 'Form Category', sub.category_name],
      ['Submission Status', sub.status, 'Generated Ticket', sub.ticket_id ? 'Yes (ACPI-IT-Linked)' : 'None / Not Applicable']
    ];

    autoTable(doc, {
      startY: 52,
      head: [['Requester Profile & Metadata', '', '', '']],
      body: requesterRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    // Form Field Submissions Table
    const dataEntries = Object.entries(sub.data || {}).map(([k, v]) => [
      k.replace(/_/g, ' ').toUpperCase(),
      String(v)
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['Form Field Specification', 'Submitted Value / Response']],
      body: dataEntries,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // Approval Workflow History
    const approvalRows = (approvals || []).map((a: any) => [
      `Level ${a.level}`,
      a.approver_name,
      a.approver_role,
      a.decision,
      new Date(a.created_at).toLocaleDateString(),
      a.comments || '-'
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['Level', 'Approver Name', 'Role', 'Decision', 'Timestamp', 'Comments']],
      body: approvalRows.length > 0 ? approvalRows : [['1', 'Pending Endorsement', 'Manager', 'Awaiting Action', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    // Signature boxes at bottom
    const sigY = (doc as any).lastAutoTable.finalY + 15;
    if (sigY < 250) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ELECTRONIC AUTHORIZATION SIGNATURES', 14, sigY);

      doc.setDrawColor(203, 213, 225);
      doc.rect(14, sigY + 4, 55, 24);
      doc.rect(74, sigY + 4, 55, 24);
      doc.rect(134, sigY + 4, 55, 24);

      doc.setFont('helvetica', 'normal');
      doc.text('Requester Signature', 16, sigY + 9);
      doc.text(sub.requester_name.split(' ')[0], 16, sigY + 24);

      doc.text('Department Head', 76, sigY + 9);
      doc.text('Authorized Approver', 76, sigY + 24);

      doc.text('Head of IT / SysAdmin', 136, sigY + 9);
      doc.text('System Certified Copy', 136, sigY + 24);
    }

    doc.save(`${sub.reference_number}.pdf`);
  };

  const filteredSubmissions = submissions.filter(s =>
    s.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.template_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.requester_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Forms & Requests Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submit IT access, hardware, network, asset transfers, and procurement requests with automatic document reference numbers.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Form Catalog
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'submissions'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Track Submissions
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              {submissions.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FORM CATALOG */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-emerald-500 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {tmpl.category_name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Code: {tmpl.code}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>

                {tmpl.linked_sop_number && (
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    <BookOpen className="w-3 h-3" />
                    Linked: {tmpl.linked_sop_number}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {tmpl.approval_levels > 1 ? `${tmpl.approval_levels}-Stage Approval` : 'Single Approval'}
                </span>
                <button
                  onClick={() => handleOpenForm(tmpl)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Fill Request
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: SUBMISSIONS TRACKING */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Document Number (ACPI-HR-IT-...), template name, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Document Reference</th>
                    <th className="py-3 px-4">Form Template</th>
                    <th className="py-3 px-4">Requester & Dept</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Generated Ticket</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No form submissions found
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {sub.reference_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {sub.template_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{sub.requester_name}</div>
                          <div className="text-[10px] text-slate-400">{sub.department}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            sub.status === 'Pending Approval' ? 'bg-purple-100 text-purple-800' :
                            sub.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                            sub.status === 'Returned for Revision' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {sub.ticket_id ? (
                            <span className="font-mono text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                              Linked
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => openSubmissionDetails(sub.id)}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                          >
                            View Record
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC FORM FILLING MODAL */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Form Category: {selectedTemplate.category_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Prefix: ACPI-HR-IT-{selectedTemplate.code}-YYYY-MM-XXX
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedTemplate.name}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedTemplate(null); setSubmitSuccess(null); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              /* Success confirmation */
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  Form Successfully Submitted!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your formal request has been recorded into the corporate repository with permanent numbering:
                </p>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 inline-block font-mono text-sm font-bold text-emerald-800">
                  {submitSuccess.reference_number}
                </div>
                <p className="text-xs text-slate-500">
                  Status: <strong>{submitSuccess.status}</strong>. Department approvers have been notified.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => { setSelectedTemplate(null); setActiveTab('submissions'); }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Go to Submissions Track
                  </button>
                </div>
              </div>
            ) : (
              /* Dynamic Form Inputs */
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmitForm(false); }}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {/* Linked SOP Alert Box */}
                {selectedTemplate.linked_sop_title && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-cyan-900">
                    <BookOpen className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Governing Standard Operating Procedure:</p>
                      <p className="text-cyan-800">
                        {selectedTemplate.linked_sop_number}: {selectedTemplate.linked_sop_title}
                      </p>
                    </div>
                  </div>
                )}

                {/* Requester Fixed Snapshot */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Requester</span>
                    <span className="font-medium text-slate-900">{user?.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Department</span>
                    <span className="font-medium text-slate-900">{user?.department}</span>
                  </div>
                </div>

                {/* Render Template Fields */}
                <div className="space-y-4 pt-2">
                  {(selectedTemplate.fields || []).map((field: any) => (
                    <div key={field.id}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          required={field.required}
                          placeholder={field.placeholder || ''}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      ) : field.type === 'dropdown' ? (
                        <select
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        >
                          {(field.options || []).map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="space-y-1.5 pt-1">
                          {(field.options || []).map((opt: string) => (
                            <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                checked={formData[field.id] === opt}
                                onChange={() => handleFieldChange(field.id, opt)}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          placeholder={field.placeholder || ''}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Form Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubmitForm(true)}
                    disabled={submitting}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Submitting...' : 'Formally Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW SUBMISSION DETAILS MODAL */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {activeSubmission.submission.reference_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSubmission.submission.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    activeSubmission.submission.status === 'Pending Approval' ? 'bg-purple-100 text-purple-800' :
                    activeSubmission.submission.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {activeSubmission.submission.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeSubmission.submission.template_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveSubmission(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Requester Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Requester</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeSubmission.submission.requester_name}</p>
                  <p className="text-slate-500">{activeSubmission.submission.requester_email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeSubmission.submission.department}</p>
                  <p className="text-slate-500">Submitted: {new Date(activeSubmission.submission.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Form Data Snapshot */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Form Data Snapshot
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {Object.entries(activeSubmission.submission.data || {}).map(([key, value]) => (
                    <div key={key} className="p-3 grid grid-cols-3 gap-2 bg-white hover:bg-slate-50">
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

              {/* Approval History Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Approval Workflow History
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {(activeSubmission.approvalHistory || []).length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">
                      Awaiting review from {activeSubmission.submission.current_approver_role || 'Department Manager'}
                    </div>
                  ) : (
                    activeSubmission.approvalHistory.map((apr: any) => (
                      <div key={apr.id} className="p-3 bg-slate-50/60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{apr.approver_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {apr.approver_role}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            apr.decision === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {apr.decision}
                          </span>
                        </div>
                        {apr.comments && (
                          <p className="text-[11px] text-slate-600 mt-1 italic">
                            "{apr.comments}"
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(apr.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => generateOfficialPDF(activeSubmission.submission, activeSubmission.template, activeSubmission.approvalHistory)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                Download Official PDF
              </button>

              <button
                onClick={() => setActiveSubmission(null)}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
