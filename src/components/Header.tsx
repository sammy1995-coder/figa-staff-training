import React from 'react';
import { User, Home } from '../types';
import { ShieldCheck, MapPin, Menu } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  currentHome: Home | null;
  onOpenHomeSelector: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentHome,
  onOpenHomeSelector,
  onToggleMobileMenu,
}) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
      <div className="flex items-start justify-between w-full sm:w-auto">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'admin' ? 'Administrator Dashboard' : 'Training Dashboard'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.username || 'Staff Member'}</span>.
            {user?.role === 'staff'
              ? ' Complete your assigned training modules & pass the required quiz score to proceed.'
              : ' Training Administration — manage staff, courses, assignments, and completion reports.'}
          </p>
        </div>

        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm shrink-0 ml-3"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        {/* Verified Location Badge */}
        <button
          onClick={onOpenHomeSelector}
          className="bg-white px-3.5 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 transition-all cursor-pointer max-w-full truncate"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">Verified at {currentHome?.name || 'Assigned Home'}</span>
        </button>

        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
          <span>{user?.role === 'admin' ? 'Admin Mode' : 'Staff Trainee'}</span>
        </div>
      </div>
    </header>
  );
};

