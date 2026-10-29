import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, FileText, Ticket, HardDrive, ArrowRight, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (tab: string, item: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    sops: any[];
    forms: any[];
    tickets: any[];
    assets: any[];
  }>({ sops: [], forms: [], tickets: [], assets: [] });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // handled by parent
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ sops: [], forms: [], tickets: [], assets: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [sopRes, formRes, tktRes, astRes] = await Promise.all([
          apiRequest(`/sops?search=${encodeURIComponent(query)}`).catch(() => ({ sops: [] })),
          apiRequest(`/forms/submissions?status=&filter=`).catch(() => ({ submissions: [] })),
          apiRequest(`/tickets?search=${encodeURIComponent(query)}`).catch(() => ({ tickets: [] })),
          apiRequest(`/assets?search=${encodeURIComponent(query)}`).catch(() => ({ assets: [] }))
        ]);

        const filteredForms = (formRes.submissions || []).filter((f: any) =>
          f.reference_number?.toLowerCase().includes(query.toLowerCase()) ||
          f.template_name?.toLowerCase().includes(query.toLowerCase()) ||
          f.requester_name?.toLowerCase().includes(query.toLowerCase())
        );

        setResults({
          sops: sopRes.sops || [],
          forms: filteredForms.slice(0, 5),
          tickets: tktRes.tickets || [],
          assets: astRes.assets || []
        });
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.sops.length + results.forms.length + results.tickets.length + results.assets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SOPs, Form Reference (ACPI-HR-IT-...), Tickets (ACPI-IT-...), Assets (AST-...)"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 placeholder-slate-400"
          />
          {loading && <Loader2 className="w-4 h-4 text-cyan-600 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Type keywords, document numbers, or employee names to search across all ACPI modules.
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {/* Tickets */}
              {results.tickets.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <Ticket className="w-3.5 h-3.5 text-cyan-600" />
                    Tickets ({results.tickets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { onSelectResult('tickets', t); onClose(); }}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/40 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-700">{t.ticket_number}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-600">{t.category}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">{t.status}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 mt-1">{t.subject}</p>
                          <p className="text-[11px] text-slate-500">Requester: {t.requester_name} &bull; {t.requester_department}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forms */}
              {results.forms.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Form Submissions ({results.forms.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.forms.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => { onSelectResult('forms', f); onClose(); }}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-700">{f.reference_number}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">{f.status}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 mt-1">{f.template_name}</p>
                          <p className="text-[11px] text-slate-500">By: {f.requester_name} &bull; {f.department}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets */}
              {results.assets.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                    IT Assets ({results.assets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.assets.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => { onSelectResult('assets', a); onClose(); }}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700">{a.asset_id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{a.category}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{a.status}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 mt-1">{a.item_name} ({a.brand} {a.model})</p>
                          <p className="text-[11px] text-slate-500">Loc: {a.location} &bull; Assigned: {a.assigned_to_name || 'In Stock'}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOPs */}
              {results.sops.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    SOPs & Policies ({results.sops.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.sops.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => { onSelectResult('sops', s); onClose(); }}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700">{s.document_number}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{s.version}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 mt-1">{s.title}</p>
                          <p className="text-[11px] text-slate-500">{s.category} &bull; {s.department}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-[11px] text-slate-400">
          Press <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white border border-slate-300 rounded">ESC</kbd> to exit
        </div>
      </div>
    </div>
  );
};
