import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  loadingLabel?: string;
  isLoading?: boolean;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  warning,
  confirmLabel,
  loadingLabel,
  isLoading = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const isDanger = tone === 'danger';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            isDanger ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 mt-1">{description}</p>
        </div>

        {warning && (
          <div
            className={`p-3 rounded-2xl text-[11px] font-medium flex items-center gap-2 border ${
              isDanger ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {warning}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-60 ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isLoading ? loadingLabel || 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
