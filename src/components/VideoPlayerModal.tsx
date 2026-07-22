import React, { useState, useRef, useEffect } from 'react';
import { Video, QuizQuestion, User } from '../types';
import { Play, CheckCircle2, Lock, X, Maximize2, Minimize2, AlertCircle, HelpCircle, Trophy } from 'lucide-react';

interface VideoPlayerModalProps {
  video: Video;
  currentUser: User;
  onClose: () => void;
  onProgressUpdate: (videoId: number, percentage: number) => void;
  onQuizComplete: (videoId: number, score: number, passed: boolean) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  currentUser,
  onClose,
  onProgressUpdate,
  onQuizComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [percentage, setPercentage] = useState(video.percentage || 0);
  const [watchedFinished, setWatchedFinished] = useState(
    video.watchedFinished || (video.percentage || 0) >= 95
  );

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([-1, -1, -1]);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    message: string;
    questionResults?: any[];
  } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const questions: QuizQuestion[] = video.quizQuestions || [];

  // Track video progress
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const currentPct = Math.round(
        (videoRef.current.currentTime / videoRef.current.duration) * 100
      );
      if (currentPct > percentage) {
        setPercentage(currentPct);
        onProgressUpdate(video.id, currentPct);
      }
      if (currentPct >= 95 && !watchedFinished) {
        setWatchedFinished(true);
        onProgressUpdate(video.id, 100);
      }
    }
  };

  const handleEnded = () => {
    setPercentage(100);
    setWatchedFinished(true);
    onProgressUpdate(video.id, 100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    const updated = [...selectedAnswers];
    updated[qIdx] = optIdx;
    setSelectedAnswers(updated);
  };

  const handleSubmitQuiz = async () => {
    if (selectedAnswers.some((a) => a === -1)) {
      setQuizError('Please answer all 3 questions before submitting!');
      return;
    }
    setQuizError(null);
    setSubmittingQuiz(true);

    try {
      const res = await fetch('/api/progress/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({
          videoId: video.id,
          answers: selectedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit quiz');
      }

      setQuizResult(data);
      onQuizComplete(video.id, data.score, data.passed);
    } catch (err: any) {
      setQuizError(err.message || 'Error processing quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div
        className={`bg-white rounded-[32px] w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'max-w-6xl h-[90vh]' : 'max-w-4xl max-h-[90vh]'
        }`}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
              Training Module
            </span>
            <h3 className="text-lg font-bold truncate max-w-md">{video.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title={isFullscreen ? 'Moderate Size' : 'Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!showQuiz ? (
            /* VIDEO WATCHER VIEW */
            <>
              {/* HTML5 Video Player */}
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video shadow-xl border border-slate-800 flex items-center justify-center group">
                <video
                  ref={videoRef}
                  src={video.url}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Progress Tracking Bar */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Watched Progress</span>
                  <span className="text-indigo-600 font-mono text-sm">{percentage}% FINISHED</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500">
                  {watchedFinished
                    ? 'Video fully watched! You are ready to complete the quiz below.'
                    : 'Watch the entire video to unlock the mandatory 3-question quiz.'}
                </p>
              </div>

              {/* Video Description & Quiz Launch */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{video.title}</h4>
                  <p className="text-sm text-slate-500 mt-1 max-w-xl">
                    {video.description || 'Watch carefully before attempting the quiz.'}
                  </p>
                </div>

                <div className="shrink-0">
                  {watchedFinished ? (
                    <button
                      onClick={() => setShowQuiz(true)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 animate-bounce"
                    >
                      <HelpCircle className="w-5 h-5" />
                      Take Quiz (3 Questions)
                    </button>
                  ) : (
                    <div className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Finish Video to Unlock Quiz
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* QUIZ EVALUATION VIEW */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Module Knowledge Check</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Answer all 3 questions. At least <strong className="text-indigo-600">2 out of 3 (66%)</strong> score is required to pass and move to the next video.
                  </p>
                </div>
                <button
                  onClick={() => setShowQuiz(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Back to Video
                </button>
              </div>

              {quizError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{quizError}</span>
                </div>
              )}

              {!quizResult ? (
                /* QUIZ QUESTION FORM */
                <div className="space-y-6">
                  {questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <p className="font-bold text-slate-800 text-sm flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-mono">
                          {qIdx + 1}
                        </span>
                        <span>{q.question}</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[qIdx] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              className={`p-3.5 rounded-xl text-xs text-left font-medium transition-all border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-md shadow-indigo-100'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="font-bold mr-2 uppercase">{String.fromCharCode(65 + optIdx)}.</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submittingQuiz}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {submittingQuiz ? 'Evaluating Answers...' : 'Submit Quiz & Check Score'}
                  </button>
                </div>
              ) : (
                /* QUIZ RESULT FEEDBACK */
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                  <div className="inline-flex p-4 rounded-3xl bg-indigo-100 text-indigo-600 shadow-lg shadow-indigo-100">
                    <Trophy className="w-12 h-12" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {quizResult.passed ? 'Quiz Passed!' : 'Did Not Pass'}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600 mt-2">
                      Your Score: <span className="text-indigo-600 font-mono text-lg font-bold">{quizResult.score} / {quizResult.total}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                      {quizResult.message}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center pt-4">
                    {!quizResult.passed ? (
                      <button
                        onClick={() => {
                          setQuizResult(null);
                          setSelectedAnswers([-1, -1, -1]);
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-200"
                      >
                        Try Quiz Again
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-200"
                      >
                        Proceed to Next Module
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
