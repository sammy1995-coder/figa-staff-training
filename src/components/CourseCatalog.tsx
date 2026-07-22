import React from 'react';
import { Section, Video } from '../types';
import { Play, CheckCircle2, Lock, HelpCircle, FileText } from 'lucide-react';

interface CourseCatalogProps {
  sections: Section[];
  onSelectVideo: (video: Video) => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({ sections, onSelectVideo }) => {
  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Training Sections & Titles</h2>
        <p className="text-xs text-slate-500 mt-1">
          Pick a section to watch training videos and take required knowledge quizzes.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[32px] border border-slate-200">
          <p className="text-sm text-slate-500">No training titles available yet.</p>
        </div>
      ) : (
        sections.map((section, secIdx) => (
          <div
            key={section.id}
            className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4"
          >
            {/* Section Title Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {secIdx + 1}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{section.title}</h3>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full shrink-0">
                {section.videos.length} Videos
              </span>
            </div>

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {section.videos.map((vid, vidIdx) => {
                const isPassed = vid.passed;
                const isWatched = vid.watchedFinished;
                const pct = vid.percentage || 0;

                return (
                  <div
                    key={vid.id}
                    onClick={() => onSelectVideo(vid)}
                    className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isPassed
                        ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Video #{vidIdx + 1}
                        </span>
                        {isPassed ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passed ({vid.quizScore}/3)
                          </span>
                        ) : isWatched ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <HelpCircle className="w-3.5 h-3.5" /> Quiz Pending
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                            {pct}% Watched
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {vid.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{vid.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Play className="w-4 h-4 text-indigo-600" />
                        <span>Watch Video</span>
                      </div>

                      <button className="p-2 rounded-xl bg-indigo-600 text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-md shadow-indigo-200">
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
