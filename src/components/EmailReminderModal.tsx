import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  X,
  Bell,
  Send,
  CheckCircle2,
  Copy,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { PlannerTask } from '../types/planner';

interface EmailReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEmail: string;
  autoEmailEnabled: boolean;
  onSaveEmailSettings: (email: string, autoEnabled: boolean) => void;
  activeDate: string;
  dayTasks: PlannerTask[];
}

export const EmailReminderModal: React.FC<EmailReminderModalProps> = ({
  isOpen,
  onClose,
  savedEmail,
  autoEmailEnabled,
  onSaveEmailSettings,
  activeDate,
  dayTasks,
}) => {
  const [emailInput, setEmailInput] = useState(
    savedEmail || 'aryankumawat1969@gmail.com'
  );
  const [autoRemind, setAutoRemind] = useState(autoEmailEnabled);
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const [preparedLinks, setPreparedLinks] = useState<{
    gmailComposeUrl: string;
    mailtoUrl: string;
    bodyText: string;
  } | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEmailInput(savedEmail || 'aryankumawat1969@gmail.com');
      setAutoRemind(autoEmailEnabled);
      setPreparedLinks(null);
      setStatusToast(null);
    }
  }, [isOpen, savedEmail, autoEmailEnabled]);

  const handleSavePreferences = () => {
    const clean = emailInput.trim();
    onSaveEmailSettings(clean, autoRemind);
    setStatusToast('Email saved! Reminders will be sent for your scheduled tasks.');
    setTimeout(() => setStatusToast(null), 3000);
  };

  const handlePrepareAndSendDigest = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (!clean || !clean.includes('@')) return;

    onSaveEmailSettings(clean, autoRemind);
    setSending(true);
    try {
      const response = await fetch('/api/email/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: clean,
          date: activeDate,
          customMessage: customNote,
          tasks: dayTasks.map((t) => ({
            title: t.title,
            startTime: t.startTime,
            durationMinutes: t.durationMinutes,
            completed: t.completed,
          })),
        }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setPreparedLinks({
          gmailComposeUrl: data.gmailComposeUrl,
          mailtoUrl: data.mailtoUrl,
          bodyText: data.bodyText,
        });
        setStatusToast(`Email ready for ${clean}! Choose how to dispatch below.`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="w-full max-w-[390px] rounded-t-[28px] sm:rounded-[28px] bg-[#F5F4F0] dark:bg-[#1C1C1A] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-white dark:bg-[#232321] border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8EFF5] dark:bg-[#5D80A1]/20 text-[#5D80A1] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    Email Reminders & Digest
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Feed your email for daily plans & task alerts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handlePrepareAndSendDigest} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                  Your Pre-Fed Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252523] text-neutral-900 dark:text-white text-xs sm:text-sm border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#F08A80]"
                />
              </div>

              {/* Auto-Alert Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#252523] border border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bell className="w-4 h-4 text-[#F08A80] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      Auto-Trigger on Task Start Time
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      Pops up email & reminder alert when a task starts
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoRemind;
                    setAutoRemind(next);
                    onSaveEmailSettings(emailInput.trim(), next);
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    autoRemind ? 'bg-[#7BA66A]' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      autoRemind ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                  Custom Note / Message (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Important priorities for today..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#252523] text-neutral-900 dark:text-white text-xs border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#F08A80]"
                />
              </div>

              {/* Preview of tasks that will be emailed */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-[#252523]/60 border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#F08A80]" />
                    <span>Schedule for {activeDate}</span>
                  </span>
                  <span>{dayTasks.length} tasks</span>
                </div>
                <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1">
                  {dayTasks.length === 0 ? (
                    <div className="text-[11px] text-neutral-400">
                      No tasks scheduled on {activeDate} yet.
                    </div>
                  ) : (
                    dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-200"
                      >
                        <span className="truncate font-medium">{t.title}</span>
                        <span className="text-[11px] font-mono-tabular text-neutral-400 shrink-0 ml-2">
                          {t.startTime || 'All-Day'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {statusToast && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EBF3E7] dark:bg-[#22311E] text-[#618B50] dark:text-[#94C082] text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusToast}</span>
                </div>
              )}

              {preparedLinks && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={preparedLinks.gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#5D80A1] hover:opacity-95 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send via Gmail</span>
                  </a>
                  <a
                    href={preparedLinks.mailtoUrl}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shadow-xs transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Mail App</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(preparedLinks.bodyText);
                      setStatusToast('Copied schedule text to clipboard!');
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white dark:bg-[#252523] text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-black/5 dark:border-white/10 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Schedule Summary</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-4 py-3 rounded-full bg-white dark:bg-[#252523] text-neutral-800 dark:text-white font-semibold text-xs border border-black/5 dark:border-white/10 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Save Email
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 py-3 rounded-full bg-[#F08A80] hover:bg-[#E57B70] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#F08A80]/25 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Preparing...' : 'Prepare & Send Email'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
