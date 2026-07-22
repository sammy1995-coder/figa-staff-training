import React from 'react';
import { User } from '../types';
import { LayoutGrid, BookOpen, Building2, BarChart3, LogOut, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  user: User | null;
  activeTab: 'dashboard' | 'courses' | 'homes' | 'reports' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'courses' | 'homes' | 'reports' | 'admin') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  return (
    <aside className="w-64 bg-slate-900 flex flex-col p-6 text-white border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30">
          V
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-white block">VideoTrain</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
            Staff Portal
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-semibold'
              : 'text-slate-400 hover:bg-slate-800/60 border-transparent hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
            activeTab === 'courses'
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-semibold'
              : 'text-slate-400 hover:bg-slate-800/60 border-transparent hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Training Modules
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
              activeTab === 'admin'
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 border-transparent hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Admin Control
          </button>
        )}
      </nav>

      {/* User Footer Card */}
      <div className="mt-auto">
        {user ? (
          <div className="p-4 bg-slate-800/80 rounded-2xl flex items-center justify-between border border-slate-700/80 shadow-md">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-white">{user.username}</p>
                <p className="text-xs text-slate-400 truncate">
                  {user.role === 'admin' ? 'Admin Owner' : 'Staff'} • {user.homeName || 'Location Verified'}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Log out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 bg-slate-800 rounded-2xl text-center border border-slate-700">
            <p className="text-xs text-slate-400">Not logged in</p>
          </div>
        )}
      </div>
    </aside>
  );
};
