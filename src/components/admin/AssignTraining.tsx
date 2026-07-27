import React, { useEffect, useMemo, useState } from 'react';
import { Section, User, CourseAssignment } from '../../types';
import { Search, CheckSquare, Square, CalendarClock, ShieldAlert, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

interface AssignTrainingProps {
  sections: Section[];
}

export const AssignTraining: React.FC<AssignTrainingProps> = ({ sections }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());
  const [required, setRequired] = useState(true);
  const [dueDate, setDueDate] = useState('');

  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentAssignments, setCurrentAssignments] = useState<CourseAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<CourseAssignment | null>(null);
  const [removing, setRemoving] = useState(false);

  const activeSections = sections.filter((s) => !s.isArchived);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/users?role=staff', { credentials: 'include' });
      if (res.ok) setStaff(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const singleSelectedStaffId = selectedStaffIds.size === 1 ? [...selectedStaffIds][0] : null;

  useEffect(() => {
    if (singleSelectedStaffId === null) {
      setCurrentAssignments([]);
      return;
    }
    fetchAssignmentsFor(singleSelectedStaffId);
  }, [singleSelectedStaffId]);

  const fetchAssignmentsFor = async (staffId: number) => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/assignments`, { credentials: 'include' });
      if (res.ok) setCurrentAssignments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [staff, staffSearch]);

  const toggleStaff = (id: number) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (id: number) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    setError(null);
    setMessage(null);
    if (selectedStaffIds.size === 0 || selectedSectionIds.size === 0) {
      setError('Select at least one staff member and one course.');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/admin/assignments/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [...selectedStaffIds],
          sectionIds: [...selectedSectionIds],
          required,
          dueDate: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign training');

      setMessage(
        data.created > 0
          ? `Assigned ${data.created} course/staff pairing${data.created === 1 ? '' : 's'}.${
              data.skipped > 0 ? ` (${data.skipped} already assigned, skipped.)` : ''
            }`
          : `No new assignments created — all selected pairings were already assigned.`
      );
      setSelectedSectionIds(new Set());
      if (singleSelectedStaffId !== null) fetchAssignmentsFor(singleSelectedStaffId);
    } catch (err: any) {
      setError(err.message || 'Failed to assign training');
    } finally {
      setAssigning(false);
    }
  };

  const executeRemoveAssignment = async () => {
    if (!assignmentToRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentToRemove.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove assignment');
      setMessage(`Unassigned "${assignmentToRemove.sectionTitle}".`);
      setAssignmentToRemove(null);
      if (singleSelectedStaffId !== null) fetchAssignmentsFor(singleSelectedStaffId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove assignment');
      setAssignmentToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Assign Training</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select one or more staff members and one or more courses, then assign. Staff only see courses assigned to
          them.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Staff picker */}
        <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Staff Members</h3>
            <span className="text-xs font-bold text-indigo-600">{selectedStaffIds.size} selected</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filteredStaff.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No staff found.</p>}
            {filteredStaff.map((s) => {
              const isSelected = selectedStaffIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.username}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Course picker */}
        <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Courses</h3>
            <span className="text-xs font-bold text-indigo-600">{selectedSectionIds.size} selected</span>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5 pt-1">
            {activeSections.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No courses available. Create one first.</p>
            )}
            {activeSections.map((s) => {
              const isSelected = selectedSectionIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSection(s.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.title}</p>
                    <p className="text-xs text-slate-400 truncate">{s.videos.length} videos</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Options + Assign button */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="w-4 h-4" />
            Required training
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <CalendarClock className="w-4 h-4 text-slate-400" />
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </label>
        </div>
        <button
          onClick={handleAssign}
          disabled={assigning}
          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all"
        >
          {assigning ? 'Assigning...' : 'Assign Selected Training'}
        </button>
      </div>

      {/* Current assignments for a single selected staff member */}
      {singleSelectedStaffId !== null && (
        <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-base">
            Current Assignments — {staff.find((s) => s.id === singleSelectedStaffId)?.username}
          </h3>
          {loadingAssignments ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
          ) : currentAssignments.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-sm text-slate-500 flex flex-col items-center gap-1">
              <ShieldAlert className="w-5 h-5 text-slate-300" />
              No courses assigned yet.
            </div>
          ) : (
            <div className="space-y-2">
              {currentAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.sectionTitle}</p>
                    <p className="text-xs text-slate-400">
                      {a.required ? 'Required' : 'Optional'} • {a.completedVideos}/{a.totalVideos} videos •{' '}
                      {a.completionPercentage}% • {a.status.replace('_', ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setAssignmentToRemove(a)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Unassign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {assignmentToRemove && (
        <ConfirmDialog
          title="Unassign course?"
          description={`Remove "${assignmentToRemove.sectionTitle}" from this staff member? They will lose access to it immediately.`}
          confirmLabel="Unassign"
          loadingLabel="Removing..."
          isLoading={removing}
          onConfirm={executeRemoveAssignment}
          onCancel={() => setAssignmentToRemove(null)}
        />
      )}
    </div>
  );
};
