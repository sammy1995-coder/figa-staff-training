import React from 'react';
import { Section, Video, Home, User } from '../types';
import { Play, CheckCircle2, Lock, ShieldCheck, MapPin, Clock, ArrowRight, Award, AlertTriangle } from 'lucide-react';

interface BentoDashboardProps {
  user: User | null;
  currentHome: Home | null;
  sections: Section[];
  onSelectVideo: (video: Video) => void;
  onOpenHomeSelector: () => void;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  user,
  currentHome,
  sections,
  onSelectVideo,
  onOpenHomeSelector,
}) => {
  // Collect all videos
  const allVideos = sections.flatMap((s) => s.videos);
  const completedVideos = allVideos.filter((v) => v.passed);
  const activeVideo = allVideos.find((v) => !v.passed) || allVideos[0];
  const nextLockedVideo = allVideos.find((v) => v.id !== activeVideo?.id && !v.passed);

  const totalVideos = allVideos.length;
  const progressPercentage =
    totalVideos > 0 ? Math.round((completedVideos.length / totalVideos) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 select-none">
      {/* 1. Large Feature Card: Current / Active Training Video */}
      <div className="md:col-span-2 md:row-span-2 bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 shadow-xl shadow-slate-200/50 flex flex-col border border-slate-100 hover:border-indigo-100 transition-all">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
            {activeVideo?.passed ? 'Completed Module' : 'Active Training'}
          </span>
          <span className="text-slate-400 text-xs font-semibold">
            {sections.find((s) => s.id === activeVideo?.sectionId)?.title || 'Core Section'}
          </span>
        </div>

        {activeVideo ? (
          <>
            <div
              onClick={() => onSelectVideo(activeVideo)}
              className="flex-1 bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center cursor-pointer group shadow-lg min-h-[180px] sm:min-h-[220px]"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-600/90 group-hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-all z-10">
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                <p className="font-bold text-base sm:text-lg leading-snug line-clamp-1">{activeVideo.title}</p>
                <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${activeVideo.percentage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{activeVideo.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory module • Pass 2/3 quiz score to proceed
                </p>
              </div>

              <button
                onClick={() => onSelectVideo(activeVideo)}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-200 transition-all shrink-0 text-center"
              >
                {activeVideo.percentage ? 'Resume Video' : 'Start Video'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            No training modules loaded yet.
          </div>
        )}
      </div>

      {/* 2. Progress Overview Wheel Card */}
      <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 text-white shadow-xl shadow-indigo-200 flex flex-col justify-between">
        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Overall Goal</p>
        <div className="my-4 flex items-center justify-center">
          <div className="relative">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="44"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                className="text-indigo-800/60"
              />
              <circle
                cx="56"
                cy="56"
                r="44"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * progressPercentage) / 100}
                className="text-white transition-all duration-700"
              />
            </svg>
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-black">
              {progressPercentage}%
            </span>
          </div>
        </div>
        <p className="text-center text-xs text-indigo-100 font-medium">
          {completedVideos.length} of {totalVideos} modules finished
        </p>
      </div>

      {/* 3. Locked / Next Content Card */}
      <div className="md:col-span-1 bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
            {nextLockedVideo?.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Lock className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Up Next
          </span>
          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
            {nextLockedVideo?.title || 'Advanced Safety Protocols'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Unlocks after active video quiz (2/3 score required)
          </p>
        </div>

        <div className="mt-4 flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
        </div>
      </div>

      {/* 4. What's Due Deadlines List */}
      <div className="md:col-span-2 bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800 text-sm">Assigned Deadlines & Progress</h4>
          <span className="text-xs text-indigo-600 font-bold">Mandatory</span>
        </div>

        <div className="space-y-3">
          {allVideos.slice(0, 2).map((vid) => (
            <div
              key={vid.id}
              onClick={() => onSelectVideo(vid)}
              className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                className={`w-2 h-10 rounded-full shrink-0 ${
                  vid.passed ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              ></div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{vid.title}</p>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {vid.passed ? 'Passed (Quiz complete)' : 'In progress • Pass 2/3 quiz required'}
                </p>
              </div>
              <span className="text-[11px] sm:text-xs font-bold font-mono text-slate-500 shrink-0">
                {vid.percentage || 0}% DONE
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Access Authorization & Home Control */}
      <div className="md:col-span-2 bg-slate-100 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-slate-800 text-sm">Access Authorization</h4>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Your location is verified at <strong className="text-slate-900">{currentHome?.name || 'Assigned Home'}</strong>. Staff cannot access unauthorized location courses.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onOpenHomeSelector}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 shadow-sm transition-all"
            >
              Verify Location
            </button>
          </div>
        </div>

        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Access OTP</p>
            <p className="text-xl font-mono font-black text-indigo-600 mt-1">
              {user?.otpCode || '4821'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
