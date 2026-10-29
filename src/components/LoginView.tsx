import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Shield, ArrowRight, AlertCircle, Info, KeyRound } from 'lucide-react';

const DEMO_USERS = [
  { username: 'staff', name: 'Budi Santoso', role: 'Staff / End User', dept: 'Supply Chain & Logistics', color: 'border-slate-300 hover:border-blue-500' },
  { username: 'supervisor', name: 'Siti Rahmawati', role: 'Supervisor', dept: 'Quality Assurance & QC', color: 'border-slate-300 hover:border-blue-500' },
  { username: 'manager', name: 'Hendro Gunawan', role: 'Manager', dept: 'Production & Manufacturing', color: 'border-slate-300 hover:border-emerald-500' },
  { username: 'gm', name: 'Ir. Surya Kusuma', role: 'General Manager', dept: 'Executive Management', color: 'border-slate-300 hover:border-purple-500' },
  { username: 'vp', name: 'Tan Sri Robert Chen', role: 'Vice President', dept: 'Executive Operations', color: 'border-slate-300 hover:border-amber-500' },
  { username: 'itstaff', name: 'Farhan Maulana', role: 'IT Staff', dept: 'Information Technology', color: 'border-slate-300 hover:border-cyan-500' },
  { username: 'headit', name: 'Rian Pratama', role: 'Head of IT', dept: 'Information Technology', color: 'border-slate-300 hover:border-indigo-500' },
  { username: 'admin', name: 'David Hartono', role: 'System Admin', dept: 'Information Technology', color: 'border-slate-300 hover:border-rose-500' }
];

export const LoginView: React.FC = () => {
  const { login, switchDemoUser } = useAuth();
  const [username, setUsername] = useState('headit');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (demoUsername: string) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoUser(demoUsername);
    } catch (err: any) {
      setError(err.message || 'Error signing into demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background visual styling */}
      <div className="absolute inset-0 bg-radial from-slate-800 to-slate-950 opacity-90 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border border-slate-200">
            <img
              src="/assets/aistudio/LogoACPIPNG_369387c8.png"
              alt="PT Alliance Consumer Products Indonesia Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          PT Alliance Consumer Products Indonesia
        </h2>
        <p className="mt-1 text-center text-sm text-cyan-400 font-medium">
          Information Management & IT Ticketing System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Username or Corporate Email
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 transition"
                  placeholder="e.g. headit or headit@acpi.co.id"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 transition"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-cyan-600" />
                256-bit Encrypted Session
              </span>
              <span>WIB Timezone</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-cyan-700 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-600 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Enterprise Portal
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-600" />
                Quick Role Tester (One-Click Sign In)
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click any of the 8 enterprise roles below to test RBAC capabilities instantly:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleDemoClick(u.username)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 transition flex flex-col group cursor-pointer bg-slate-50/60"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 truncate">
                      {u.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {u.role.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate mt-0.5">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          PT Alliance Consumer Products Indonesia &bull; ISO 27001 & Corporate Manufacturing Compliance
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-cyan-700 mb-3">
              <KeyRound className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Password Reset Assistance</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              In accordance with ACPI IT Security Policy (ACPI-SOP-IT-001), automated public email resets are disabled for security compliance.
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5 mb-5">
              <p className="font-semibold text-slate-900">Default Demo Credentials:</p>
              <p>&bull; Password for all seed test accounts: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-cyan-800">Password123!</code></p>
              <p>&bull; Or sign in using the <strong>System Admin</strong> account to reset any employee password via the Administration module.</p>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 px-4 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
