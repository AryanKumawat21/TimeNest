import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Loader2, CheckCircle2, Calendar, Wand2 } from 'lucide-react';
import {
  PlannerTask,
  TaskColor,
  TaskIcon,
  RecurrenceType,
  VALID_COLORS,
  VALID_ICONS,
  VALID_RECURRENCES,
  parseNaturalLanguageTasksLocally,
} from '../types/planner';

interface GeneratedTaskSuggestion {
  title: string;
  startTime: string;
  isAllDay: boolean;
  isInbox: boolean;
  durationMinutes: number;
  color: string;
  icon: string;
  recurrence: string;
  subtasks: string[];
  notes: string;
}

interface AISchedulerModalProps {
  isOpen: boolean;
  activeDate: string;
  existingTasks: PlannerTask[];
  onClose: () => void;
  onAddGeneratedTasks: (newTasks: Omit<PlannerTask, 'id' | 'ownerId'>[]) => Promise<void>;
}

const EXAMPLE_PROMPTS = [
  '7:30am wake up 15m, 8am yoga 30m, 10am coding 90m, 6pm Read a Book 45m',
  'Subah 8 baje 30m workout, 11am team meeting 1h, sham 6 baje reading 45m',
  '9am math revision 1h, 2pm project work 90m, 5pm go for a run 45m',
];

export const AISchedulerModal: React.FC<AISchedulerModalProps> = ({
  isOpen,
  activeDate,
  existingTasks,
  onClose,
  onAddGeneratedTasks,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAutoSchedule = async (inputPrompt?: string) => {
    const textToUse = (inputPrompt ?? prompt).trim();
    if (!textToUse || loading) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const existingSummary = existingTasks
        .filter((t) => t.startTime)
        .map((t) => `${t.startTime} (${t.durationMinutes}m): ${t.title}`)
        .join(', ');

      let tasksToCreate: Omit<PlannerTask, 'id' | 'ownerId'>[] = [];

      try {
        const response = await fetch('/api/ai/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToUse,
            activeDate,
            existingTasksSummary: existingSummary,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawTasks: GeneratedTaskSuggestion[] = Array.isArray(data.tasks)
            ? data.tasks
            : [];

          if (rawTasks.length > 0) {
            tasksToCreate = rawTasks.map((s) => {
              const cleanColor: TaskColor = VALID_COLORS.includes(s.color as TaskColor)
                ? (s.color as TaskColor)
                : 'coral';
              const cleanIcon: TaskIcon = VALID_ICONS.includes(s.icon as TaskIcon)
                ? (s.icon as TaskIcon)
                : 'sparkles';
              const cleanRecurrence: RecurrenceType = VALID_RECURRENCES.includes(
                s.recurrence as RecurrenceType
              )
                ? (s.recurrence as RecurrenceType)
                : 'none';

              return {
                title: (s.title || 'Scheduled Task').slice(0, 120),
                date: s.isInbox ? '' : activeDate,
                startTime: s.isInbox || s.isAllDay ? '' : s.startTime || '09:00',
                isAllDay: Boolean(s.isAllDay),
                durationMinutes: Math.max(
                  1,
                  Math.min(720, Number(s.durationMinutes) || 30)
                ),
                color: cleanColor,
                icon: cleanIcon,
                recurrence: cleanRecurrence,
                completed: false,
                completedDates: [],
                subtasks: (s.subtasks || [])
                  .slice(0, 10)
                  .map((step) => `0:${step.slice(0, 180)}`),
                notes: (s.notes || '').slice(0, 500),
              };
            });
          }
        }
      } catch {
        // Fallback to local smart parser if network/API is unavailable
      }

      // Guarantee automatic scheduling even if server returned empty
      if (tasksToCreate.length === 0) {
        tasksToCreate = parseNaturalLanguageTasksLocally(textToUse, activeDate);
      }

      await onAddGeneratedTasks(tasksToCreate);
      setStatusMessage(
        `Added ${tasksToCreate.length} task${tasksToCreate.length > 1 ? 's' : ''} to ${activeDate}!`
      );
      setPrompt('');

      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 650);
    } finally {
      setLoading(false);
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
            className="w-full max-w-[400px] rounded-t-[28px] sm:rounded-[28px] bg-[#F5F4F0] dark:bg-[#1C1C1A] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-white dark:bg-[#232321] border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#FCECE9] dark:bg-[#F08A80]/20 text-[#F08A80] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                    AI Auto-Scheduler
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>Auto-sets into {activeDate}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body with clean margins & no clipped text */}
            <div className="p-5 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAutoSchedule();
                }}
                className="space-y-3.5"
              >
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type anything (e.g. 'Subah 8 baje yoga 30m, 10am study 1h, 6pm Read a Book 45m') and AI will automatically set it in your planner..."
                  className="w-full rounded-2xl bg-white dark:bg-[#252523] text-neutral-900 dark:text-white placeholder-neutral-400 p-3.5 text-xs sm:text-sm leading-relaxed border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#F08A80] resize-none"
                />

                {/* Quick Example Prompts - Fixed margins & wrapping so ZERO text is clipped */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block px-0.5">
                    Tap an example to fill or auto-schedule:
                  </span>
                  <div className="space-y-2">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(ex)}
                        className="w-full text-left text-xs leading-snug px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252523] text-neutral-700 dark:text-neutral-200 border border-black/5 dark:border-white/10 hover:border-[#F08A80] transition-colors cursor-pointer block break-words"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {statusMessage && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#EBF3E7] dark:bg-[#22311E] text-[#618B50] dark:text-[#94C082] text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="w-full py-3 rounded-full bg-[#F08A80] hover:bg-[#E57B70] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#F08A80]/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Auto-Setting in Planner...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Auto-Set in Planner Now</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
