import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  Clock,
} from 'lucide-react';
import {
  PlannerTask,
  TASK_COLOR_THEMES,
  doesTaskOccurOnDate,
  isTaskCompletedOnDate,
  formatTime12h,
  formatDurationShort,
} from '../types/planner';
import { TaskIconView } from './TaskIconView';

interface MonthCalendarViewProps {
  activeDate: string;
  todayStr: string;
  tasks: PlannerTask[];
  onSelectDate: (dateStr: string) => void;
  onSwitchToTimeline: (dateStr?: string) => void;
  onAddTaskForDate: (dateStr: string) => void;
  onEditTask: (task: PlannerTask, dateStr: string) => void;
  onToggleCompleteOnDate: (task: PlannerTask, dateStr: string) => void;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
}

function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    cells.push({
      dateStr: `${y}-${m}-${day}`,
      dayNum: d.getDate(),
      isCurrentMonth: d.getMonth() === monthIndex,
    });
  }
  return cells;
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  activeDate,
  todayStr,
  tasks,
  onSelectDate,
  onSwitchToTimeline,
  onAddTaskForDate,
  onEditTask,
  onToggleCompleteOnDate,
}) => {
  const initialDateObj = useMemo(
    () => new Date(`${activeDate}T12:00:00`),
    [activeDate]
  );
  const [viewYear, setViewYear] = useState<number>(initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDateObj.getMonth());

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectedDayTasks = useMemo(
    () =>
      tasks
        .filter((t) => doesTaskOccurOnDate(t, activeDate))
        .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00')),
    [tasks, activeDate]
  );

  const selectedDateFormatted = useMemo(() => {
    const d = new Date(`${activeDate}T12:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [activeDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="flex-1 rounded-[32px] bg-white dark:bg-[#1C1C1A] shadow-xs border border-black/[0.04] dark:border-white/[0.06] p-4 sm:p-6 flex flex-col gap-5"
    >
      {/* Top Bar of Calendar View */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSwitchToTimeline()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-bold text-neutral-800 dark:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Planner</span>
          </button>

          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-[#F08A80] hidden sm:inline" />
            <h2 className="text-lg sm:text-xl font-extrabold font-display text-neutral-900 dark:text-white">
              {monthLabel}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const now = new Date(`${todayStr}T12:00:00`);
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
              onSelectDate(todayStr);
            }}
            className="px-3 py-1.5 rounded-full bg-[#FCECE9] dark:bg-[#F08A80]/20 text-[#E06D62] dark:text-[#F4978E] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Calendar-Style 7-Column Month Grid */}
      <div>
        {/* Weekday Names Row */}
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAY_HEADERS.map((dayName) => (
            <div
              key={dayName}
              className="text-center text-[11px] font-bold text-neutral-400 dark:text-neutral-500 py-1"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* 42 Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((cell) => {
            const isSelected = cell.dateStr === activeDate;
            const isToday = cell.dateStr === todayStr;
            const cellTasks = tasks.filter((t) =>
              doesTaskOccurOnDate(t, cell.dateStr)
            );

            return (
              <div
                key={cell.dateStr}
                onClick={() => onSelectDate(cell.dateStr)}
                className={`group min-h-[68px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col cursor-pointer ${
                  isSelected
                    ? 'bg-[#FCECE9]/45 dark:bg-[#F08A80]/15 border-[#F08A80] shadow-xs'
                    : cell.isCurrentMonth
                    ? 'bg-neutral-50/70 dark:bg-[#232321] border-black/[0.04] dark:border-white/[0.05] hover:border-[#F08A80]/60'
                    : 'bg-neutral-50/25 dark:bg-white/[0.01] border-transparent opacity-45'
                }`}
              >
                {/* Cell Header: Day Number + Quick '+' Add on Hover */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono-tabular ${
                      isToday
                        ? 'bg-[#F08A80] text-white'
                        : isSelected
                        ? 'text-[#E06D62] dark:text-[#F4978E] font-extrabold'
                        : 'text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateStr);
                      onAddTaskForDate(cell.dateStr);
                    }}
                    title={`Add task on ${cell.dateStr}`}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-[#F08A80] text-white flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>

                {/* Task Pills inside Cell (Google Calendar Style) */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {cellTasks.slice(0, 2).map((task) => {
                    const cTheme =
                      TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.coral;
                    const done = isTaskCompletedOnDate(task, cell.dateStr);
                    return (
                      <div
                        key={task.id}
                        style={{ backgroundColor: cTheme.hex }}
                        className={`px-1.5 py-0.5 rounded-md text-white text-[10px] font-medium truncate flex items-center gap-1 ${
                          done ? 'opacity-55 line-through' : ''
                        }`}
                      >
                        {task.startTime && (
                          <span className="font-mono-tabular opacity-90 hidden sm:inline">
                            {task.startTime}
                          </span>
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {cellTasks.length > 2 && (
                    <div className="text-[10px] font-semibold text-neutral-400 pl-1">
                      +{cellTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details & Quick Add Panel at Bottom of Month Calendar */}
      <div className="rounded-2xl bg-[#F5F4F0] dark:bg-[#232321] p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#F08A80]">Selected Date</div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
              {selectedDateFormatted}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSwitchToTimeline(activeDate)}
              className="px-3.5 py-2 rounded-full bg-white dark:bg-[#1C1C1A] text-neutral-800 dark:text-white text-xs font-semibold border border-black/5 dark:border-white/10 hover:border-[#F08A80] transition-colors cursor-pointer"
            >
              Open Day Timeline
            </button>
            <button
              type="button"
              onClick={() => onAddTaskForDate(activeDate)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#F08A80] hover:bg-[#E57B70] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Task Here</span>
            </button>
          </div>
        </div>

        {selectedDayTasks.length === 0 ? (
          <p className="text-xs text-neutral-400 py-2">
            No tasks scheduled on this date yet. Tap "+ Add Task Here" to schedule one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedDayTasks.map((task) => {
              const cTheme =
                TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.coral;
              const done = isTaskCompletedOnDate(task, activeDate);
              return (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task, activeDate)}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-[#1C1C1A] border border-black/[0.03] dark:border-white/[0.05] cursor-pointer hover:border-[#F08A80]/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      style={{ backgroundColor: cTheme.hex }}
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0"
                    >
                      <TaskIconView icon={task.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono-tabular text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {task.startTime
                            ? `${formatTime12h(task.startTime)} · ${formatDurationShort(
                                task.durationMinutes
                              )}`
                            : 'All-Day Habit'}
                        </span>
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-bold truncate ${
                          done
                            ? 'line-through text-neutral-400'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCompleteOnDate(task, activeDate);
                    }}
                    style={{
                      borderColor: cTheme.hex,
                      backgroundColor: done ? cTheme.hex : 'transparent',
                    }}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-white shrink-0 cursor-pointer"
                  >
                    {done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
