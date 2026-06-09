import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, HelpCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { message, title, confirmText, cancelText, type, resolve }

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    let formattedMessage = message;
    if (typeof message === 'object' && message !== null) {
      if (Array.isArray(message)) {
        formattedMessage = message
          .map((err) => {
            const loc = Array.isArray(err.loc) ? err.loc.filter((l) => l !== 'body').join('.') : '';
            const prefix = loc ? `${loc}: ` : '';
            return `${prefix}${err.msg || JSON.stringify(err)}`;
          })
          .join(', ');
      } else {
        formattedMessage = message.detail || message.message || JSON.stringify(message);
        if (typeof formattedMessage === 'object') {
          formattedMessage = JSON.stringify(formattedMessage);
        }
      }
    }
    formattedMessage = String(formattedMessage || 'An unknown error occurred.');

    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message: formattedMessage, type }]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message, options = {}) => {
    const {
      title = 'Confirmation Required',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'danger' // 'danger', 'primary', 'warning'
    } = options;

    return new Promise((resolve) => {
      setConfirmState({
        message,
        title,
        confirmText,
        cancelText,
        type,
        resolve: (value) => {
          setConfirmState(null);
          resolve(value);
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast, removeToast, confirm }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between p-4 rounded-xl border shadow-lg pointer-events-auto animate-slide-up transition-all ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/90 dark:border-emerald-900 text-emerald-850 dark:text-emerald-300'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 dark:bg-red-950/90 dark:border-red-900 text-red-850 dark:text-red-300'
                : t.type === 'warning'
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/90 dark:border-amber-900 text-amber-850 dark:text-amber-300'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 text-slate-850 dark:text-slate-300'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              <span className="mt-0.5 shrink-0">
                {t.type === 'success' && <CheckCircle size={16} className="text-emerald-500" />}
                {t.type === 'error' && <AlertCircle size={16} className="text-red-500" />}
                {t.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                {t.type === 'info' && <Info size={16} className="text-brand-500" />}
              </span>
              <p className="text-xs font-semibold leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 ml-3 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Sleek Custom Confirm Dialog Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl shrink-0 ${
                confirmState.type === 'danger'
                  ? 'bg-red-500/10 text-red-650 dark:text-red-400'
                  : confirmState.type === 'warning'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
              }`}>
                {confirmState.type === 'danger' && <AlertCircle size={24} />}
                {confirmState.type === 'warning' && <AlertTriangle size={24} />}
                {confirmState.type === 'primary' && <HelpCircle size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {confirmState.title}
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-450 mt-1.5 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3.5">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm active:translate-y-[1px] transition-all ${
                  confirmState.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/10'
                    : confirmState.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                    : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/10'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
export default ToastContext;
