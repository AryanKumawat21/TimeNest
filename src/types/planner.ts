export type TaskColor = 'coral' | 'sage' | 'slate' | 'amber' | 'lavender' | 'teal';

export type TaskIcon =
  | 'book'
  | 'alarm'
  | 'yoga'
  | 'bike'
  | 'users'
  | 'laundry'
  | 'phone'
  | 'run'
  | 'plant'
  | 'sparkles'
  | 'coffee'
  | 'code'
  | 'briefcase'
  | 'heart'
  | 'music'
  | 'utensils';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface PlannerTask {
  id: string;
  ownerId: string;
  title: string;
  /** YYYY-MM-DD when scheduled on a day, or "" when in Inbox */
  date: string;
  /** 24-hour "HH:MM" when scheduled on timeline, or "" when All-Day or Inbox */
  startTime: string;
  isAllDay: boolean;
  durationMinutes: number;
  color: TaskColor;
  icon: TaskIcon;
  recurrence: RecurrenceType;
  completed: boolean;
  /** Dates (YYYY-MM-DD) on which a recurring task was marked complete */
  completedDates: string[];
  /** Serialized subtasks in Firestore ("0:Title" or "1:Title") */
  subtasks: string[];
  notes: string;
}

export const VALID_COLORS: TaskColor[] = [
  'coral',
  'sage',
  'slate',
  'amber',
  'lavender',
  'teal',
];

export const VALID_ICONS: TaskIcon[] = [
  'book',
  'alarm',
  'yoga',
  'bike',
  'users',
  'laundry',
  'phone',
  'run',
  'plant',
  'sparkles',
  'coffee',
  'code',
  'briefcase',
  'heart',
  'music',
  'utensils',
];

export const VALID_RECURRENCES: RecurrenceType[] = [
  'none',
  'daily',
  'weekdays',
  'weekly',
];

export interface ColorThemeSpec {
  key: TaskColor;
  label: string;
  hex: string;
  headerBg: string;
  nodeBg: string;
  nodeSoftBg: string;
  textAccent: string;
  borderAccent: string;
  checkBg: string;
}

export const TASK_COLOR_THEMES: Record<TaskColor, ColorThemeSpec> = {
  coral: {
    key: 'coral',
    label: 'Soft Coral',
    hex: '#F08A80',
    headerBg: 'bg-[#F08A80] dark:bg-[#D8746A]',
    nodeBg: 'bg-[#F08A80] dark:bg-[#E07A70]',
    nodeSoftBg: 'bg-[#FCECE9] dark:bg-[#3A2422]',
    textAccent: 'text-[#E06D62] dark:text-[#F4978E]',
    borderAccent: 'border-[#F08A80] dark:border-[#E07A70]',
    checkBg: 'bg-[#F08A80] border-[#F08A80]',
  },
  sage: {
    key: 'sage',
    label: 'Sage Green',
    hex: '#7BA66A',
    headerBg: 'bg-[#7BA66A] dark:bg-[#658E55]',
    nodeBg: 'bg-[#7BA66A] dark:bg-[#6E995E]',
    nodeSoftBg: 'bg-[#EBF3E7] dark:bg-[#22311E]',
    textAccent: 'text-[#618B50] dark:text-[#94C082]',
    borderAccent: 'border-[#7BA66A] dark:border-[#6E995E]',
    checkBg: 'bg-[#7BA66A] border-[#7BA66A]',
  },
  slate: {
    key: 'slate',
    label: 'Slate Blue',
    hex: '#5D80A1',
    headerBg: 'bg-[#5D80A1] dark:bg-[#4C6D8C]',
    nodeBg: 'bg-[#5D80A1] dark:bg-[#537594]',
    nodeSoftBg: 'bg-[#E8EFF5] dark:bg-[#1E2936]',
    textAccent: 'text-[#4B6B8A] dark:text-[#82A6C7]',
    borderAccent: 'border-[#5D80A1] dark:border-[#537594]',
    checkBg: 'bg-[#5D80A1] border-[#5D80A1]',
  },
  amber: {
    key: 'amber',
    label: 'Warm Amber',
    hex: '#E5A454',
    headerBg: 'bg-[#E5A454] dark:bg-[#C7893D]',
    nodeBg: 'bg-[#E5A454] dark:bg-[#D49548]',
    nodeSoftBg: 'bg-[#FBF2E6] dark:bg-[#362919]',
    textAccent: 'text-[#C88432] dark:text-[#F0B872]',
    borderAccent: 'border-[#E5A454] dark:border-[#D49548]',
    checkBg: 'bg-[#E5A454] border-[#E5A454]',
  },
  lavender: {
    key: 'lavender',
    label: 'Soft Lavender',
    hex: '#9682B5',
    headerBg: 'bg-[#9682B5] dark:bg-[#7D689C]',
    nodeBg: 'bg-[#9682B5] dark:bg-[#8873A8]',
    nodeSoftBg: 'bg-[#F1ECF7] dark:bg-[#2B2336]',
    textAccent: 'text-[#7C659E] dark:text-[#B5A3D1]',
    borderAccent: 'border-[#9682B5] dark:border-[#8873A8]',
    checkBg: 'bg-[#9682B5] border-[#9682B5]',
  },
  teal: {
    key: 'teal',
    label: 'Ocean Teal',
    hex: '#58A49C',
    headerBg: 'bg-[#58A49C] dark:bg-[#468B84]',
    nodeBg: 'bg-[#58A49C] dark:bg-[#4E968E]',
    nodeSoftBg: 'bg-[#E6F4F2] dark:bg-[#1C302E]',
    textAccent: 'text-[#428981] dark:text-[#7AC2BA]',
    borderAccent: 'border-[#58A49C] dark:border-[#4E968E]',
    checkBg: 'bg-[#58A49C] border-[#58A45C]',
  },
};

export function parseSubtasks(serialized: string[]): SubtaskItem[] {
  return (serialized || []).map((item, idx) => {
    const completed = item.startsWith('1:');
    const title = item.replace(/^[01]:/, '') || `Step ${idx + 1}`;
    return {
      id: `sub-${idx}`,
      title,
      completed,
    };
  });
}

export function serializeSubtasks(items: SubtaskItem[]): string[] {
  return items
    .map((item) => {
      const cleanTitle = item.title.trim().slice(0, 195);
      if (!cleanTitle) return '';
      return `${item.completed ? '1' : '0'}:${cleanTitle}`;
    })
    .filter(Boolean)
    .slice(0, 20);
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !/^[0-2][0-9]:[0-5][0-9]$/.test(timeStr)) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(timeStr) + durationMinutes);
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDurationCompact(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h}h ${rem}m`;
}

export function formatDurationShort(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${h} hr`;
  return `${h}h ${rem}m`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function doesTaskOccurOnDate(task: PlannerTask, targetDateStr: string): boolean {
  if (!task.date) return false; // Inbox task
  if (task.date === targetDateStr) return true;
  if (task.recurrence === 'none') return false;
  if (targetDateStr < task.date) return false;

  const targetDate = new Date(`${targetDateStr}T12:00:00`);
  const dayOfWeek = targetDate.getDay(); // 0 Sun .. 6 Sat

  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.recurrence === 'weekly') {
    const originDate = new Date(`${task.date}T12:00:00`);
    return originDate.getDay() === dayOfWeek;
  }
  return false;
}

export function isTaskCompletedOnDate(task: PlannerTask, targetDateStr: string): boolean {
  if (task.recurrence === 'none') {
    return task.completed;
  }
  return (task.completedDates || []).includes(targetDateStr);
}

/**
 * Enforces strict volumetric and pattern constraints matching firebase-blueprint.json
 * and firestore.rules before any Firestore write.
 */
export function sanitizeTaskForFirestore(
  task: Omit<PlannerTask, 'id'>,
  ownerId: string
): Omit<PlannerTask, 'id'> {
  const cleanTitle = (task.title || 'Untitled Task').trim().slice(0, 120);
  const cleanDate =
    task.date && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(task.date) ? task.date : '';
  const cleanStartTime =
    !task.isAllDay &&
    cleanDate &&
    task.startTime &&
    /^[0-2][0-9]:[0-5][0-9]$/.test(task.startTime)
      ? task.startTime
      : '';
  const cleanDuration = Math.max(1, Math.min(720, Math.round(Number(task.durationMinutes) || 30)));
  const cleanColor: TaskColor = VALID_COLORS.includes(task.color) ? task.color : 'coral';
  const cleanIcon: TaskIcon = VALID_ICONS.includes(task.icon) ? task.icon : 'book';
  const cleanRecurrence: RecurrenceType = VALID_RECURRENCES.includes(task.recurrence)
    ? task.recurrence
    : 'none';
  const cleanCompletedDates = (task.completedDates || [])
    .filter((d) => typeof d === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d))
    .slice(0, 366);
  const cleanSubtasks = (task.subtasks || [])
    .filter((s) => typeof s === 'string' && s.length >= 2)
    .map((s) => s.slice(0, 200))
    .slice(0, 20);
  const cleanNotes = (task.notes || '').slice(0, 1000);

  return {
    ownerId,
    title: cleanTitle,
    date: cleanDate,
    startTime: cleanStartTime,
    isAllDay: Boolean(task.isAllDay),
    durationMinutes: cleanDuration,
    color: cleanColor,
    icon: cleanIcon,
    recurrence: cleanRecurrence,
    completed: Boolean(task.completed),
    completedDates: cleanCompletedDates,
    subtasks: cleanSubtasks,
    notes: cleanNotes,
  };
}

/**
 * Intelligent client-side fallback parser so natural-language text (English/Hindi/Hinglish)
 * always creates clean structured tasks even if offline.
 */
export function parseNaturalLanguageTasksLocally(
  input: string,
  activeDate: string
): Omit<PlannerTask, 'id' | 'ownerId'>[] {
  const segments = input
    .split(/,|\band\b|\baur\b|\bफिर\b|\bऔर\b|\n|;/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let rollingHour = 9;
  return segments.map((seg, idx) => {
    const lower = seg.toLowerCase();

    // Detect time e.g. "8am", "7:30am", "6:30 pm", "18:00", "8 baje", "शाम 6 बजे"
    let startTime = '';
    const timeMatch12 = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    const timeMatch24 = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    const hindiTimeMatch = lower.match(/(subah|sham|shaam|dopahar|raat|सुबह|शाम|रात)?\s*(\d{1,2})(?::(\d{2}))?\s*(baje|बजे)/i);

    if (timeMatch12) {
      let h = parseInt(timeMatch12[1], 10);
      const m = parseInt(timeMatch12[2] || '0', 10);
      const ampm = timeMatch12[3].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      rollingHour = h + 1;
    } else if (hindiTimeMatch) {
      const period = (hindiTimeMatch[1] || '').toLowerCase();
      let h = parseInt(hindiTimeMatch[2], 10);
      const m = parseInt(hindiTimeMatch[3] || '0', 10);
      if ((period.includes('sham') || period.includes('shaam') || period.includes('शाम') || period.includes('raat') || period.includes('रात')) && h < 12) {
        h += 12;
      } else if (h >= 1 && h <= 6 && !period.includes('subah') && !period.includes('सुबह')) {
        h += 12;
      }
      startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      rollingHour = h + 1;
    } else if (timeMatch24) {
      const h = parseInt(timeMatch24[1], 10);
      const m = parseInt(timeMatch24[2], 10);
      startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      rollingHour = h + 1;
    } else {
      startTime = `${String(Math.min(22, rollingHour)).padStart(2, '0')}:00`;
      rollingHour += 1;
    }

    // Detect duration e.g. "30m", "45 min", "1h", "1.5h", "90m"
    let durationMinutes = 45;
    const durMinMatch = lower.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
    const durHrMatch = lower.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|ghanta|घंटे)\b/i);
    if (durMinMatch) {
      durationMinutes = Math.max(5, Math.min(360, parseInt(durMinMatch[1], 10)));
    } else if (durHrMatch) {
      durationMinutes = Math.max(15, Math.min(360, Math.round(parseFloat(durHrMatch[1]) * 60)));
    }

    // Detect icon & color from keywords
    let icon: TaskIcon = 'sparkles';
    let color: TaskColor = VALID_COLORS[idx % VALID_COLORS.length];

    if (/yoga|workout|gym|stretch|exercise/.test(lower)) {
      icon = 'yoga';
      color = 'slate';
    } else if (/run|jog|walk|cardio/.test(lower)) {
      icon = 'run';
      color = 'coral';
    } else if (/book|read|study|homework|math|revision|पढ़ाई/.test(lower)) {
      icon = 'book';
      color = 'sage';
    } else if (/code|coding|project|react|dev|work/.test(lower)) {
      icon = 'code';
      color = 'lavender';
    } else if (/meet|meeting|team|sync/.test(lower)) {
      icon = 'users';
      color = 'coral';
    } else if (/call|phone|mum|mummy|grandparents|बात/.test(lower)) {
      icon = 'phone';
      color = 'slate';
    } else if (/wake|rise|alarm|morning/.test(lower)) {
      icon = 'alarm';
      color = 'coral';
    } else if (/bike|cycle|commute|office/.test(lower)) {
      icon = 'bike';
      color = 'sage';
    } else if (/lunch|dinner|breakfast|eat|coffee|tea/.test(lower)) {
      icon = 'utensils';
      color = 'amber';
    }

    // Clean title
    let cleanedTitle = seg
      .replace(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi, '')
      .replace(/(subah|sham|shaam|dopahar|raat|सुबह|शाम|रात)?\s*(\d{1,2})(?::(\d{2}))?\s*(baje|बजे)/gi, '')
      .replace(/\b(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/gi, '')
      .replace(/\b(at|to|from|se|ko|पर)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedTitle) cleanedTitle = 'Scheduled Task';
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

    return {
      title: cleanedTitle.slice(0, 120),
      date: activeDate,
      startTime,
      isAllDay: false,
      durationMinutes,
      color,
      icon,
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: 'Auto-scheduled by AI',
    };
  });
}

/**
 * Default starter tasks:
 * - Today has the structured reference day (all with recurrence: 'none' so future days stay clean!)
 * - Tomorrow has ONLY 1 light reminder ("Morning Coffee & Plan"), and other future days have at most 1 light reminder or stay empty!
 */
export function createInitialSeedTasks(todayStr: string, ownerId = 'guest'): PlannerTask[] {
  const tomorrowStr = addDaysToDateString(todayStr, 1);
  const dayAfterStr = addDaysToDateString(todayStr, 2);

  return [
    // Inbox tasks (Left sidebar in Reference Photo 2)
    {
      id: 'seed-inbox-1',
      ownerId,
      title: 'Do Laundry',
      date: '',
      startTime: '',
      isAllDay: false,
      durationMinutes: 60,
      color: 'slate',
      icon: 'laundry',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: ['0:Sort light and dark clothes', '0:Start wash cycle'],
      notes: 'Use gentle detergent for woolens.',
    },
    {
      id: 'seed-inbox-2',
      ownerId,
      title: 'Do Homework',
      date: '',
      startTime: '',
      isAllDay: false,
      durationMinutes: 60,
      color: 'sage',
      icon: 'book',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: ['0:Complete chapter exercises', '0:Review lecture notes'],
      notes: '',
    },
    {
      id: 'seed-inbox-3',
      ownerId,
      title: 'Call Grandparents',
      date: '',
      startTime: '',
      isAllDay: false,
      durationMinutes: 30,
      color: 'slate',
      icon: 'phone',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: 'Ask about their weekend trip.',
    },
    {
      id: 'seed-inbox-4',
      ownerId,
      title: 'Go for a Run',
      date: '',
      startTime: '',
      isAllDay: false,
      durationMinutes: 60,
      color: 'coral',
      icon: 'run',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: ['0:5 min warm-up stretch', '0:5K park loop'],
      notes: '',
    },

    // All-Day circular tasks for TODAY only (recurrence: 'none' so future days aren't cluttered)
    {
      id: 'seed-allday-1',
      ownerId,
      title: 'Structure Tomorrow',
      date: todayStr,
      startTime: '',
      isAllDay: true,
      durationMinutes: 15,
      color: 'coral',
      icon: 'sparkles',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: 'Review inbox and plan key time blocks.',
    },
    {
      id: 'seed-allday-2',
      ownerId,
      title: 'Water Plants',
      date: todayStr,
      startTime: '',
      isAllDay: true,
      durationMinutes: 15,
      color: 'sage',
      icon: 'plant',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: 'Check balcony ferns and desk monstera.',
    },
    {
      id: 'seed-allday-3',
      ownerId,
      title: 'Call Mum',
      date: todayStr,
      startTime: '',
      isAllDay: true,
      durationMinutes: 15,
      color: 'slate',
      icon: 'phone',
      recurrence: 'none',
      completed: true,
      completedDates: [todayStr],
      subtasks: [],
      notes: '',
    },

    // Timeline scheduled tasks for TODAY (recurrence: 'none' so future days remain clean)
    {
      id: 'seed-time-1',
      ownerId,
      title: 'Rise and Shine',
      date: todayStr,
      startTime: '08:00',
      isAllDay: false,
      durationMinutes: 15,
      color: 'coral',
      icon: 'alarm',
      recurrence: 'none',
      completed: true,
      completedDates: [todayStr],
      subtasks: ['1:Drink a glass of warm water', '1:Open curtains for sunlight'],
      notes: 'Morning hydration routine.',
    },
    {
      id: 'seed-time-2',
      ownerId,
      title: 'Yoga Workout',
      date: todayStr,
      startTime: '08:15',
      isAllDay: false,
      durationMinutes: 30,
      color: 'slate',
      icon: 'yoga',
      recurrence: 'none',
      completed: true,
      completedDates: [todayStr],
      subtasks: ['1:Sun salutations', '1:Core mobility flow'],
      notes: 'Focus on deep breathing and posture.',
    },
    {
      id: 'seed-time-3',
      ownerId,
      title: 'Bike to Office',
      date: todayStr,
      startTime: '09:30',
      isAllDay: false,
      durationMinutes: 30,
      color: 'sage',
      icon: 'bike',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: ['1:Pack laptop & charger', '0:Take riverside bike lane'],
      notes: 'Remember helmet and water bottle.',
    },
    {
      id: 'seed-time-4',
      ownerId,
      title: 'Team Meeting',
      date: todayStr,
      startTime: '10:30',
      isAllDay: false,
      durationMinutes: 60,
      color: 'coral',
      icon: 'users',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [
        '1:Share weekly sprint updates',
        '0:Review design milestones',
        '0:Confirm Q4 roadmap',
      ],
      notes: 'Video call link in calendar invite.',
    },
    {
      id: 'seed-time-6',
      ownerId,
      title: 'Read a Book',
      date: todayStr,
      startTime: '18:00',
      isAllDay: false,
      durationMinutes: 45,
      color: 'sage',
      icon: 'book',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: ['0:Read 25 pages', '0:Jot down key takeaways'],
      notes: 'Evening wind-down reading session.',
    },

    // Just 1 light reminder on Tomorrow and Day After so future dates are mostly empty & clean
    {
      id: 'seed-tomorrow-1',
      ownerId,
      title: 'Morning Plan & Coffee',
      date: tomorrowStr,
      startTime: '09:00',
      isAllDay: false,
      durationMinutes: 15,
      color: 'amber',
      icon: 'coffee',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: 'Light reminder for tomorrow.',
    },
    {
      id: 'seed-dayafter-1',
      ownerId,
      title: 'Evening Reading Reminder',
      date: dayAfterStr,
      startTime: '18:00',
      isAllDay: false,
      durationMinutes: 30,
      color: 'sage',
      icon: 'book',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: '',
    },
  ];
}
