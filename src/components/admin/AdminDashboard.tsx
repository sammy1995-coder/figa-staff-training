import React, { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  Video as VideoIcon,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { AdminDashboardSummary } from '../../types';
import { AdminTab } from '../Sidebar';

interface AdminDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard-summary', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard summary');
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard summary');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500 p-8 text-center">Loading dashboard…</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
        {error || 'Failed to load dashboard summary'}
      </div>
    );
  }

  const { summary, recentActivity, outstandingTraining } = data;

  const summaryCards = [
    { label: 'Active Staff', value: summary.totalActiveStaff, icon: Users, color: 'indigo' },
    { label: 'Active Courses', value: summary.totalActiveCourses, icon: BookOpen, color: 'emerald' },
    { label: 'Published Videos', value: summary.totalPublishedVideos, icon: VideoIcon, color: 'sky' },
    { label: 'Active Assignments', value: summary.totalActiveAssignments, icon: ClipboardList, color: 'amber' },
    { label: 'Completion Rate', value: `${summary.overallCompletionRate}%`, icon: TrendingUp, color: 'violet' },
    { label: 'Outstanding Required', value: summary.staffWithOutstandingRequiredTraining, icon: AlertTriangle, color: 'rose' },
  ];

  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  return (
    <div className="space-y-6 select-none">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorClasses[c.color]}`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Management Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => onNavigate('assign')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-5 text-left shadow-lg shadow-indigo-200 transition-all flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-sm">Assign Training</p>
            <p className="text-xs text-indigo-100 mt-0.5">Assign courses to staff</p>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>
        <button
          onClick={() => onNavigate('manage')}
          className="bg-white hover:bg-slate-50 text-slate-900 rounded-2xl p-5 text-left border border-slate-200 shadow-sm transition-all flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-sm">Manage Courses</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload videos, edit, archive</p>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 text-slate-400" />
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className="bg-white hover:bg-slate-50 text-slate-900 rounded-2xl p-5 text-left border border-slate-200 shadow-sm transition-all flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-sm">View Reports</p>
            <p className="text-xs text-slate-500 mt-0.5">Staff completion & activity</p>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Outstanding Training Overview */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Outstanding Training</h3>
            <button onClick={() => onNavigate('reports')} className="text-xs text-indigo-600 font-bold hover:underline">
              View Reports
            </button>
          </div>
          <p className="text-xs text-slate-500">
            <strong className="text-slate-900">{outstandingTraining.staffCount}</strong> staff member
            {outstandingTraining.staffCount === 1 ? '' : 's'} have incomplete required training.
          </p>
          {outstandingTraining.topCourses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No outstanding required training. 🎉</p>
          ) : (
            <div className="space-y-2">
              {outstandingTraining.topCourses.map((c) => (
                <div key={c.sectionId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-800 truncate">{c.title}</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
                    {c.incompleteCount} incomplete
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {recentActivity.assignments.map((a) => (
              <div key={`a-${a.id}`} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-50">
                <ClipboardList className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-slate-600 truncate flex-1">
                  <strong className="text-slate-800">{a.username || 'A staff member'}</strong> assigned{' '}
                  <strong className="text-slate-800">{a.sectionTitle || 'a course'}</strong>
                </span>
                <span className="text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(a.assignedAt)}
                </span>
              </div>
            ))}
            {recentActivity.completions.map((c) => (
              <div key={`c-${c.id}`} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-50">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-600 truncate flex-1">
                  <strong className="text-slate-800">{c.username || 'A staff member'}</strong> completed{' '}
                  <strong className="text-slate-800">{c.videoTitle || 'a video'}</strong>
                </span>
                <span className="text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(c.updatedAt)}
                </span>
              </div>
            ))}
            {recentActivity.videos.map((v) => (
              <div key={`v-${v.id}`} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-50">
                <VideoIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="text-slate-600 truncate flex-1">
                  Video <strong className="text-slate-800">{v.title}</strong> uploaded
                </span>
                <span className="text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(v.createdAt)}
                </span>
              </div>
            ))}
            {recentActivity.assignments.length === 0 &&
              recentActivity.completions.length === 0 &&
              recentActivity.videos.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No recent activity yet.</p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
