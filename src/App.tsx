import React, { useState, useEffect } from 'react';
import { Home, User, Section, Video } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { BentoDashboard } from './components/BentoDashboard';
import { CourseCatalog } from './components/CourseCatalog';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'homes' | 'reports' | 'admin'>('dashboard');
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
      if (user.role !== 'admin' && activeTab === 'admin') {
        setActiveTab('dashboard');
      }
      fetchSections();
    } else {
      setActiveTab('dashboard');
    }
  }, [user]);

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
      const res = await fetch('/api/sections', { credentials: 'include' });
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
    setActiveTab('dashboard');
  };

  const handleProgressUpdate = async (videoId: number, percentage: number) => {
    if (!user) return;
    try {
      await fetch('/api/progress/watch', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, percentage }),
      });
      // Update local state optimistically
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
    } catch (err) {
      console.error('Failed to save watch progress:', err);
    }
  };

  const handleQuizComplete = (videoId: number, score: number, passed: boolean) => {
    fetchSections();
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

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
        {activeTab === 'dashboard' && (
          <BentoDashboard
            user={user}
            currentHome={currentHome}
            sections={sections}
            onSelectVideo={(vid) => setSelectedVideo(vid)}
            onOpenHomeSelector={() => setShowHomeVerifyModal(true)}
          />
        )}

        {activeTab === 'courses' && (
          <CourseCatalog
            sections={sections}
            onSelectVideo={(vid) => setSelectedVideo(vid)}
          />
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPanel
            currentUser={user}
            sections={sections}
            homes={homes}
            onRefreshData={() => {
              fetchHomes();
              fetchSections();
            }}
          />
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
