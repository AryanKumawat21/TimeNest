import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Check,
  Plus,
  Trash2,
  Repeat,
  Inbox,
  Sun,
  Clock,
  AlignLeft,
  ListChecks,
} from 'lucide-react';
import {
  PlannerTask,
  TaskColor,
  TaskIcon,
  RecurrenceType,
  VALID_COLORS,
  VALID_ICONS,
  VALID_RECURRENCES,
  TASK_COLOR_THEMES,
  addMinutesToTime,
  parseSubtasks,
  serializeSubtasks,
  SubtaskItem,
  getTodayDateString,
} from '../types/planner';
import { TaskIconView, ICON_LABELS } from './TaskIconView';

interface TaskEditorModalProps {
  isOpen: boolean;
  initialTask: Partial<PlannerTask> | null;
  activeDate: string;
  onClose: () => void;
  onSave: (taskData: Omit<PlannerTask, 'id' | 'ownerId'>, existingId?: string) => void;
  onDelete?: (taskId: string) => void;
}

const DURATION_OPTIONS = [
  { label: '1', display: '1m', minutes: 1 },
  { label: '15', display: '15m', minutes: 15 },
  { label: '30', display: '30m', minutes: 30 },
  { label: '45m', display: '45m', minutes: 45 },
  { label: '1h', display: '1h', minutes: 60 },
  { label: '1,5h', display: '1.5h', minutes: 90 },
];

const ALL_TIME_SLOTS: string[] = Array.from({ length: 96 }, (_, idx) => {
  const h = Math.floor(idx / 4);
  const m = (idx % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function formatDisplayDate(dateStr: string): { formatted: string; relative: string } {
  if (!dateStr) return { formatted: 'Unscheduled (Inbox)', relative: 'Anytime' };
  const dateObj = new Date(`${dateStr}T12:00:00`);
  const formatted = dateObj
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace(/(\d+)/, '$1.');

  const todayStr = getTodayDateString();
  const todayObj = new Date(`${todayStr}T12:00:00`);
  const diffDays = Math.round(
    (dateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  let relative = '';
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Tomorrow';
  else if (diffDays === -1) relative = 'Yesterday';
  else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays}d`;
  else if (diffDays < -1 && diffDays >= -7) relative = `${Math.abs(diffDays)}d ago`;

  return { formatted, relative };
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  isOpen,
  initialTask,
  activeDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(initialTask?.id);

  const [title, setTitle] = useState<string>(initialTask?.title || 'Read a Book');
  const [placement, setPlacement] = useState<'timeline' | 'allday' | 'inbox'>(() => {
    if (initialTask?.date === '') return 'inbox';
    if (initialTask?.isAllDay) return 'allday';
    return 'timeline';
  });
  const [date, setDate] = useState<string>(
    initialTask?.date !== undefined && initialTask.date !== ''
      ? initialTask.date
      : activeDate
  );
  const [startTime, setStartTime] = useState<string>(
    initialTask?.startTime || '18:00'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialTask?.durationMinutes || 45
  );
  const [color, setColor] = useState<TaskColor>(initialTask?.color || 'sage');
  const [icon, setIcon] = useState<TaskIcon>(initialTask?.icon || 'book');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    initialTask?.recurrence || 'none'
  );
  const [completed, setCompleted] = useState<boolean>(Boolean(initialTask?.completed));
  const [subtaskItems, setSubtaskItems] = useState<SubtaskItem[]>(() =>
    parseSubtasks(initialTask?.subtasks || [])
  );
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [notes, setNotes] = useState<string>(initialTask?.notes || '');

  const [showIconColorPicker, setShowIconColorPicker] = useState(false);
  const [showCustomTimeInput, setShowCustomTimeInput] = useState(false);
  const [showCustomDurationInput, setShowCustomDurationInput] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(
    () => Boolean((initialTask?.subtasks && initialTask.subtasks.length > 0) || initialTask?.notes)
  );

  // Sync state when modal opens with a new initialTask
  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialTask?.title || 'Read a Book');
      if (initialTask?.date === '') setPlacement('inbox');
      else if (initialTask?.isAllDay) setPlacement('allday');
      else setPlacement('timeline');
      setDate(
        initialTask?.date !== undefined && initialTask.date !== ''
          ? initialTask.date
          : activeDate
      );
      setStartTime(initialTask?.startTime || '18:00');
      setDurationMinutes(initialTask?.durationMinutes || 45);
      setColor(initialTask?.color || 'sage');
      setIcon(initialTask?.icon || 'book');
      setRecurrence(initialTask?.recurrence || 'none');
      setCompleted(Boolean(initialTask?.completed));
      setSubtaskItems(parseSubtasks(initialTask?.subtasks || []));
      setNotes(initialTask?.notes || '');
      setShowIconColorPicker(false);
      setShowDetailsDrawer(
        Boolean(
          (initialTask?.subtasks && initialTask.subtasks.length > 0) ||
            initialTask?.notes
        )
      );
    }
  }, [isOpen, initialTask, activeDate]);

  const colorSpec = TASK_COLOR_THEMES[color] || TASK_COLOR_THEMES.sage;
  const endTime = useMemo(
    () => addMinutesToTime(startTime, durationMinutes),
    [startTime, durationMinutes]
  );

  const currentSlotIndex = useMemo(() => {
    const exactIdx = ALL_TIME_SLOTS.indexOf(startTime);
    if (exactIdx !== -1) return exactIdx;
    const [h, m] = startTime.split(':').map(Number);
    return Math.min(95, Math.max(0, h * 4 + Math.round((m || 0) / 15)));
  }, [startTime]);

  // Compact 5-row wheel so it fits cleanly on mobile ratio without giant height
  const wheelSlots = useMemo(() => {
    const offsets = [-2, -1, 0, 1, 2];
    return offsets.map((offset) => {
      const idx = (currentSlotIndex + offset + 96) % 96;
      return {
        offset,
        time: ALL_TIME_SLOTS[idx],
      };
    });
  }, [currentSlotIndex]);

  const stepTimeSlot = (delta: number) => {
    const nextIdx = (currentSlotIndex + delta + 96) % 96;
    setStartTime(ALL_TIME_SLOTS[nextIdx]);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim() || subtaskItems.length >= 20) return;
    setSubtaskItems((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        title: newSubtaskText.trim().slice(0, 180),
        completed: false,
      },
    ]);
    setNewSubtaskText('');
  };

  const toggleSubtaskItem = (id: string) => {
    setSubtaskItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeSubtaskItem = (id: string) => {
    setSubtaskItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    const finalTitle = title.trim() || 'Untitled Task';
    const finalDate = placement === 'inbox' ? '' : date || activeDate;
    const finalStartTime = placement === 'timeline' ? startTime || '09:00' : '';
    const finalIsAllDay = placement === 'allday';

    onSave(
      {
        title: finalTitle.slice(0, 120),
        date: finalDate,
        startTime: finalStartTime,
        isAllDay: finalIsAllDay,
        durationMinutes,
        color,
        icon,
        recurrence: placement === 'inbox' ? 'none' : recurrence,
        completed,
        completedDates: initialTask?.completedDates || [],
        subtasks: serializeSubtasks(subtaskItems),
        notes: notes.slice(0, 1000),
      },
      initialTask?.id
    );
    onClose();
  };

  const { formatted: formattedDate, relative: relativeDate } = formatDisplayDate(
    placement === 'inbox' ? '' : date
  );

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
            className="relative w-full max-w-[375px] rounded-t-[30px] sm:rounded-[30px] bg-[#F5F4F0] dark:bg-[#191918] shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* COMPACT COLORED HEADER */}
            <div
              className={`${colorSpec.headerBg} px-4 pt-3.5 pb-4 transition-colors duration-200 relative shrink-0`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 active:scale-95 flex items-center justify-center text-neutral-900 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>

                <div className="flex items-center gap-1.5">
                  {isEditing && initialTask?.id && onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(initialTask.id!);
                        onClose();
                      }}
                      aria-label="Delete task"
                      className="px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/30 text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowIconColorPicker((v) => !v)}
                    className="px-2.5 py-1 rounded-full bg-white/25 hover:bg-white/35 text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {showIconColorPicker ? 'Done' : 'Icon & Color'}
                  </button>
                </div>
              </div>

              {/* Compact Icon Circle + Time Subtitle + Title Input */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowIconColorPicker((v) => !v)}
                  title="Change task icon and color"
                  className="w-13 h-13 rounded-full bg-[#EFECE8] dark:bg-[#262624] border-[3px] border-white dark:border-white/90 shadow-sm flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  <span className={colorSpec.textAccent}>
                    <TaskIconView icon={icon} className="w-6 h-6" />
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-white/85 text-[11px] font-mono-tabular mb-0.5 truncate">
                    {placement === 'timeline'
                      ? `${startTime}–${endTime} (${durationMinutes} min)`
                      : placement === 'allday'
                      ? `All-Day Routine (${durationMinutes} min)`
                      : `Inbox · ${durationMinutes} min`}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title..."
                    maxLength={120}
                    className="w-full bg-transparent text-white placeholder-white/60 text-base font-bold tracking-tight border-b border-white/45 focus:border-white pb-1 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCompleted((c) => !c)}
                  aria-label="Toggle task completion"
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    completed
                      ? 'bg-white text-neutral-900'
                      : 'bg-transparent hover:bg-white/20'
                  }`}
                >
                  {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              </div>

              {/* Expandable Icon & Color Picker */}
              {showIconColorPicker && (
                <div className="mt-3 pt-3 border-t border-white/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-white/90">Color</span>
                    <div className="flex items-center gap-1.5">
                      {VALID_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          title={TASK_COLOR_THEMES[c].label}
                          style={{ backgroundColor: TASK_COLOR_THEMES[c].hex }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            color === c
                              ? 'border-white scale-110 shadow-sm'
                              : 'border-white/40 opacity-80 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-white/90 block mb-1.5">
                      Icon ({ICON_LABELS[icon]})
                    </span>
                    <div className="grid grid-cols-8 gap-1">
                      {VALID_ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setIcon(ic)}
                          title={ICON_LABELS[ic]}
                          className={`h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            icon === ic
                              ? 'bg-white text-neutral-900 shadow-xs'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <TaskIconView icon={ic} className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COMPACT BODY (Zero horizontal overflow, no ugly scrollbars) */}
            <div className="px-4 py-3.5 space-y-3 overflow-y-auto overflow-x-hidden no-scrollbar flex-1">
              {/* Placement Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setPlacement('timeline')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    placement === 'timeline'
                      ? 'bg-white dark:bg-[#282826] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Timeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement('allday')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    placement === 'allday'
                      ? 'bg-white dark:bg-[#282826] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>All-Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement('inbox')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    placement === 'inbox'
                      ? 'bg-white dark:bg-[#282826] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  <Inbox className="w-3 h-3" />
                  <span>Inbox</span>
                </button>
              </div>

              {/* DATE ROW */}
              {placement !== 'inbox' && (
                <div className="space-y-2">
                  <label className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#232321] border border-black/[0.04] dark:border-white/[0.06] cursor-pointer">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CalendarIcon className="w-4 h-4 text-[#F08A80] shrink-0" />
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {formattedDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 shrink-0 relative">
                      <span>{relativeDate}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          if (e.target.value) setDate(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </label>
                </div>
              )}

              {/* COMPACT TIME WHEEL (Sized cleanly for phone ratio) */}
              {placement === 'timeline' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Time
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomTimeInput((v) => !v)}
                      aria-label="Custom time input"
                      className="w-6 h-6 rounded-full bg-neutral-200/80 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {showCustomTimeInput && (
                    <div className="mb-2 flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#232321] border border-black/5 dark:border-white/10">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        Exact Start Time:
                      </span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          if (e.target.value) setStartTime(e.target.value);
                        }}
                        className="text-xs font-mono-tabular font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white px-2.5 py-1 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="relative rounded-2xl bg-white dark:bg-[#232321] py-2 px-3 border border-black/[0.04] dark:border-white/[0.06] flex flex-col items-center select-none">
                    {/* Up/Down step buttons */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => stepTimeSlot(-1)}
                        aria-label="Earlier 15 minutes"
                        className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/15 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepTimeSlot(1)}
                        aria-label="Later 15 minutes"
                        className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/15 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {wheelSlots.map(({ offset, time }) => {
                      if (offset === 0) {
                        return (
                          <div
                            key={offset}
                            className="my-1 w-[170px] py-1.5 rounded-full bg-[#F08A80] text-white text-center font-mono-tabular text-sm font-semibold shadow-xs tracking-tight"
                          >
                            {startTime}–{endTime}
                          </div>
                        );
                      }

                      const absOffset = Math.abs(offset);
                      const opacityClass =
                        absOffset === 1
                          ? 'text-neutral-500 dark:text-neutral-400 text-xs'
                          : 'text-neutral-300 dark:text-neutral-600 text-[11px]';

                      return (
                        <button
                          key={offset}
                          type="button"
                          onClick={() => setStartTime(time)}
                          className={`py-0.5 font-mono-tabular font-medium transition-all hover:text-[#F08A80] cursor-pointer ${opacityClass}`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COMPACT DURATION BAR (No horizontal overflow) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Duration
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomDurationInput((v) => !v)}
                    aria-label="Custom duration input"
                    className="w-6 h-6 rounded-full bg-neutral-200/80 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showCustomDurationInput && (
                  <div className="mb-2 flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#232321] border border-black/5 dark:border-white/10">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      Minutes:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={durationMinutes}
                      onChange={(e) =>
                        setDurationMinutes(
                          Math.max(1, Math.min(720, Number(e.target.value) || 15))
                        )
                      }
                      className="w-20 text-xs font-mono-tabular font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white px-2.5 py-1 rounded-lg text-right focus:outline-none"
                    />
                  </div>
                )}

                <div className="rounded-full bg-white dark:bg-[#232321] p-1 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-6 gap-1">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = durationMinutes === opt.minutes;
                    const isSmallerThanSelected = opt.minutes < durationMinutes;
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setDurationMinutes(opt.minutes)}
                        className={`h-8 rounded-full text-xs font-mono-tabular font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#F08A80] text-white shadow-xs'
                            : isSmallerThanSelected
                            ? 'bg-[#FCECE9]/70 dark:bg-[#F08A80]/15 text-neutral-600 dark:text-neutral-300'
                            : 'text-neutral-400 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                        }`}
                      >
                        {opt.display}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COLLAPSIBLE MORE OPTIONS (Recurrence, Subtasks & Notes) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetailsDrawer((v) => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/70 dark:bg-[#232321]/70 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-[#232321] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ListChecks className="w-3.5 h-3.5 text-[#F08A80]" />
                    <span>
                      Repeat, Subtasks ({subtaskItems.length}) & Notes
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showDetailsDrawer ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showDetailsDrawer && (
                  <div className="mt-2 rounded-2xl bg-white dark:bg-[#232321] p-3.5 border border-black/[0.04] dark:border-white/[0.06] space-y-3">
                    {/* Recurrence */}
                    {placement !== 'inbox' && (
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          <Repeat className="w-3.5 h-3.5 text-[#F08A80]" />
                          <span>Repeat</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {VALID_RECURRENCES.map((rec) => (
                            <button
                              key={rec}
                              type="button"
                              onClick={() => setRecurrence(rec)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                                recurrence === rec
                                  ? 'bg-[#F08A80] text-white'
                                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5'
                              }`}
                            >
                              {rec === 'none' ? 'Once' : rec}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subtasks */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-200">
                          Checklist Steps
                        </span>
                        {subtaskItems.length > 0 && (
                          <span className="text-[11px] font-mono-tabular text-neutral-400">
                            {subtaskItems.filter((s) => s.completed).length}/
                            {subtaskItems.length}
                          </span>
                        )}
                      </div>

                      {subtaskItems.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {subtaskItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-neutral-50 dark:bg-white/[0.03]"
                            >
                              <button
                                type="button"
                                onClick={() => toggleSubtaskItem(item.id)}
                                className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                    item.completed
                                      ? 'bg-[#F08A80] border-[#F08A80] text-white'
                                      : 'border-neutral-300 dark:border-neutral-600'
                                  }`}
                                >
                                  {item.completed && (
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  )}
                                </span>
                                <span
                                  className={`text-xs truncate ${
                                    item.completed
                                      ? 'line-through text-neutral-400'
                                      : 'text-neutral-800 dark:text-neutral-200'
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSubtaskItem(item.id)}
                                className="text-neutral-400 hover:text-red-500 p-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSubtaskText}
                          onChange={(e) => setNewSubtaskText(e.target.value)}
                          placeholder="Add step..."
                          maxLength={180}
                          className="flex-1 text-xs bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white/10 text-white text-xs font-medium cursor-pointer shrink-0"
                        >
                          + Add
                        </button>
                      </form>
                    </div>

                    {/* Notes */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                        <AlignLeft className="w-3.5 h-3.5 text-[#F08A80]" />
                        <span>Notes</span>
                      </div>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add details or links..."
                        maxLength={1000}
                        className="w-full text-xs bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-2 rounded-lg focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM CONTINUE BUTTON */}
            <div className="px-4 pb-4 pt-2 bg-[#F5F4F0] dark:bg-[#191918] shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3 rounded-full bg-[#F08A80] hover:bg-[#E57B70] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#F08A80]/25 transition-all cursor-pointer"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
