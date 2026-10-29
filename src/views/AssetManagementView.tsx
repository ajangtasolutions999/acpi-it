import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  HardDrive,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  User,
  Shield,
  ArrowRight,
  Clock,
  History,
  Wrench,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const AssetManagementView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected asset detail drawer
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [assetMaintenance, setAssetMaintenance] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating asset
  const [assetForm, setAssetForm] = useState({
    item_name: '',
    category: 'Laptop',
    brand: '',
    model: '',
    serial_number: '',
    vendor_name: '',
    vendor_contact: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 15000000,
    location: 'Cikarang Plant 1 - Operations Office',
    assigned_to_name: '',
    assigned_employee_id: '',
    department: 'Production & Manufacturing',
    status: 'In Stock',
    warranty_start_date: new Date().toISOString().split('T')[0],
    warranty_end_date: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    remarks: ''
  });

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    new_user: '',
    new_department: 'Supply Chain & Logistics',
    new_location: 'Cikarang Plant 1 - Finished Goods',
    new_status: 'Assigned',
    reason: ''
  });

  const canManageAssets = hasPermission('perm_manage_assets');
  const canDeleteRecords = hasPermission('perm_delete_records');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/assets?search=${encodeURIComponent(search)}&category=${categoryFilter === 'all' ? '' : categoryFilter}&status=${statusFilter === 'all' ? '' : statusFilter}`);
      setAssets(data.assets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, categoryFilter, statusFilter]);

  const viewAssetDetails = async (asset: any) => {
    setSelectedAsset(asset);
    try {
      const res = await apiRequest(`/assets/${asset.id}`);
      setSelectedAsset(res.asset);
      setAssetHistory(res.history || []);
      setAssetMaintenance(res.maintenance || []);
    } catch (e) {
      // ignore
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/assets', {
        method: 'POST',
        body: JSON.stringify(assetForm)
      });
      setShowCreateModal(false);
      fetchAssets();
    } catch (err: any) {
      alert(`Error registering asset: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      await apiRequest(`/assets/${selectedAsset.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...selectedAsset,
          assigned_to_name: transferForm.new_user,
          department: transferForm.new_department,
          location: transferForm.new_location,
          status: transferForm.new_status,
          transfer_reason: transferForm.reason
        })
      });
      setShowTransferModal(false);
      viewAssetDetails({ id: selectedAsset.id });
      fetchAssets();
    } catch (err: any) {
      alert(`Transfer error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset record permanently? (Admin action)')) return;
    try {
      await apiRequest(`/assets/${assetId}`, { method: 'DELETE' });
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Asset ID', 'Item Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Location', 'Assigned To', 'Department', 'Status'];
    const rows = assets.map(a => [
      `"${a.asset_id}"`,
      `"${a.item_name}"`,
      `"${a.category}"`,
      `"${a.brand}"`,
      `"${a.model}"`,
      `"${a.serial_number || ''}"`,
      `"${a.location}"`,
      `"${a.assigned_to_name || 'Unassigned'}"`,
      `"${a.department || ''}"`,
      `"${a.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ACPI_IT_Assets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-slate-900">
              IT Asset Management & Inventory
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized inventory of company IT hardware, servers, switches, peripherals and custody transfer history.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {canManageAssets && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Asset ID (AST-...), brand, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-2xs"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs text-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="Laptop">Laptop</option>
            <option value="Desktop computer">Desktop computer</option>
            <option value="Server">Server</option>
            <option value="Network equipment">Network equipment</option>
            <option value="Firewall">Firewall</option>
            <option value="Printer">Printer</option>
            <option value="Scanner">Scanner / Handheld Barcode</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Assigned">Assigned</option>
            <option value="In Maintenance">In Maintenance</option>
            <option value="Under Warranty Claim">Under Warranty Claim</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Assets Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Item & Specifications</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Plant Location</th>
                <th className="py-3 px-4">Custodian / Assigned User</th>
                <th className="py-3 px-4">Status</th>
                {assets[0]?.purchase_price !== null && <th className="py-3 px-4">Purchase (IDR)</th>}
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading asset inventory...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No IT assets found</td>
                </tr>
              ) : (
                assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {ast.asset_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ast.item_name}</div>
                      <div className="text-[11px] text-slate-500">{ast.brand} {ast.model}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {ast.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ast.location}
                    </td>
                    <td className="py-3 px-4">
                      {ast.assigned_to_name ? (
                        <div>
                          <span className="font-semibold text-slate-900">{ast.assigned_to_name}</span>
                          <span className="text-[10px] text-slate-400 block">{ast.department}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unassigned (In Storage)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ast.status === 'Assigned' ? 'bg-emerald-100 text-emerald-800' :
                        ast.status === 'In Stock' ? 'bg-blue-100 text-blue-800' :
                        ast.status === 'In Maintenance' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ast.status}
                      </span>
                    </td>
                    {ast.purchase_price !== null && (
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        Rp {Number(ast.purchase_price || 0).toLocaleString('id-ID')}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => viewAssetDetails(ast)}
                        className="text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSET DETAILS DRAWER / MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedAsset.asset_id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedAsset.status === 'Assigned' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedAsset.item_name}</h3>
                <p className="text-xs text-slate-500">{selectedAsset.brand} &bull; {selectedAsset.model}</p>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Technical Specifications Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Serial Number</span>
                  <p className="font-mono font-medium text-slate-800">{selectedAsset.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="font-medium text-slate-800">{selectedAsset.location}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Custodian</span>
                  <p className="font-medium text-slate-800">{selectedAsset.assigned_to_name || 'In Stock / IT Staging'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-medium text-slate-800">{selectedAsset.department || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vendor Supplier</span>
                  <p className="font-medium text-slate-800">{selectedAsset.vendor_name || 'Direct Enterprise'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Warranty Expiry</span>
                  <p className="font-medium text-slate-800">{selectedAsset.warranty_end_date || 'Standard Manufacturer'}</p>
                </div>
                {selectedAsset.purchase_price !== null && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Book Purchase Value</span>
                    <p className="font-mono font-bold text-indigo-900 text-sm">
                      Rp {Number(selectedAsset.purchase_price || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {selectedAsset.remarks && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Remarks & Notes</h4>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    {selectedAsset.remarks}
                  </p>
                </div>
              )}

              {/* Assignment & Transfer History Timeline (Section 11) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-700" />
                  Custodian & Department Transfer History
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {assetHistory.length === 0 ? (
                    <div className="p-4 text-slate-400 text-center">Initial registration on file.</div>
                  ) : (
                    assetHistory.map((h) => (
                      <div key={h.id} className="p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{h.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {h.previous_user ? `${h.previous_user} → ` : ''}<strong>{h.new_user || 'None'}</strong> &bull; Dept: {h.new_department || 'General'}
                        </p>
                        {h.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">Note: {h.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                {canDeleteRecords && (
                  <button
                    onClick={() => handleDeleteAsset(selectedAsset.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Asset
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManageAssets && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Transfer Custody
                  </button>
                )}
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW ASSET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Register New IT Asset</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 5540 Workstation"
                  value={assetForm.item_name}
                  onChange={(e) => setAssetForm({ ...assetForm, item_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop computer">Desktop computer</option>
                    <option value="Server">Server</option>
                    <option value="Network equipment">Network equipment</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Printer">Printer</option>
                    <option value="Scanner">Scanner</option>
                    <option value="Biometric device">Biometric device</option>
                    <option value="Software license">Software license</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell, Cisco, Zebra, Lenovo"
                    value={assetForm.brand}
                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Latitude 5540 i7"
                    value={assetForm.model}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Serial or Service Tag"
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
                  <select
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Cikarang Plant 1 - Operations Office">Cikarang Plant 1 - Operations Office</option>
                    <option value="Cikarang Plant 1 - Server Room">Cikarang Plant 1 - Server Room</option>
                    <option value="Cikarang Plant 1 - QA Laboratory">Cikarang Plant 1 - QA Laboratory</option>
                    <option value="Cikarang Plant 2 - Filling Hub">Cikarang Plant 2 - Filling Hub</option>
                    <option value="Jakarta Head Office">Jakarta Head Office</option>
                    <option value="Finished Goods Warehouse">Finished Goods Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price (IDR)</label>
                  <input
                    type="number"
                    value={assetForm.purchase_price}
                    onChange={(e) => setAssetForm({ ...assetForm, purchase_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

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
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Registering...' : 'Register Asset (Auto ID)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER ASSET MODAL */}
      {showTransferModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Transfer Asset Custody</h3>
            <p className="text-xs text-slate-500 mb-4">
              Transfer {selectedAsset.item_name} ({selectedAsset.asset_id}) to another employee or department.
            </p>

            <form onSubmit={handleTransferAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Custodian / User *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hendro Gunawan"
                  value={transferForm.new_user}
                  onChange={(e) => setTransferForm({ ...transferForm, new_user: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Department *</label>
                <select
                  value={transferForm.new_department}
                  onChange={(e) => setTransferForm({ ...transferForm, new_department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Production & Manufacturing">Production & Manufacturing</option>
                  <option value="Quality Assurance & QC">Quality Assurance & QC</option>
                  <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Handover *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Reassigned following plant floor restructuring"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Updating...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
