import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  Settings,
  Users,
  Shield,
  Hash,
  Database,
  Plus,
  Edit,
  Power,
  KeyRound,
  Save,
  CheckCircle2,
  X,
  Download,
  AlertCircle
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'sequences' | 'backup'>('users');

  // Users Tab state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    username: '',
    password: 'Password123!',
    department: 'Production & Manufacturing',
    job_title: '',
    role_id: 'role_staff',
    reporting_manager: ''
  });

  // Password reset modal
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('Password123!');

  // Roles Matrix state
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('role_staff');
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Settings & Sequences state
  const [settings, setSettings] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiRequest('/admin/users');
      setUsersList(res.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMatrix = async () => {
    try {
      const res = await apiRequest('/admin/roles-matrix');
      setRoles(res.roles || []);
      setPermissions(res.permissions || []);

      const map: Record<string, string[]> = {};
      (res.rolePermissions || []).forEach((rp: any) => {
        if (!map[rp.role_id]) map[rp.role_id] = [];
        map[rp.role_id].push(rp.permission_id);
      });
      setRolePermissions(map);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettingsAndSeqs = async () => {
    try {
      const res = await apiRequest('/admin/settings');
      setSettings(res.settings || []);
      setSequences(res.sequences || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMatrix();
    fetchSettingsAndSeqs();
  }, []);

  const handleToggleUserStatus = async (targetUser: any) => {
    try {
      const res = await apiRequest(`/admin/users/${targetUser.id}/toggle-status`, { method: 'PATCH' });
      alert(res.message);
      fetchUsers();
    } catch (err: any) {
      alert(`Status toggle error: ${err.message}`);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiRequest(`/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(userFormData)
        });
      } else {
        await apiRequest('/admin/users', {
          method: 'POST',
          body: JSON.stringify(userFormData)
        });
      }
      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(`Save user error: ${err.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: passwordModalUser.id,
          newPassword
        })
      });
      alert(`Password for ${passwordModalUser.full_name} has been updated.`);
      setPasswordModalUser(null);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    }
  };

  const togglePermissionForRole = (roleId: string, permId: string) => {
    setRolePermissions(prev => {
      const current = prev[roleId] || [];
      const updated = current.includes(permId)
        ? current.filter(id => id !== permId)
        : [...current, permId];
      return { ...prev, [roleId]: updated };
    });
  };

  const handleSaveRoleMatrix = async () => {
    setSavingMatrix(true);
    try {
      const targetPermissions = rolePermissions[selectedRoleForEdit] || [];
      await apiRequest('/admin/roles-matrix', {
        method: 'PUT',
        body: JSON.stringify({
          role_id: selectedRoleForEdit,
          permission_ids: targetPermissions
        })
      });
      alert('Role permissions updated successfully in live database.');
      fetchMatrix();
    } catch (err: any) {
      alert(`Matrix update error: ${err.message}`);
    } finally {
      setSavingMatrix(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-700" />
            <h2 className="text-lg font-bold text-slate-900">
              System Administration & RBAC Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise user management, live permission matrix editor, sequential counters, and backup snapshots.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'users' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RBAC Permissions Matrix
          </button>
          <button
            onClick={() => setActiveTab('sequences')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'sequences' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Number Sequences
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'backup' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Database Backup
          </button>
        </div>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Manage all enterprise staff accounts, roles, and security statuses.
            </p>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFormData({
                  employee_id: `ACPI-00${usersList.length + 1}`,
                  full_name: '',
                  email: '',
                  username: '',
                  password: 'Password123!',
                  department: 'Production & Manufacturing',
                  job_title: '',
                  role_id: 'role_staff',
                  reporting_manager: 'Hendro Gunawan'
                });
                setShowUserModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Full Name & Email</th>
                    <th className="py-3 px-4">Department & Job Title</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {u.employee_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500">{u.email} ({u.username})</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{u.department}</div>
                        <div className="text-[10px] text-slate-400">{u.job_title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {u.role_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPassword('Password123!');
                            }}
                            className="p-1 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setUserFormData({
                                employee_id: u.employee_id,
                                full_name: u.full_name,
                                email: u.email,
                                username: u.username,
                                password: '',
                                department: u.department,
                                job_title: u.job_title,
                                role_id: u.role_id,
                                reporting_manager: u.reporting_manager || ''
                              });
                              setShowUserModal(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Edit User"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1 rounded ${u.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE RBAC PERMISSION MATRIX (Section 4) */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Live Server-Side RBAC Permission Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure module action permissions per role. Changes immediately affect backend authorization APIs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedRoleForEdit}
                onChange={(e) => setSelectedRoleForEdit(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    Editing Role: {r.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSaveRoleMatrix}
                disabled={savingMatrix}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingMatrix ? 'Saving...' : 'Save Matrix'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map((perm) => {
              const currentRolePerms = rolePermissions[selectedRoleForEdit] || [];
              const isChecked = currentRolePerms.includes(perm.id);

              return (
                <label
                  key={perm.id}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'border-rose-400 bg-rose-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => togglePermissionForRole(selectedRoleForEdit, perm.id)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {perm.module}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {perm.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {perm.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: NUMBER SEQUENCES & FORMATS (Section 8) */}
      {activeTab === 'sequences' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Automatic Document & Ticket Number Sequences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atomic server counters ensuring concurrency safety and uniqueness across forms and tickets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Standard Form Number Format
              </span>
              <div className="font-mono text-sm font-bold text-emerald-800 bg-white p-2.5 rounded-lg border border-slate-200">
                ACPI-HR-IT-[FormType]-[Year]-[Month]-[000-999]
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Scope: Category + Year + Month. Minimum 3 digits (000), expanding to 4 digits if &ge; 1000. Permanent after generation, never reused even if rejected.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Standard Ticket Number Format
              </span>
              <div className="font-mono text-sm font-bold text-cyan-800 bg-white p-2.5 rounded-lg border border-slate-200">
                ACPI-IT-[Year]-[Month]-[0001-9999]
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Scope: Universal IT scope + Year + Month. 4 digits sequence. Concurrency-safe atomic transaction.
              </p>
            </div>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pt-2">
            Active Counter Database Records
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            {sequences.map(seq => (
              <div key={seq.scope_key} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                <div>
                  <span className="font-mono font-bold text-slate-800">{seq.scope_key}</span>
                  <span className="text-[11px] text-slate-500 ml-2">Prefix: {seq.prefix}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px]">Last Seq:</span>
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {seq.current_value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE BACKUP & RESTORE (Section 19) */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Database Persistence & Snapshot Backup
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The ACPI system database is permanently persisted on SQLite disk storage at <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">./data/acpi.sqlite</code>.
            You can export a full JSON snapshot of all business records (Users, SOPs, Form Templates, Submissions, Approvals, Assets, Tickets, Audit Logs) for offline archiving or disaster recovery.
          </p>

          <div className="pt-2">
            <a
              href="/api/admin/backup"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              Download Full Database JSON Snapshot
            </a>
          </div>
        </div>
      )}

      {/* ADD / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingUser ? 'Edit User Profile' : 'Register New Enterprise User'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={userFormData.employee_id}
                  onChange={(e) => setUserFormData({ ...userFormData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Production & Manufacturing">Production & Manufacturing</option>
                    <option value="Quality Assurance & QC">Quality Assurance & QC</option>
                    <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={userFormData.role_id}
                    onChange={(e) => setUserFormData({ ...userFormData, role_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Production Line Supervisor"
                  value={userFormData.job_title}
                  onChange={(e) => setUserFormData({ ...userFormData, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new secure password for {passwordModalUser.full_name}:
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (Min 6 chars)</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold"
                >
                  Set New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
