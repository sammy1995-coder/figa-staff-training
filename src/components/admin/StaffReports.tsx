import React, { useEffect, useMemo, useState } from 'react';
import { StaffReport } from '../../types';
import { Search, ArrowUpDown, ChevronRight, BarChart3 } from 'lucide-react';

interface StaffReportsProps {
  onSelectStaff: (staffId: number) => void;
}

type SortKey = 'completionPercentage' | 'lastActivity';
type StatusFilter = 'all' | StaffReport['status'];

const STATUS_LABEL: Record<StaffReport['status'], string> = {
  no_assignments: 'No assignments',
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

const STATUS_BADGE: Record<StaffReport['status'], string> = {
  no_assignments: 'bg-slate-100 text-slate-500',
  not_started: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export const StaffReports: React.FC<StaffReportsProps> = ({ onSelectStaff }) => {
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('completionPercentage');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/reports', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reports');
        setReports(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'completionPercentage') {
        cmp = a.completionPercentage - b.completionPercentage;
      } else {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        cmp = aTime - bTime;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [reports, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) return <div className="text-sm text-slate-500 p-8 text-center">Loading reports…</div>;
  if (error) return <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">{error}</div>;

  return (
    <div className="space-y-6 select-none">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" /> Staff Reports
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Completion percentage is only a summary — click a staff member for full activity detail.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold"
        >
          <option value="all">All statuses</option>
          <option value="no_assignments">No assignments</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[32px] border border-slate-200">
          <p className="text-sm text-slate-500">No staff match these filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] uppercase font-bold text-slate-500">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Completed / Outstanding</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('completionPercentage')} className="flex items-center gap-1">
                      Completion <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Avg Quiz</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('lastActivity')} className="flex items-center gap-1">
                      Last Activity <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.userId}
                    onClick={() => onSelectStaff(r.userId)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 text-xs">{r.username}</p>
                      <p className="text-[11px] text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.assignedCourses}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.completedVideos} / {r.outstandingVideos} outstanding
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600" style={{ width: `${r.completionPercentage}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{r.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.avgQuizScore === null ? '—' : `${r.avgQuizScore}%`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
