import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  Clock,
  Shield,
  History,
  Download,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';

export const SOPView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [docVersions, setDocVersions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    document_number: '',
    category: 'Information Security',
    department: 'Information Technology',
    description: '',
    version: 'v1.0',
    effective_date: new Date().toISOString().split('T')[0],
    review_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content_body: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const canManageSOPs = hasPermission('perm_manage_sops');

  const fetchSOPs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/sops?search=${encodeURIComponent(search)}`);
      setSops(data.sops || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOPs();
  }, [search]);

  const viewDocument = async (doc: any) => {
    setActiveDoc(doc);
    try {
      const data = await apiRequest(`/sops/${doc.id}`);
      setDocVersions(data.versions || []);
    } catch (e) {
      setDocVersions([]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/sops', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        document_number: '',
        category: 'Information Security',
        department: 'Information Technology',
        description: '',
        version: 'v1.0',
        effective_date: new Date().toISOString().split('T')[0],
        review_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        content_body: ''
      });
      fetchSOPs();
    } catch (err: any) {
      alert(`Error creating SOP: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(sops.map(s => s.category)))];
  const filtered = selectedCategory === 'all' ? sops : sops.filter(s => s.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-700" />
            <h2 className="text-lg font-bold text-slate-900">
              SOP & IT Policy Repository
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official company standard operating procedures, technical guidelines, and IT policies.
          </p>
        </div>

        {canManageSOPs && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Publish New SOP
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SOP title, document number, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* SOP Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading authorized policies...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">No SOP documents found</p>
          <p className="text-xs text-slate-400 mt-1">Try refining your search keyword or selected category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-cyan-500 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {doc.document_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {doc.version}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {doc.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                  {doc.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {doc.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Effective: {doc.effective_date}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-end">
                <button
                  onClick={() => viewDocument(doc)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                >
                  Read Full Policy
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Reader / Details Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-800 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                    {activeDoc.document_number}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Current Version: {activeDoc.version}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {activeDoc.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{activeDoc.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Owner Department: {activeDoc.department} &bull; Effective Date: {activeDoc.effective_date}
                </p>
              </div>
              <button
                onClick={() => setActiveDoc(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Executive Summary & Scope
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {activeDoc.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Document Instructions & Policy Body
                </h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                  {activeDoc.content_body || 'Standard policy text active and on file at ACPI IT Dept.'}
                </div>
              </div>

              {/* Version Control History (Section 6) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-cyan-700" />
                  Document Revision & Version Control History
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {docVersions.length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">Version {activeDoc.version} is the initial publication.</div>
                  ) : (
                    docVersions.map((v) => (
                      <div key={v.id} className="p-3 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{v.version}</span>
                            <span className="text-[11px] text-slate-500">{v.effective_date}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{v.change_summary}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          Archived
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                PT Alliance Consumer Products Indonesia &bull; Controlled Document
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-white transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print SOP
                </button>
                <button
                  onClick={() => setActiveDoc(null)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish New SOP Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-700" />
                <h3 className="text-base font-bold text-slate-900">Publish New SOP / IT Policy</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACPI-SOP-IT-006"
                    value={createForm.document_number}
                    onChange={(e) => setCreateForm({ ...createForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v1.0"
                    value={createForm.version}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Backup, Retention & Disaster Recovery Procedure"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="Information Security">Information Security</option>
                    <option value="Access Management">Access Management</option>
                    <option value="Asset Management">Asset Management</option>
                    <option value="Incident Management">Incident Management</option>
                    <option value="Procurement Policy">Procurement Policy</option>
                    <option value="Manufacturing Work Instruction">Manufacturing Work Instruction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department Owner *</label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Production & Manufacturing">Production & Manufacturing</option>
                    <option value="Quality Assurance & QC">Quality Assurance & QC</option>
                    <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.effective_date}
                    onChange={(e) => setCreateForm({ ...createForm, effective_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review Date</label>
                  <input
                    type="date"
                    value={createForm.review_date}
                    onChange={(e) => setCreateForm({ ...createForm, review_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Purpose *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summary of scope, purpose, and affected personnel."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Content & Work Steps *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Enter step-by-step instructions, standard rules, compliance guidelines..."
                  value={createForm.content_body}
                  onChange={(e) => setCreateForm({ ...createForm, content_body: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish SOP Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
