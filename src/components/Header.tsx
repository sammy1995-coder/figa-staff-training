import React from 'react';
import { User, Home } from '../types';
import { ShieldCheck, MapPin, Bell, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  currentHome: Home | null;
  onOpenHomeSelector: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, currentHome, onOpenHomeSelector }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Training Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, <span className="font-semibold text-slate-800">{user?.username || 'Staff Member'}</span>.
          {user?.role === 'staff'
            ? ' Complete mandatory video modules & pass 2/3 quiz score to proceed.'
            : ' Managing courses, homes, and staff progress reports.'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Verified Location Badge */}
        <button
          onClick={onOpenHomeSelector}
          className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 transition-all cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          <span>Verified at {currentHome?.name || 'Assigned Home'}</span>
        </button>

        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>{user?.role === 'admin' ? 'Admin Mode' : 'Staff Trainee'}</span>
        </div>
      </div>
    </header>
  );
};
