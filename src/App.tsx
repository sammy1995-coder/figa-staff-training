import React, { useState, useEffect } from 'react';
import { Home, User, Section, Video } from './types';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { BentoDashboard } from './components/BentoDashboard';
import { CourseCatalog } from './components/CourseCatalog';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AssignTraining } from './components/admin/AssignTraining';
import { StaffReports } from './components/admin/StaffReports';
import { StaffDetail } from './components/admin/StaffDetail';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showHomeVerifyModal, setShowHomeVerifyModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetchHomes();
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSections();
    } else {
      setActiveTab('dashboard');
    }
  }, [user]);

  // Best-effort URL sync for /admin/staff/:id — supports refresh/back-button
  // without pulling in a router dependency for one page.
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const match = window.location.pathname.match(/^\/admin\/staff\/(\d+)/);
    if (match) {
      setSelectedStaffId(parseInt(match[1], 10));
      setActiveTab('reports');
    }
  }, [user]);

  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/admin\/staff\/(\d+)/);
      setSelectedStaffId(match ? parseInt(match[1], 10) : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const restoreSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    } finally {
      setCheckingSession(false);
    }
  };

  const fetchHomes = async () => {
    try {
      const res = await fetch('/api/homes');
      if (res.ok) {
        const data = await res.json();
        setHomes(data);
      }
    } catch (err) {
      console.error('Failed to fetch homes:', err);
    }
  };

  const fetchSections = async () => {
    try {
      // Admins manage archived content too — staff never receive it (the
      // server ignores this param for non-admins regardless).
      const query = user?.role === 'admin' ? '?includeArchived=true' : '';
      const res = await fetch(`/api/sections${query}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSections(data);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    }
  };

  const currentHome = homes.find((h) => h.id === user?.homeId) || homes[0] || null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Failed to log out cleanly:', err);
    }
    setUser(null);
    setSelectedVideo(null);
    setSelectedStaffId(null);
    setActiveTab('dashboard');
  };

  // Purely a local/optimistic UI update for course-list cards — actual
  // server persistence now happens inside VideoPlayerModal via watch
  // sessions (src/lib/videoTracking.ts), not this callback.
  const handleProgressUpdate = (videoId: number, percentage: number) => {
    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        videos: sec.videos.map((vid) =>
          vid.id === videoId
            ? {
                ...vid,
                percentage: Math.max(vid.percentage || 0, percentage),
                watchedFinished: percentage >= 95 || vid.watchedFinished,
              }
            : vid
        ),
      }))
    );
  };

  const handleQuizComplete = () => {
    fetchSections();
  };

  const handleSelectStaff = (staffId: number) => {
    setSelectedStaffId(staffId);
    if (window.history?.pushState) {
      window.history.pushState({}, '', `/admin/staff/${staffId}`);
    }
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    setSelectedStaffId(null);
    setActiveTab(tab);
    if (window.history?.pushState) {
      window.history.pushState({}, '', '/');
    }
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f1f5f9]">
        <div className="text-sm font-semibold text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginModal
        homes={homes}
        onLoginSuccess={(u) => {
          setUser(u);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onLogout={handleLogout}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col w-full">
        <Header
          user={user}
          currentHome={currentHome}
          onOpenHomeSelector={() => setShowHomeVerifyModal(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Tab Views */}
        {isAdmin ? (
          selectedStaffId !== null ? (
            <StaffDetail staffId={selectedStaffId} onBack={() => setSelectedStaffId(null)} />
          ) : (
            <>
              {activeTab === 'dashboard' && <AdminDashboard onNavigate={handleSetActiveTab} />}
              {activeTab === 'assign' && <AssignTraining sections={sections} />}
              {activeTab === 'manage' && (
                <AdminPanel currentUser={user} sections={sections} homes={homes} onRefreshData={() => { fetchHomes(); fetchSections(); }} />
              )}
              {activeTab === 'reports' && <StaffReports onSelectStaff={handleSelectStaff} />}
            </>
          )
        ) : (
          <>
            {activeTab === 'dashboard' && <BentoDashboard sections={sections} onSelectVideo={(vid) => setSelectedVideo(vid)} />}
            {activeTab === 'courses' && <CourseCatalog sections={sections} onSelectVideo={(vid) => setSelectedVideo(vid)} />}
          </>
        )}

        {/* Video Player & Quiz Modal */}
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            currentUser={user}
            onClose={() => {
              setSelectedVideo(null);
              fetchSections();
            }}
            onProgressUpdate={handleProgressUpdate}
            onQuizComplete={handleQuizComplete}
          />
        )}

        {/* Home Verification Modal */}
        {showHomeVerifyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Verify Home Location Access</h3>
              <p className="text-xs text-slate-500">
                You are currently verified for <strong className="text-slate-800">{currentHome?.name}</strong>.
                Staff members are assigned to specific homes to maintain authorization.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Assigned Location</span>
                <p className="font-bold text-sm text-slate-800">{currentHome?.name} ({currentHome?.code})</p>
              </div>

              <button
                onClick={() => setShowHomeVerifyModal(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200"
              >
                Close Verification
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
