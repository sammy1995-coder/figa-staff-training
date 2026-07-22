import React, { useState, useEffect } from 'react';
import { Section, Home, User, StaffReport } from '../types';
import { Plus, Video, Users, Building2, BarChart3, Trash2, Edit, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  sections: Section[];
  homes: Home[];
  onRefreshData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, sections, homes, onRefreshData }) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'sections' | 'homes' | 'users' | 'reports'>('upload');

  // Video Upload State
  const [selectedSectionId, setSelectedSectionId] = useState<number>(sections[0]?.id || 1);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [duration, setDuration] = useState(180);

  // 3 Quiz Questions State
  const [q1Question, setQ1Question] = useState('What is the primary action when alarm sounds?');
  const [q1Opts, setQ1Opts] = useState(['Ignore alarm', 'Evacuate immediately', 'Wait 1 hour', 'Lock door']);
  const [q1Correct, setQ1Correct] = useState(1);

  const [q2Question, setQ2Question] = useState('Where should staff gather after evacuating?');
  const [q2Opts, setQ2Opts] = useState(['Inside kitchen', 'Outside assembly point', 'In parking space', 'In elevator']);
  const [q2Correct, setQ2Correct] = useState(1);

  const [q3Question, setQ3Question] = useState('How often are fire drills required?');
  const [q3Opts, setQ3Opts] = useState(['Every 10 years', 'Regularly per policy', 'Never', 'Once on real fire']);
  const [q3Correct, setQ3Correct] = useState(1);

  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Home Creation State
  const [newHomeName, setNewHomeName] = useState('');
  const [newHomeCode, setNewHomeCode] = useState('');

  // Section Creation State
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecDesc, setNewSecDesc] = useState('');

  // User Management State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin'>('staff');
  const [newStaffHomeId, setNewStaffHomeId] = useState<number>(homes[0]?.id || 1);

  // Reports State
  const [reports, setReports] = useState<StaffReport[]>([]);

  useEffect(() => {
    if (currentUser.role === 'admin') {
      fetchUsers();
      fetchReports();
    }
  }, [currentUser]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Only Administrator accounts have permission to upload training videos, create sections, manage workplace homes, or view staff completion reports.
        </p>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'X-User-Id': currentUser.id.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { 'X-User-Id': currentUser.id.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErr(null);
    setUploadMsg(null);

    const questions = [
      { question: q1Question, options: q1Opts, correctIndex: q1Correct },
      { question: q2Question, options: q2Opts, correctIndex: q2Correct },
      { question: q3Question, options: q3Opts, correctIndex: q3Correct },
    ];

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          title: videoTitle,
          description: videoDesc,
          url: videoUrl,
          durationSeconds: duration,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload video');

      setUploadMsg('Video training module and 3 quiz questions created successfully!');
      setVideoTitle('');
      setVideoDesc('');
      onRefreshData();
    } catch (err: any) {
      setUploadErr(err.message || 'Error creating video module');
    }
  };

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeName) return;
    try {
      const res = await fetch('/api/homes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({ name: newHomeName, code: newHomeCode }),
      });
      if (res.ok) {
        setNewHomeName('');
        setNewHomeCode('');
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecTitle) return;
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({ title: newSecTitle, description: newSecDesc }),
      });
      if (res.ok) {
        setNewSecTitle('');
        setNewSecDesc('');
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail || !newStaffUsername) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({
          email: newStaffEmail,
          username: newStaffUsername,
          role: newStaffRole,
          homeId: newStaffHomeId,
        }),
      });
      if (res.ok) {
        setNewStaffEmail('');
        setNewStaffUsername('');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id.toString() },
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Admin Management Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload videos, organize section titles, manage staff & home access, and view progress reports.
          </p>
        </div>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Upload Video
        </button>
        <button
          onClick={() => setActiveSubTab('sections')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'sections' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Titles/Sections
        </button>
        <button
          onClick={() => setActiveSubTab('homes')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'homes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Homes
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Staff
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Completion Reports
        </button>
      </div>

      {/* 1. UPLOAD VIDEO MODULE FORM */}
      {activeSubTab === 'upload' && (
        <form onSubmit={handleUploadVideo} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Add New Training Video & 3 Quiz Questions
          </h3>

          {uploadMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {uploadMsg}
            </div>
          )}
          {uploadErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {uploadErr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Title</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Video Title</label>
              <input
                type="text"
                required
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Infection Control Standards"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Video MP4 URL</label>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://commondatastorage.googleapis.com/.../sample.mp4"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="font-bold text-sm text-slate-800">Mandatory 3 Quiz Questions (2/3 score required to pass)</h4>

            {/* Q1 */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-indigo-600 uppercase">Question 1</label>
              <input
                type="text"
                required
                value={q1Question}
                onChange={(e) => setQ1Question(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs"
              />
            </div>

            {/* Q2 */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-indigo-600 uppercase">Question 2</label>
              <input
                type="text"
                required
                value={q2Question}
                onChange={(e) => setQ2Question(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs"
              />
            </div>

            {/* Q3 */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-indigo-600 uppercase">Question 3</label>
              <input
                type="text"
                required
                value={q3Question}
                onChange={(e) => setQ3Question(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200"
          >
            Publish Training Video Module
          </button>
        </form>
      )}

      {/* 2. SECTIONS MANAGEMENT */}
      {activeSubTab === 'sections' && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Add Training Section/Title</h3>
          <form onSubmit={handleCreateSection} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Hygiene & Medication Safety"
              value={newSecTitle}
              onChange={(e) => setNewSecTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
            />
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200">
              Add Section
            </button>
          </form>

          <div className="space-y-3 pt-4">
            {sections.map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{s.title}</h4>
                  <p className="text-xs text-slate-500">{s.videos.length} videos inside</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. HOMES LOCATION MANAGEMENT */}
      {activeSubTab === 'homes' && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Workplace Homes (Currently Hasset & Hope)</h3>
          <form onSubmit={handleCreateHome} className="flex gap-2">
            <input
              type="text"
              placeholder="New Home Name (e.g. Grace Home)"
              value={newHomeName}
              onChange={(e) => setNewHomeName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
            />
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200">
              Add Home
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {homes.map((h) => (
              <div key={h.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{h.name}</h4>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                    CODE: {h.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USER / STAFF MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Staff & Admin Users</h3>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="email"
              placeholder="Email"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="text"
              placeholder="Username"
              value={newStaffUsername}
              onChange={(e) => setNewStaffUsername(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <select
              value={newStaffHomeId}
              onChange={(e) => setNewStaffHomeId(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {homes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <button type="submit" className="py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">
              Add Staff
            </button>
          </form>

          <div className="space-y-3 pt-4">
            {allUsers.map((u) => (
              <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">{u.username} ({u.email})</p>
                  <p className="text-xs text-slate-500">
                    Role: <strong className="text-indigo-600 uppercase">{u.role}</strong> • Home: {u.homeName || 'Unassigned'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. COMPLETION REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Staff Training Completion Report</h3>
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.userId} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{r.username} ({r.email})</h4>
                    <span className="text-xs text-slate-500">Location: {r.homeName}</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-600 text-base">{r.overallPercentage}% FINISHED</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${r.overallPercentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
