import React, { useState, useEffect } from 'react';
import { Section, Home, User, StaffReport } from '../types';
import { Plus, Video, Users, Building2, BarChart3, Trash2, Edit, AlertCircle, CheckCircle2, ShieldCheck, KeyRound, Upload, Link as LinkIcon, FileVideo, ShieldAlert } from 'lucide-react';

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
  const [videoSourceMode, setVideoSourceMode] = useState<'file' | 'url'>('file');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
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
  const [isProcessingFile, setIsProcessingFile] = useState(false);

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
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin'>('staff');
  const [newStaffHomeId, setNewStaffHomeId] = useState<number>(homes[0]?.id || 1);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<'staff' | 'admin'>('staff');
  const [editingHomeId, setEditingHomeId] = useState<number>(homes[0]?.id || 1);
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);
  const [userActionErr, setUserActionErr] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Reports State
  const [reports, setReports] = useState<StaffReport[]>([]);

  useEffect(() => {
    if (currentUser.role === 'admin') {
      fetchUsers();
      fetchReports();
    }
  }, [currentUser]);

  useEffect(() => {
    if (homes.length > 0) {
      setNewStaffHomeId((current) => (current && homes.some((home) => home.id === current) ? current : homes[0].id));
      setEditingHomeId((current) => (current && homes.some((home) => home.id === current) ? current : homes[0].id));
    }
  }, [homes]);

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
        credentials: 'include',
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
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle local PC video file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadErr(null);

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${fileSizeMB} MB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setVideoUrl(event.target.result as string);
        setIsProcessingFile(false);
      }
    };
    reader.onerror = () => {
      setUploadErr('Failed to read selected video file.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErr(null);
    setUploadMsg(null);

    if (!videoUrl) {
      setUploadErr('Please upload a video file or enter a video URL.');
      return;
    }

    const questions = [
      { question: q1Question, options: q1Opts, correctIndex: q1Correct },
      { question: q2Question, options: q2Opts, correctIndex: q2Correct },
      { question: q3Question, options: q3Opts, correctIndex: q3Correct },
    ];

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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

      setUploadMsg('Training video module and 3 quiz questions created successfully!');
      setVideoTitle('');
      setVideoDesc('');
      setUploadedFileName(null);
      setUploadedFileSize(null);
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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
    setUserActionErr(null);
    setUserActionMsg(null);

    if (!newStaffEmail || !newStaffUsername || !newStaffPassword) {
      setUserActionErr('Email, Username, and Password are required.');
      return;
    }
    if (newStaffPassword.length < 8) {
      setUserActionErr('Password must be at least 8 characters.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newStaffEmail,
          username: newStaffUsername,
          password: newStaffPassword,
          role: newStaffRole,
          homeId: newStaffHomeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUserActionMsg(
        `New ${newStaffRole.toUpperCase()} account created for ${newStaffUsername}. They'll be asked to choose their own password the first time they log in.`
      );
      setNewStaffEmail('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      fetchUsers();
    } catch (e: any) {
      setUserActionErr(e.message || 'Error creating user account');
    }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditingRole(u.role);
    setEditingHomeId(u.homeId ?? homes[0]?.id ?? 1);
    setUserActionErr(null);
    setUserActionMsg(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setUserActionErr(null);
    setUserActionMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: editingRole,
          homeId: editingHomeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setUserActionMsg(`Updated ${editingRole.toUpperCase()} assignment for the selected account.`);
      setEditingUserId(null);
      fetchUsers();
    } catch (e: any) {
      setUserActionErr(e.message || 'Error updating user account');
    }
  };

  const promptDeleteUser = (u: User) => {
    setUserActionErr(null);
    setUserActionMsg(null);

    if (u.id === currentUser.id) {
      setUserActionErr('You cannot delete your own active admin account!');
      return;
    }

    setUserToDelete(u);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    setUserActionErr(null);
    setUserActionMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setUserActionMsg(`User "${userToDelete.username}" (${userToDelete.role}) was deleted successfully.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (e: any) {
      setUserActionErr(e.message || 'Error deleting user');
      setUserToDelete(null);
    } finally {
      setIsDeletingUser(false);
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
            Upload videos from PC or URL, manage staff & admin users, organize sections, and view reports.
          </p>
        </div>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 sm:flex-1 ${
            activeSubTab === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-3.5 h-3.5 shrink-0" /> Upload Video
        </button>
        <button
          onClick={() => setActiveSubTab('sections')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 sm:flex-1 ${
            activeSubTab === 'sections' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" /> Titles/Sections
        </button>
        <button
          onClick={() => setActiveSubTab('homes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 sm:flex-1 ${
            activeSubTab === 'homes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" /> Homes
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 sm:flex-1 ${
            activeSubTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" /> Staff & Admins
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 sm:flex-1 ${
            activeSubTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" /> Completion Reports
        </button>
      </div>

      {/* 1. UPLOAD VIDEO MODULE FORM */}
      {activeSubTab === 'upload' && (
        <form onSubmit={handleUploadVideo} className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
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
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Video Source Selector (PC File Upload vs Web URL) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-indigo-600" /> Video File Source
              </label>

              <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setVideoSourceMode('file')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                    videoSourceMode === 'file' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload from PC
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceMode('url')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                    videoSourceMode === 'url' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Video URL
                </button>
              </div>
            </div>

            {videoSourceMode === 'file' ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl p-6 text-center cursor-pointer transition-all relative">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      Click or drag MP4 video file from your PC
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports MP4, WebM, OGG files directly from your computer
                    </p>
                    {uploadedFileName && (
                      <span className="mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold font-mono">
                        Loaded: {uploadedFileName} ({uploadedFileSize})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Direct Video MP4 URL</label>
                <input
                  type="url"
                  required={videoSourceMode === 'url'}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/.../sample.mp4"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-mono"
                />
              </div>
            )}

            {/* Video Live Preview */}
            {videoUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-600">Video Player Test Preview</span>
                <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-56 flex items-center justify-center border border-slate-800">
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}
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
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium"
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
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium"
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
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessingFile}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {isProcessingFile ? 'Loading Video File...' : 'Publish Training Video Module'}
          </button>
        </form>
      )}

      {/* 2. SECTIONS MANAGEMENT */}
      {activeSubTab === 'sections' && (
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Add Training Section/Title</h3>
          <form onSubmit={handleCreateSection} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Hygiene & Medication Safety"
              value={newSecTitle}
              onChange={(e) => setNewSecTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
            />
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 shrink-0">
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
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Workplace Homes (Currently Hasset & Hope)</h3>
          <form onSubmit={handleCreateHome} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="New Home Name (e.g. Grace Home)"
              value={newHomeName}
              onChange={(e) => setNewHomeName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
            />
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 shrink-0">
              Add Home
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {homes.map((h) => (
              <div key={h.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-indigo-600 shrink-0" />
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

      {/* 4. USER / STAFF & ADMIN MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manage Staff & Admin Accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add new staff or admin users, assign workplace locations, or delete existing user accounts.
              </p>
            </div>
          </div>

          {userActionMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {userActionMsg}
            </div>
          )}
          {userActionErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {userActionErr}
            </div>
          )}

          {/* Add User Form */}
          <form onSubmit={handleCreateUser} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Create New User Account</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sami@videotrain.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. staff_sami"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'staff' | 'admin')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700"
                >
                  <option value="staff">STAFF (Learning Access)</option>
                  <option value="admin">ADMIN (Full Admin Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assigned Location</label>
                <select
                  value={newStaffHomeId}
                  onChange={(e) => setNewStaffHomeId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                >
                  {homes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add User Account
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              The user will be required to set their own password the first time they log in with this one.
            </p>
          </form>

          {/* User List */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Registered Accounts ({allUsers.length})
            </h4>

            {allUsers.map((u) => {
              const isSelf = u.id === currentUser.id;
              const isAdminRole = u.role === 'admin';

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    isAdminRole
                      ? 'bg-indigo-50/50 border-indigo-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-xs shrink-0 ${
                        isAdminRole
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isAdminRole ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900">{u.username}</p>
                        <span className="text-xs text-slate-500">({u.email})</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isAdminRole
                              ? 'bg-indigo-600 text-white font-mono'
                              : 'bg-slate-200 text-slate-700 font-mono'
                          }`}
                        >
                          {u.role}
                        </span>
                        <span className="text-xs text-slate-500">
                          Home: <strong className="text-slate-800">{u.homeName || 'Unassigned'}</strong>
                        </span>
                        {u.mustChangePassword && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                            Awaiting first login
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-wrap items-center gap-2">
                    {editingUserId === u.id ? (
                      <form onSubmit={handleUpdateUser} className="flex flex-wrap items-center gap-2">
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as 'staff' | 'admin')}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700"
                        >
                          <option value="staff">STAFF</option>
                          <option value="admin">ADMIN</option>
                        </select>
                        <select
                          value={editingHomeId}
                          onChange={(e) => setEditingHomeId(parseInt(e.target.value, 10))}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
                        >
                          {homes.map((home) => (
                            <option key={home.id} value={home.id}>
                              {home.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUserId(null)}
                          className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        {!isSelf && (
                          <button
                            onClick={() => startEditUser(u)}
                            className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        {isSelf ? (
                          <span className="px-3 py-1.5 bg-slate-200/80 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Active Session
                          </span>
                        ) : (
                          <button
                            onClick={() => promptDeleteUser(u)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete {isAdminRole ? 'Admin' : 'Staff'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. COMPLETION REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
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

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirm User Deletion</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently delete the <strong className="text-rose-600 uppercase">{userToDelete.role}</strong> account for <strong className="text-slate-900">{userToDelete.username}</strong> ({userToDelete.email})?
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              All training progress data associated with this user will be deleted permanently.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={executeDeleteUser}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                {isDeletingUser ? 'Deleting Account...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

