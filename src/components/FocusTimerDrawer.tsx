import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, X, Plus } from 'lucide-react';
import { PlannerTask, TASK_COLOR_THEMES } from '../types/planner';
import { TaskIconView } from './TaskIconView';

interface FocusTimerDrawerProps {
  task: PlannerTask | null;
  onClose: () => void;
  onCompleteTask: (task: PlannerTask) => void;
}

export const FocusTimerDrawer: React.FC<FocusTimerDrawerProps> = ({
  task,
  onClose,
  onCompleteTask,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (task) {
      const secs = Math.max(1, task.durationMinutes) * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
      setIsRunning(true);
    }
  }, [task?.id]);

  useEffect(() => {
    if (!isRunning || !task) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, task]);

  if (!task) return null;

  const theme = TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.coral;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const progress =
    totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds)) : 0;

  const addFiveMinutes = () => {
    setTotalSeconds((t) => t + 300);
    setRemainingSeconds((r) => r + 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[34px] bg-white dark:bg-[#1E1E1C] border border-black/5 dark:border-white/10 shadow-2xl p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close focus timer"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-4">
          <span>Active Focus Session</span>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-52 h-52 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-neutral-100 dark:text-white/10"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={theme.hex}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={`w-11 h-11 rounded-full ${theme.nodeBg} text-white flex items-center justify-center mb-2 shadow-sm`}
            >
              <TaskIconView icon={task.icon} className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold font-mono-tabular text-neutral-900 dark:text-white">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              {Math.round(progress * 100)}% elapsed
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1 truncate">
          {task.title}
        </h3>
        <p className="text-xs text-neutral-400 mb-6">
          {task.startTime ? `${task.startTime} · ${task.durationMinutes} min` : `${task.durationMinutes} min focus`}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setRemainingSeconds(totalSeconds);
            }}
            aria-label="Reset timer"
            className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            style={{ backgroundColor: theme.hex }}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={addFiveMinutes}
            title="Add 5 minutes"
            className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-xs font-mono-tabular font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            +5m
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onCompleteTask(task);
            onClose();
          }}
          className="w-full py-3 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Mark Task Completed</span>
        </button>
      </div>
    </div>
  );
};
