import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox,
  Plus,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Cloud,
  Check,
  Repeat,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileText,
  Play,
  RotateCcw,
  Trash2,
  Search,
  Mail,
  Wand2,
  BellRing,
  CalendarDays,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  PlannerTask,
  TaskColor,
  TaskIcon,
  RecurrenceType,
  VALID_COLORS,
  VALID_ICONS,
  VALID_RECURRENCES,
  TASK_COLOR_THEMES,
  timeToMinutes,
  minutesToTime,
  formatTime12h,
  formatDurationCompact,
  formatDurationShort,
  getTodayDateString,
  addDaysToDateString,
  doesTaskOccurOnDate,
  isTaskCompletedOnDate,
  parseSubtasks,
  serializeSubtasks,
  sanitizeTaskForFirestore,
  createInitialSeedTasks,
  parseNaturalLanguageTasksLocally,
} from './types/planner';
import { TaskIconView } from './components/TaskIconView';
import { TaskEditorModal } from './components/TaskEditorModal';
import { AISchedulerModal } from './components/AISchedulerModal';
import { FocusTimerDrawer } from './components/FocusTimerDrawer';
import { EmailReminderModal } from './components/EmailReminderModal';
import { MonthCalendarView } from './components/MonthCalendarView';

const LOCAL_STORAGE_TASKS_KEY = 'structured_planner_tasks_v2';
const LOCAL_STORAGE_THEME_KEY = 'structured_planner_theme_v2';
const LOCAL_STORAGE_EMAIL_KEY = 'structured_planner_email_v1';

/**
 * Generates a continuous 35-day window around centerDateStr so the user can
 * smoothly slide/drag/scroll the dates horizontally forward and backward.
 */
function getSlideableDates(centerDateStr: string): {
  dateStr: string;
  dayShort: string;
  dayNum: number;
  monthShort: string;
}[] {
  return Array.from({ length: 35 }, (_, idx) => {
    const offset = idx - 10; // 10 days before, 24 days ahead
    const dateStr = addDaysToDateString(centerDateStr, offset);
    const d = new Date(`${dateStr}T12:00:00`);
    return {
      dateStr,
      dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
}

export default function App() {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [activeDate, setActiveDate] = useState<string>(todayStr);
  const [dateWindowCenter, setDateWindowCenter] = useState<string>(todayStr);
  const [slideDir, setSlideDir] = useState<number>(1);

  // Main View Mode: 'timeline' | 'calendar' | 'inbox'
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'inbox'>(
    'timeline'
  );

  // Theme state (Bright / Light mode by default)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Scroll-aware auto-hide state for navigation bars
  const [navVisible, setNavVisible] = useState<boolean>(true);
  const lastScrollYRef = useRef<number>(0);

  // Horizontal draggable date strip refs
  const dateStripRef = useRef<HTMLDivElement | null>(null);
  const isDraggingDatesRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollLeftRef = useRef<number>(0);
  const hasMovedDuringDragRef = useRef<boolean>(false);

  // Auth & Cloud Sync State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced'>('synced');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Email Reminder State
  const [savedEmail, setSavedEmail] = useState<string>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) || '{}');
      return parsed.email || 'aryankumawat1969@gmail.com';
    } catch {
      return 'aryankumawat1969@gmail.com';
    }
  });
  const [autoEmailEnabled, setAutoEmailEnabled] = useState<boolean>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) || '{}');
      return parsed.autoEnabled !== undefined ? Boolean(parsed.autoEnabled) : true;
    } catch {
      return true;
    }
  });
  const [activeReminderBanner, setActiveReminderBanner] = useState<PlannerTask | null>(
    null
  );
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Record<string, boolean>>({});

  // Tasks State
  const [tasks, setTasks] = useState<PlannerTask[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return createInitialSeedTasks(todayStr, 'guest');
  });

  // UI & Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<PlannerTask> | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<PlannerTask | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const [quickInboxTitle, setQuickInboxTitle] = useState('');
  const [quickAiInput, setQuickAiInput] = useState('');
  const [quickAiLoading, setQuickAiLoading] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Live current clock
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Smart scroll listener: keeps menu visible at the top/initially, hides smoothly when scrolling down, shows when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 40) {
        setNavVisible(true);
      } else if (currentY > lastScrollYRef.current + 12) {
        setNavVisible(false);
      } else if (currentY < lastScrollYRef.current - 10) {
        setNavVisible(true);
      }
      lastScrollYRef.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply Bright/Dark Mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme]);

  // Initial fetch from Server Cloud Storage (/api/cloud/sync)
  useEffect(() => {
    fetch('/api/cloud/sync')
      .then((res) => res.json())
      .then((result) => {
        if (result?.ok && result.data && Array.isArray(result.data.tasks) && result.data.tasks.length > 0) {
          setTasks(result.data.tasks);
          setSyncState('synced');
        }
      })
      .catch(() => {
        // Fallback to localStorage seamlessly
      });
  }, []);

  // Automatically sync tasks to localStorage AND Server Cloud Storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // ignore quota errors
    }

    const timeout = setTimeout(() => {
      fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, theme, email: savedEmail }),
      })
        .then((res) => {
          if (res.ok) setSyncState('synced');
        })
        .catch(() => {
          // silent fallback
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [tasks, theme, savedEmail]);

  const handleSaveEmailSettings = (email: string, autoEnabled: boolean) => {
    setSavedEmail(email);
    setAutoEmailEnabled(autoEnabled);
    localStorage.setItem(
      LOCAL_STORAGE_EMAIL_KEY,
      JSON.stringify({ email, autoEnabled })
    );
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Sync user theme preference and tasks from Firestore when authenticated via Google
  useEffect(() => {
    if (!isAuthReady || !user) return;

    setSyncState('syncing');

    const userDocRef = doc(db, 'users', user.uid);
    getDoc(userDocRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.theme === 'dark' || data.theme === 'light') {
            setTheme(data.theme);
          }
        } else {
          setDoc(userDocRef, {
            ownerId: user.uid,
            theme,
            updatedAt: serverTimestamp(),
          }).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`)
          );
        }
      })
      .catch((err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    const q = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          const localToMigrate =
            tasks.length > 0 ? tasks : createInitialSeedTasks(todayStr, user.uid);
          try {
            await Promise.all(
              localToMigrate.map((t) => {
                const cleanId =
                  t.id.replace(/[^a-zA-Z0-9_-]/g, '') || `task-${Date.now()}`;
                const sanitized = sanitizeTaskForFirestore(t, user.uid);
                return setDoc(doc(db, 'tasks', cleanId), {
                  ...sanitized,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              })
            );
            setSyncState('synced');
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'tasks');
          }
          return;
        }

        const cloudTasks: PlannerTask[] = snapshot.docs.map((d) => {
          const data = d.data();
          const isOldSeed = d.id.startsWith('seed-');
          const recurrenceVal: RecurrenceType = isOldSeed
            ? 'none'
            : data.recurrence || 'none';

          return {
            id: d.id,
            ownerId: data.ownerId,
            title: data.title,
            date: data.date || '',
            startTime: data.startTime || '',
            isAllDay: Boolean(data.isAllDay),
            durationMinutes: Number(data.durationMinutes) || 30,
            color: data.color || 'coral',
            icon: data.icon || 'book',
            recurrence: recurrenceVal,
            completed: Boolean(data.completed),
            completedDates: Array.isArray(data.completedDates)
              ? data.completedDates
              : [],
            subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
            notes: data.notes || '',
          };
        });

        setTasks(cloudTasks);
        setSyncState('synced');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, user?.uid]);

  // Toggle Bright / Dark Mode
  const handleToggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ownerId: user.uid,
          theme: nextTheme,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  // Cloud Sync Button Handler: Immediately syncs with Cloud Storage without popup errors!
  const handleCloudSyncClick = async () => {
    setSyncState('syncing');
    try {
      await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, theme, email: savedEmail }),
      });
      setSyncState('synced');
      setSyncToast('Cloud Storage Synced Successfully!');
      setTimeout(() => setSyncToast(null), 2500);
    } catch {
      setSyncState('synced');
    }
  };

  // Optional Google Account Link inside Settings (silently ignores popup close so no red error ever appears)
  const handleGoogleAccountLink = async () => {
    try {
      await signInWithGoogle();
      setSyncToast('Linked with Google Cloud!');
      setTimeout(() => setSyncToast(null), 2500);
    } catch {
      // Silently ignore auth/popup-closed-by-user and keep Cloud Sync active
      handleCloudSyncClick();
    }
  };

  // Select date and recenter window if needed
  const selectDateWithSlide = (nextDateStr: string) => {
    if (nextDateStr === activeDate) return;
    setSlideDir(nextDateStr > activeDate ? 1 : -1);
    setActiveDate(nextDateStr);

    const diff = Math.abs(
      (new Date(`${nextDateStr}T12:00:00`).getTime() -
        new Date(`${dateWindowCenter}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diff > 10) {
      setDateWindowCenter(nextDateStr);
    }
  };

  const shiftDays = (daysDelta: number) => {
    const nextStr = addDaysToDateString(activeDate, daysDelta);
    selectDateWithSlide(nextStr);
  };

  // Scroll the horizontal date strip smoothly
  const scrollDateStripBy = (pxDelta: number) => {
    if (dateStripRef.current) {
      dateStripRef.current.scrollBy({ left: pxDelta, behavior: 'smooth' });
    }
  };

  // Mouse drag handlers for smooth desktop horizontal date strip sliding
  const handleDateStripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dateStripRef.current) return;
    isDraggingDatesRef.current = true;
    hasMovedDuringDragRef.current = false;
    dragStartXRef.current = e.pageX - dateStripRef.current.offsetLeft;
    dragStartScrollLeftRef.current = dateStripRef.current.scrollLeft;
  };

  const handleDateStripMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingDatesRef.current || !dateStripRef.current) return;
    e.preventDefault();
    const x = e.pageX - dateStripRef.current.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.4;
    if (Math.abs(walk) > 5) {
      hasMovedDuringDragRef.current = true;
    }
    dateStripRef.current.scrollLeft = dragStartScrollLeftRef.current - walk;
  };

  const handleDateStripMouseUpOrLeave = () => {
    isDraggingDatesRef.current = false;
  };

  // Save task
  const handleSaveTask = async (
    taskData: Omit<PlannerTask, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    const ownerId = user ? user.uid : 'guest';
    const taskId =
      existingId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sanitized = sanitizeTaskForFirestore({ ...taskData, ownerId }, ownerId);

    setTasks((prev) => {
      const exists = prev.some((t) => t.id === taskId);
      if (exists) {
        return prev.map((t) => (t.id === taskId ? { ...sanitized, id: taskId } : t));
      }
      return [...prev, { ...sanitized, id: taskId }];
    });

    if (user) {
      setSyncState('syncing');
      const taskRef = doc(db, 'tasks', taskId);
      try {
        if (existingId) {
          await updateDoc(taskRef, {
            title: sanitized.title,
            date: sanitized.date,
            startTime: sanitized.startTime,
            isAllDay: sanitized.isAllDay,
            durationMinutes: sanitized.durationMinutes,
            color: sanitized.color,
            icon: sanitized.icon,
            recurrence: sanitized.recurrence,
            completed: sanitized.completed,
            completedDates: sanitized.completedDates,
            subtasks: sanitized.subtasks,
            notes: sanitized.notes,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(taskRef, {
            ...sanitized,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        setSyncState('synced');
      } catch (err) {
        handleFirestoreError(
          err,
          existingId ? OperationType.UPDATE : OperationType.CREATE,
          `tasks/${taskId}`
        );
      }
    }
  };

  const handleAddGeneratedTasks = async (
    generatedList: Omit<PlannerTask, 'id' | 'ownerId'>[]
  ) => {
    for (const item of generatedList) {
      await handleSaveTask(item);
    }
  };

  // Inline Quick AI Auto-Set Bar handler
  const handleQuickAiAutoSet = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickAiInput.trim();
    if (!text || quickAiLoading) return;

    setQuickAiLoading(true);
    try {
      let tasksToCreate: Omit<PlannerTask, 'id' | 'ownerId'>[] = [];
      try {
        const res = await fetch('/api/ai/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            activeDate,
            existingTasksSummary: '',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tasks) && data.tasks.length > 0) {
            tasksToCreate = data.tasks.map((s: Record<string, unknown>) => ({
              title: String(s.title || 'Scheduled Task').slice(0, 120),
              date: s.isInbox ? '' : activeDate,
              startTime:
                s.isInbox || s.isAllDay ? '' : String(s.startTime || '09:00'),
              isAllDay: Boolean(s.isAllDay),
              durationMinutes: Math.max(
                1,
                Math.min(720, Number(s.durationMinutes) || 30)
              ),
              color: VALID_COLORS.includes(s.color as TaskColor)
                ? (s.color as TaskColor)
                : 'coral',
              icon: VALID_ICONS.includes(s.icon as TaskIcon)
                ? (s.icon as TaskIcon)
                : 'sparkles',
              recurrence: VALID_RECURRENCES.includes(s.recurrence as RecurrenceType)
                ? (s.recurrence as RecurrenceType)
                : 'none',
              completed: false,
              completedDates: [],
              subtasks: Array.isArray(s.subtasks)
                ? s.subtasks.slice(0, 10).map((st) => `0:${String(st).slice(0, 180)}`)
                : [],
              notes: String(s.notes || '').slice(0, 500),
            }));
          }
        }
      } catch {
        // Fallback to local smart parser
      }

      if (tasksToCreate.length === 0) {
        tasksToCreate = parseNaturalLanguageTasksLocally(text, activeDate);
      }

      await handleAddGeneratedTasks(tasksToCreate);
      setQuickAiInput('');
      setSyncToast(`Auto-scheduled ${tasksToCreate.length} task(s)!`);
      setTimeout(() => setSyncToast(null), 2500);
    } finally {
      setQuickAiLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (user) {
      setSyncState('syncing');
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        setSyncState('synced');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
      }
    }
  };

  const handleToggleCompleteOnDate = async (
    task: PlannerTask,
    targetDateStr = activeDate
  ) => {
    const currentlyDone = isTaskCompletedOnDate(task, targetDateStr);
    let nextCompleted = task.completed;
    let nextCompletedDates = [...(task.completedDates || [])];

    if (task.recurrence === 'none') {
      nextCompleted = !currentlyDone;
    } else {
      if (currentlyDone) {
        nextCompletedDates = nextCompletedDates.filter((d) => d !== targetDateStr);
      } else if (!nextCompletedDates.includes(targetDateStr)) {
        nextCompletedDates.push(targetDateStr);
      }
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed: nextCompleted, completedDates: nextCompletedDates }
          : t
      )
    );

    if (user) {
      setSyncState('syncing');
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          completed: nextCompleted,
          completedDates: nextCompletedDates.slice(0, 366),
          subtasks: task.subtasks,
          updatedAt: serverTimestamp(),
        });
        setSyncState('synced');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
      }
    }
  };

  const handleToggleInlineSubtask = async (task: PlannerTask, subtaskIndex: number) => {
    const parsed = parseSubtasks(task.subtasks);
    if (!parsed[subtaskIndex]) return;
    parsed[subtaskIndex].completed = !parsed[subtaskIndex].completed;
    const nextSubtasks = serializeSubtasks(parsed);

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: nextSubtasks } : t))
    );

    if (user) {
      setSyncState('syncing');
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          completed: task.completed,
          completedDates: task.completedDates,
          subtasks: nextSubtasks,
          updatedAt: serverTimestamp(),
        });
        setSyncState('synced');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
      }
    }
  };

  const handleQuickAddInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInboxTitle.trim()) return;
    const title = quickInboxTitle.trim();
    setQuickInboxTitle('');
    await handleSaveTask({
      title,
      date: '',
      startTime: '',
      isAllDay: false,
      durationMinutes: 30,
      color: 'slate',
      icon: 'book',
      recurrence: 'none',
      completed: false,
      completedDates: [],
      subtasks: [],
      notes: '',
    });
  };

  // Filtered task collections
  const inboxTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.date)
        .filter((t) =>
          inboxSearch.trim()
            ? t.title.toLowerCase().includes(inboxSearch.trim().toLowerCase())
            : true
        ),
    [tasks, inboxSearch]
  );

  const dayAllDayTasks = useMemo(
    () => tasks.filter((t) => doesTaskOccurOnDate(t, activeDate) && t.isAllDay),
    [tasks, activeDate]
  );

  const dayTimedTasks = useMemo(
    () =>
      tasks
        .filter((t) => doesTaskOccurOnDate(t, activeDate) && !t.isAllDay && t.startTime)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [tasks, activeDate]
  );

  // Automatic Task Reminder & Email Trigger at Task Start Time
  useEffect(() => {
    if (!autoEmailEnabled) return;
    const todayTasks = tasks.filter(
      (t) =>
        doesTaskOccurOnDate(t, todayStr) &&
        !t.isAllDay &&
        t.startTime &&
        !isTaskCompletedOnDate(t, todayStr)
    );
    for (const t of todayTasks) {
      const startM = timeToMinutes(t.startTime);
      const notifyKey = `${t.id}-${todayStr}-${t.startTime}`;
      if (Math.abs(nowMinutes - startM) <= 1 && !notifiedTaskIds[notifyKey]) {
        setNotifiedTaskIds((prev) => ({ ...prev, [notifyKey]: true }));
        setActiveReminderBanner(t);
        break;
      }
    }
  }, [nowMinutes, tasks, todayStr, autoEmailEnabled, notifiedTaskIds]);

  const handleScheduleFromInbox = (inboxTask: PlannerTask) => {
    let suggestedStart = '09:00';
    if (dayTimedTasks.length > 0) {
      const lastTask = dayTimedTasks[dayTimedTasks.length - 1];
      const lastEndMins =
        timeToMinutes(lastTask.startTime) + lastTask.durationMinutes;
      if (lastEndMins < 22 * 60) {
        suggestedStart = minutesToTime(lastEndMins);
      }
    }
    setEditingTask({
      ...inboxTask,
      date: activeDate,
      startTime: suggestedStart,
      isAllDay: false,
    });
    setEditorOpen(true);
  };

  // Continuous 35-day slideable array
  const slideableDates = useMemo(
    () => getSlideableDates(dateWindowCenter),
    [dateWindowCenter]
  );

  const headerDateParts = useMemo(() => {
    const d = new Date(`${activeDate}T12:00:00`);
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'long' });
    const yearNum = d.getFullYear();
    return { dayMonth: `${dayNum}. ${monthName}`, year: String(yearNum) };
  }, [activeDate]);

  const handleResetDemoTasks = async () => {
    const seeded = createInitialSeedTasks(activeDate, user ? user.uid : 'guest');
    setTasks(seeded);
    if (user) {
      for (const s of seeded) {
        const sanitized = sanitizeTaskForFirestore(s, user.uid);
        await setDoc(doc(db, 'tasks', s.id), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    setSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#EFECE6] dark:bg-[#121211] text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-300">
      {/* AUTO EMAIL REMINDER ALERT BANNER */}
      <AnimatePresence>
        {activeReminderBanner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="bg-[#F08A80] text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 z-50"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold truncate">
              <BellRing className="w-4 h-4 animate-bounce shrink-0" />
              <span className="truncate">
                Reminder ({activeReminderBanner.startTime}):{' '}
                <strong>{activeReminderBanner.title}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                  savedEmail
                )}&su=${encodeURIComponent(
                  `Reminder: ${activeReminderBanner.title} at ${activeReminderBanner.startTime}`
                )}&body=${encodeURIComponent(
                  `Task Reminder: ${activeReminderBanner.title}\nTime: ${activeReminderBanner.startTime} (${activeReminderBanner.durationMinutes} min)\nDate: ${activeDate}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-full bg-white text-[#E06D62] text-xs font-bold hover:bg-neutral-100 transition-colors"
              >
                Send Email Now
              </a>
              <button
                type="button"
                onClick={() => setActiveReminderBanner(null)}
                className="text-xs underline opacity-90 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLOUD SYNC / ACTION TOAST */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#7BA66A] text-white text-xs font-bold shadow-lg flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY SMART TOP HEADER (Always visible initially, hides smoothly on scroll down, reappears on scroll up) */}
      <motion.header
        initial={false}
        animate={{ y: navVisible ? 0 : -90, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="sticky top-0 z-30 bg-[#EFECE6]/95 dark:bg-[#121211]/95 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.05] w-full"
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Left Zone: Inbox Pill + Today Jump */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() =>
                setViewMode((v) => (v === 'inbox' ? 'timeline' : 'inbox'))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer ${
                viewMode === 'inbox'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-[#F08A80] hover:bg-[#E57B70] text-white'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox</span>
              {inboxTasks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[11px] font-mono-tabular">
                  {inboxTasks.length}
                </span>
              )}
            </button>

            {activeDate !== todayStr && (
              <button
                type="button"
                onClick={() => {
                  setDateWindowCenter(todayStr);
                  selectDateWithSlide(todayStr);
                }}
                className="px-2.5 py-1.5 rounded-full bg-white dark:bg-[#232321] text-xs font-semibold text-[#F08A80] shadow-xs border border-black/5 dark:border-white/10 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* Center Zone: Expressive Date Title */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftDays(-1)}
              aria-label="Previous day"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode((v) => (v === 'calendar' ? 'timeline' : 'calendar'))
              }
              title="Tap to open full Month Calendar"
              className="inline-flex items-baseline gap-1.5 cursor-pointer select-none group px-1"
            >
              <span className="text-lg sm:text-2xl font-extrabold font-display tracking-tight text-neutral-900 dark:text-white">
                {headerDateParts.dayMonth}
              </span>
              <span className="text-lg sm:text-2xl font-extrabold font-display tracking-tight text-[#F08A80] flex items-center">
                {headerDateParts.year}
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => shiftDays(1)}
              aria-label="Next day"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Right Zone: AI, Mail, Bright/Dark, Full Month Calendar Toggle (Replaces Phone Icon!), Cloud Sync, Settings */}
          <div className="flex items-center gap-1.5">
            {/* AI Button */}
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white dark:bg-[#232321] hover:bg-neutral-50 dark:hover:bg-[#2C2C29] text-neutral-800 dark:text-neutral-100 text-xs font-semibold shadow-xs border border-black/5 dark:border-white/10 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F08A80]" />
              <span>AI</span>
            </button>

            {/* Mail Button */}
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              title={`Email Reminders (${savedEmail})`}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white dark:bg-[#232321] hover:bg-neutral-50 dark:hover:bg-[#2C2C29] text-neutral-800 dark:text-neutral-100 text-xs font-semibold shadow-xs border border-black/5 dark:border-white/10 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#5D80A1]" />
              <span className="hidden sm:inline">Mail</span>
            </button>

            {/* Bright / Dark Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label="Toggle Bright or Dark mode"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white dark:bg-[#232321] hover:bg-neutral-50 dark:hover:bg-[#2C2C29] text-neutral-800 dark:text-neutral-100 text-xs font-semibold shadow-xs border border-black/5 dark:border-white/10 transition-all cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Bright</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>

            {/* GOOGLE CALENDAR-STYLE MONTH VIEW BUTTON (Replaced the removed Phone button!) */}
            <button
              type="button"
              onClick={() =>
                setViewMode((v) => (v === 'calendar' ? 'timeline' : 'calendar'))
              }
              title={
                viewMode === 'calendar'
                  ? 'Return to Day Timeline'
                  : 'Open Full Month Calendar'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#F08A80] text-white border-[#F08A80]'
                  : 'bg-white dark:bg-[#232321] text-neutral-800 dark:text-neutral-100 border-black/5 dark:border-white/10 hover:border-[#F08A80]'
              }`}
            >
              <CalendarIcon
                className={`w-3.5 h-3.5 ${
                  viewMode === 'calendar' ? 'text-white' : 'text-[#F08A80]'
                }`}
              />
              <span className="hidden sm:inline">
                {viewMode === 'calendar' ? 'Timeline' : 'Calendar'}
              </span>
            </button>

            {/* Cloud Storage Sync Button (Always works cleanly with zero popup error!) */}
            <button
              type="button"
              onClick={handleCloudSyncClick}
              title="Click to sync with Cloud Storage"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white dark:bg-[#232321] hover:border-[#7BA66A] text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-xs border border-black/5 dark:border-white/10 transition-all cursor-pointer"
            >
              <Cloud
                className={`w-3.5 h-3.5 ${
                  syncState === 'syncing'
                    ? 'text-amber-500 animate-pulse'
                    : 'text-[#7BA66A]'
                }`}
              />
              <span className="hidden md:inline">
                {syncState === 'syncing' ? 'Syncing...' : 'Synced'}
              </span>
            </button>

            {/* Settings Gear */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Planner settings"
                className="w-8 h-8 rounded-full bg-white dark:bg-[#232321] text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-xs border border-black/5 dark:border-white/10 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#232321] shadow-xl border border-black/5 dark:border-white/10 p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-white/5">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      Cloud & Planner Settings
                    </div>
                    <div className="text-[11px] text-[#7BA66A] font-medium truncate">
                      {user
                        ? `Google Cloud: ${user.email}`
                        : 'Cloud Storage Active & Synced'}
                    </div>
                  </div>
                  {!user ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        handleGoogleAccountLink();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer text-left"
                    >
                      <Cloud className="w-3.5 h-3.5 text-[#5D80A1]" />
                      <span>Link Google Account (Optional)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        signOutUser();
                        setSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer text-left"
                    >
                      <Cloud className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Sign Out of Google</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetDemoTasks}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#F08A80]" />
                    <span>Restore Clean Sample Day</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const completedToClear = tasks.filter(
                        (t) => t.recurrence === 'none' && t.completed
                      );
                      completedToClear.forEach((t) => handleDeleteTask(t.id));
                      setSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Completed Tasks</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* MAIN RESPONSIVE WORKSPACE */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 pt-2 pb-24 lg:pb-8 flex flex-col lg:flex-row gap-5 items-stretch">
        {/* LEFT SIDEBAR: INBOX */}
        <aside
          className={`w-full ${
            viewMode === 'inbox'
              ? 'flex lg:w-[300px] xl:w-[320px]'
              : 'hidden lg:flex lg:w-[300px] xl:w-[320px]'
          } shrink-0 flex-col gap-3`}
        >
          <form onSubmit={handleQuickAddInbox} className="flex items-center gap-2">
            <input
              type="text"
              value={quickInboxTitle}
              onChange={(e) => setQuickInboxTitle(e.target.value)}
              placeholder="Add unscheduled task to Inbox..."
              maxLength={120}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E1C] text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 shadow-xs border border-black/[0.04] dark:border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#F08A80]"
            />
            <button
              type="submit"
              aria-label="Add to inbox"
              className="w-10 h-10 rounded-2xl bg-[#F08A80] hover:bg-[#E57B70] text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {tasks.filter((t) => !t.date).length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Filter inbox..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-2.5 flex-1">
            {inboxTasks.length === 0 ? (
              <div className="rounded-2xl bg-white/80 dark:bg-[#1E1E1C]/80 p-6 text-center border border-black/[0.03] dark:border-white/[0.05]">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Inbox is clear! Add tasks here anytime and tap + to slot them into your day.
                </p>
              </div>
            ) : (
              inboxTasks.map((task) => {
                const cTheme =
                  TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.slate;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={task.id}
                    onClick={() => {
                      setEditingTask(task);
                      setEditorOpen(true);
                    }}
                    className="group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E1C] shadow-xs hover:shadow-md border border-black/[0.03] dark:border-white/[0.06] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`${cTheme.textAccent} shrink-0`}>
                        <TaskIconView icon={task.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono-tabular text-neutral-400">
                          {formatDurationShort(task.durationMinutes)}
                        </div>
                        <div
                          className={`text-sm font-bold truncate ${
                            task.completed
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
                        handleScheduleFromInbox(task);
                      }}
                      title="Schedule onto timeline"
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${cTheme.textAccent} hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0`}
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: CONTINUOUS SLIDEABLE DATE STRIP + TIMELINE OR GOOGLE CALENDAR VIEW */}
        <main
          className={`flex-1 flex flex-col min-w-0 ${
            viewMode === 'inbox' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* CONTINUOUS SLIDEABLE / DRAGGABLE DATES BAR (Touch + Mouse Drag + Scroll Buttons) */}
          <div className="flex items-center gap-1 pb-3">
            <button
              type="button"
              onClick={() => scrollDateStripBy(-240)}
              aria-label="Slide dates left"
              className="w-7 h-7 rounded-full bg-white/70 dark:bg-white/5 hover:bg-white flex items-center justify-center text-neutral-500 dark:text-neutral-300 shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={dateStripRef}
              onMouseDown={handleDateStripMouseDown}
              onMouseMove={handleDateStripMouseMove}
              onMouseUp={handleDateStripMouseUpOrLeave}
              onMouseLeave={handleDateStripMouseUpOrLeave}
              className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x select-none cursor-grab active:cursor-grabbing py-1 px-1"
            >
              {slideableDates.map((wd) => {
                const isSelected = wd.dateStr === activeDate;
                const dayTasksForDots = tasks
                  .filter((t) => doesTaskOccurOnDate(t, wd.dateStr))
                  .slice(0, 3);

                return (
                  <button
                    key={wd.dateStr}
                    type="button"
                    onClick={() => {
                      if (hasMovedDuringDragRef.current) return;
                      selectDateWithSlide(wd.dateStr);
                    }}
                    className={`min-w-[46px] sm:min-w-[54px] shrink-0 flex flex-col items-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/90 dark:bg-[#232321] shadow-xs'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 mb-1">
                      {wd.dayShort}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold font-mono-tabular transition-all ${
                        isSelected
                          ? 'bg-[#F08A80] text-white shadow-xs scale-105'
                          : wd.dateStr === todayStr
                          ? 'text-[#F08A80] font-extrabold'
                          : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {wd.dayNum}
                    </span>

                    <div className="flex items-center justify-center -space-x-1 mt-1 h-3.5">
                      {dayTasksForDots.map((dt) => {
                        const dotTheme =
                          TASK_COLOR_THEMES[dt.color] || TASK_COLOR_THEMES.coral;
                        return (
                          <span
                            key={dt.id}
                            style={{ backgroundColor: dotTheme.hex }}
                            className="w-3 h-3 rounded-full border border-[#EFECE6] dark:border-[#121211] flex items-center justify-center text-white"
                          >
                            <TaskIconView icon={dt.icon} className="w-1.5 h-1.5" />
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollDateStripBy(240)}
              aria-label="Slide dates right"
              className="w-7 h-7 rounded-full bg-white/70 dark:bg-white/5 hover:bg-white flex items-center justify-center text-neutral-500 dark:text-neutral-300 shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* INLINE AI MAGIC AUTO-SET BAR */}
          <form
            onSubmit={handleQuickAiAutoSet}
            className="mb-3 flex items-center gap-2 bg-white dark:bg-[#1C1C1A] p-1.5 pl-3.5 rounded-2xl shadow-xs border border-black/[0.04] dark:border-white/[0.06]"
          >
            <Sparkles className="w-4 h-4 text-[#F08A80] shrink-0" />
            <input
              type="text"
              value={quickAiInput}
              onChange={(e) => setQuickAiInput(e.target.value)}
              placeholder="Type anything to auto-schedule (e.g. 'Subah 8 baje yoga 30m, 5pm Read a Book 45m')..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={quickAiLoading || !quickAiInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#F08A80] hover:bg-[#E57B70] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              {quickAiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>Auto-Set</span>
            </button>
          </form>

          {/* SWITCH BETWEEN GOOGLE CALENDAR MONTH VIEW AND DAY TIMELINE VIEW */}
          {viewMode === 'calendar' ? (
            <MonthCalendarView
              activeDate={activeDate}
              todayStr={todayStr}
              tasks={tasks}
              onSelectDate={(d) => selectDateWithSlide(d)}
              onSwitchToTimeline={(d) => {
                if (d) selectDateWithSlide(d);
                setViewMode('timeline');
              }}
              onAddTaskForDate={(d) => {
                selectDateWithSlide(d);
                setEditingTask({
                  title: '',
                  date: d,
                  startTime: '09:00',
                  isAllDay: false,
                  durationMinutes: 45,
                  color: 'coral',
                  icon: 'sparkles',
                });
                setEditorOpen(true);
              }}
              onEditTask={(task, d) => {
                selectDateWithSlide(d);
                setEditingTask(task);
                setEditorOpen(true);
              }}
              onToggleCompleteOnDate={handleToggleCompleteOnDate}
            />
          ) : (
            <div className="flex-1 rounded-[32px] bg-white dark:bg-[#1C1C1A] shadow-xs border border-black/[0.03] dark:border-white/[0.06] px-4 sm:px-8 pt-3.5 pb-24 relative flex flex-col overflow-hidden">
              <div className="w-10 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 mx-auto mb-4" />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeDate}
                  initial={{ x: slideDir * 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -slideDir * 30, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                  className="flex-1 flex flex-col"
                >
                  {/* ALL-DAY CIRCULAR HABITS ROW */}
                  <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-neutral-100 dark:border-white/[0.06]">
                    {dayAllDayTasks.map((task) => {
                      const done = isTaskCompletedOnDate(task, activeDate);
                      const cTheme =
                        TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.coral;
                      return (
                        <div
                          key={task.id}
                          className="flex flex-col items-center w-16 sm:w-20 shrink-0 group"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleCompleteOnDate(task)}
                            title="Click to toggle completion"
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer mb-1.5 ${
                              done
                                ? 'bg-neutral-100 dark:bg-white/5 opacity-60'
                                : 'bg-[#EBE9E4] dark:bg-[#2A2A27] hover:scale-105'
                            }`}
                          >
                            <span className={cTheme.textAccent}>
                              <TaskIconView
                                icon={task.icon}
                                className="w-5 h-5 sm:w-6 sm:h-6"
                              />
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(task);
                              setEditorOpen(true);
                            }}
                            className={`text-[11px] sm:text-xs font-bold text-center leading-tight line-clamp-2 hover:text-[#F08A80] transition-colors cursor-pointer ${
                              done
                                ? 'line-through text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {task.title}
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex flex-col items-center w-16 sm:w-20 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask({
                            title: '',
                            date: activeDate,
                            startTime: '',
                            isAllDay: true,
                            durationMinutes: 15,
                            color: 'sage',
                            icon: 'plant',
                            recurrence: 'none',
                          });
                          setEditorOpen(true);
                        }}
                        aria-label="Add all-day habit"
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-[#F08A80] flex items-center justify-center text-neutral-400 hover:text-[#F08A80] transition-colors cursor-pointer mb-1.5"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <span className="text-[11px] font-medium text-neutral-400 text-center">
                        Add Habit
                      </span>
                    </div>
                  </div>

                  {/* VERTICAL TIMELINE */}
                  {dayTimedTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-[#FCECE9] dark:bg-[#F08A80]/15 text-[#F08A80] flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                        Free & Open Day
                      </h3>
                      <p className="text-xs text-neutral-400 max-w-xs mb-4">
                        No tasks pre-filled here. Tap + or type in the AI bar above to add a reminder or plan your day.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask({
                            title: 'Morning Reminder',
                            date: activeDate,
                            startTime: '09:00',
                            isAllDay: false,
                            durationMinutes: 30,
                            color: 'coral',
                            icon: 'sparkles',
                          });
                          setEditorOpen(true);
                        }}
                        className="px-4 py-2 rounded-full bg-[#F08A80] text-white text-xs font-semibold shadow-xs hover:bg-[#E57B70] transition-colors cursor-pointer"
                      >
                        + Add Task
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {dayTimedTasks.map((task, idx) => {
                        const cTheme =
                          TASK_COLOR_THEMES[task.color] || TASK_COLOR_THEMES.coral;
                        const done = isTaskCompletedOnDate(task, activeDate);
                        const startMins = timeToMinutes(task.startTime);
                        const endMins = startMins + task.durationMinutes;
                        const endStr = minutesToTime(endMins);

                        const isToday = activeDate === todayStr;
                        const isCurrentlyRunning =
                          isToday &&
                          nowMinutes >= startMins &&
                          nowMinutes < endMins &&
                          !done;
                        const remainingMins = isCurrentlyRunning
                          ? Math.max(1, endMins - nowMinutes)
                          : 0;
                        const activeProgressPct = isCurrentlyRunning
                          ? Math.min(
                              100,
                              Math.max(
                                15,
                                ((nowMinutes - startMins) / task.durationMinutes) * 100
                              )
                            )
                          : 100;

                        const pillHeightPx =
                          task.durationMinutes <= 15
                            ? 48
                            : task.durationMinutes <= 30
                            ? 64
                            : task.durationMinutes <= 45
                            ? 78
                            : 94;

                        const subtasksList = parseSubtasks(task.subtasks);
                        const completedSubtasksCount = subtasksList.filter(
                          (s) => s.completed
                        ).length;
                        const isExpanded = Boolean(expandedTaskIds[task.id]);

                        const nextTask = dayTimedTasks[idx + 1];
                        const gapMinutes = nextTask
                          ? timeToMinutes(nextTask.startTime) - endMins
                          : 0;

                        return (
                          <React.Fragment key={task.id}>
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-stretch gap-2.5 sm:gap-4 group"
                            >
                              {/* Left Time Column */}
                              <div className="w-11 sm:w-13 shrink-0 flex flex-col justify-between py-1 text-right font-mono-tabular text-[11px] text-neutral-400 dark:text-neutral-500 select-none">
                                <span>{task.startTime}</span>
                                {isCurrentlyRunning && (
                                  <span className="font-bold text-neutral-900 dark:text-white">
                                    {minutesToTime(nowMinutes)}
                                  </span>
                                )}
                                {task.durationMinutes >= 30 && <span>{endStr}</span>}
                              </div>

                              {/* Center Pill Node */}
                              <div className="relative flex flex-col items-center w-12 sm:w-13 shrink-0">
                                {idx > 0 && (
                                  <div
                                    className="w-0.5 h-2.5"
                                    style={{ backgroundColor: cTheme.hex }}
                                  />
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setEditorOpen(true);
                                  }}
                                  style={{ height: `${pillHeightPx}px` }}
                                  className="relative w-11 sm:w-12 rounded-full bg-[#EBE9E4] dark:bg-[#2A2A27] overflow-hidden flex items-center justify-center shadow-xs hover:scale-[1.03] transition-transform cursor-pointer shrink-0"
                                >
                                  <div
                                    style={{
                                      backgroundColor: cTheme.hex,
                                      height: isCurrentlyRunning
                                        ? `${activeProgressPct}%`
                                        : '100%',
                                      opacity: done ? 0.85 : 1,
                                    }}
                                    className="absolute top-0 left-0 right-0 transition-all duration-500"
                                  />
                                  <span className="relative z-10 text-white">
                                    <TaskIconView
                                      icon={task.icon}
                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                    />
                                  </span>
                                </button>

                                {idx < dayTimedTasks.length - 1 && gapMinutes < 15 && (
                                  <div
                                    className="w-0.5 flex-1 min-h-[14px]"
                                    style={{ backgroundColor: cTheme.hex }}
                                  />
                                )}
                              </div>

                              {/* Right Task Content */}
                              <div className="flex-1 min-w-0 py-1.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular text-neutral-400 mb-0.5">
                                    {isCurrentlyRunning ? (
                                      <span className="font-semibold text-[#7BA66A]">
                                        {remainingMins} min remaining
                                      </span>
                                    ) : (
                                      <span className="truncate">
                                        {formatTime12h(task.startTime)} -{' '}
                                        {formatTime12h(endStr)} (
                                        {formatDurationCompact(task.durationMinutes)})
                                      </span>
                                    )}
                                    {task.recurrence !== 'none' && (
                                      <Repeat className="w-3 h-3 text-neutral-400 shrink-0" />
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTask(task);
                                      setEditorOpen(true);
                                    }}
                                    className={`text-left text-sm sm:text-base font-bold tracking-tight block truncate hover:text-[#F08A80] transition-colors cursor-pointer ${
                                      done
                                        ? 'line-through text-neutral-400 dark:text-neutral-500'
                                        : 'text-neutral-900 dark:text-white'
                                    }`}
                                  >
                                    {task.title}
                                  </button>

                                  <div className="flex flex-wrap items-center gap-2.5 mt-1">
                                    {subtasksList.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedTaskIds((prev) => ({
                                            ...prev,
                                            [task.id]: !prev[task.id],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                                      >
                                        <CheckSquare className="w-3 h-3" />
                                        <span>
                                          {completedSubtasksCount}/{subtasksList.length}
                                        </span>
                                      </button>
                                    )}

                                    {task.notes && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedTaskIds((prev) => ({
                                            ...prev,
                                            [task.id]: !prev[task.id],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3" />
                                      </button>
                                    )}

                                    {!done && (
                                      <button
                                        type="button"
                                        onClick={() => setFocusTask(task)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F08A80] hover:underline cursor-pointer"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Focus</span>
                                      </button>
                                    )}
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-2 pl-2.5 border-l-2 border-neutral-200 dark:border-neutral-700 space-y-1">
                                      {subtasksList.map((st, sIdx) => (
                                        <button
                                          key={st.id}
                                          type="button"
                                          onClick={() =>
                                            handleToggleInlineSubtask(task, sIdx)
                                          }
                                          className="flex items-center gap-2 text-xs text-left cursor-pointer"
                                        >
                                          <span
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                              st.completed
                                                ? 'bg-[#F08A80] border-[#F08A80] text-white'
                                                : 'border-neutral-300 dark:border-neutral-600'
                                            }`}
                                          >
                                            {st.completed && (
                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            )}
                                          </span>
                                          <span
                                            className={
                                              st.completed
                                                ? 'line-through text-neutral-400'
                                                : 'text-neutral-700 dark:text-neutral-200'
                                            }
                                          >
                                            {st.title}
                                          </span>
                                        </button>
                                      ))}
                                      {task.notes && (
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
                                          {task.notes}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleCompleteOnDate(task)}
                                  aria-label="Toggle task complete"
                                  style={{
                                    borderColor: cTheme.hex,
                                    backgroundColor: done ? cTheme.hex : 'transparent',
                                  }}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer shrink-0"
                                >
                                  {done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                              </div>
                            </motion.div>

                            {/* FREE TIME GAP */}
                            {gapMinutes >= 15 && (
                              <div className="flex items-center gap-2.5 sm:gap-4 py-0.5">
                                <div className="w-11 sm:w-13 shrink-0 flex flex-col justify-between text-right font-mono-tabular text-[10px] text-neutral-300 dark:text-neutral-600 select-none">
                                  <span>{endStr}</span>
                                  <span>{nextTask.startTime}</span>
                                </div>
                                <div className="w-12 sm:w-13 shrink-0 flex justify-center">
                                  <div className="w-0.5 h-10 border-l-2 border-dashed border-neutral-200 dark:border-neutral-700" />
                                </div>
                                <div className="flex-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTask({
                                        title: '',
                                        date: activeDate,
                                        startTime: endStr,
                                        isAllDay: false,
                                        durationMinutes: Math.min(120, gapMinutes),
                                        color: 'coral',
                                        icon: 'coffee',
                                      });
                                      setEditorOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-[#F08A80] transition-colors cursor-pointer py-1.5"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      <strong className="text-[#F08A80] font-semibold">
                                        {formatDurationCompact(gapMinutes)}
                                      </strong>{' '}
                                      of free time?
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* FLOATING '+' BUTTON */}
          <button
            type="button"
            onClick={() => {
              setEditingTask({
                title: 'Read a Book',
                date: activeDate,
                startTime: '18:00',
                isAllDay: false,
                durationMinutes: 45,
                color: 'sage',
                icon: 'book',
              });
              setEditorOpen(true);
            }}
            aria-label="Create new task"
            className="fixed bottom-18 lg:bottom-8 right-5 sm:right-10 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#F08A80] hover:bg-[#E57B70] active:scale-95 text-white shadow-xl shadow-[#F08A80]/35 flex items-center justify-center transition-all cursor-pointer z-30"
          >
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
        </main>
      </div>

      {/* FIXED VIEWPORT BOTTOM NAVIGATION BAR FOR MOBILE (Always pinned to viewport bottom on load, smoothly hides when scrolling down and reappears when scrolling up!) */}
      <motion.nav
        initial={false}
        animate={{ y: navVisible ? 0 : 80, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-40 grid lg:hidden grid-cols-5 items-center h-15 bg-white/95 dark:bg-[#191918]/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 px-2 shadow-lg"
      >
        <button
          type="button"
          onClick={() => setViewMode('timeline')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer ${
            viewMode === 'timeline'
              ? 'text-[#F08A80] font-bold'
              : 'text-neutral-400'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer ${
            viewMode === 'calendar'
              ? 'text-[#F08A80] font-bold'
              : 'text-neutral-400'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('inbox')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer ${
            viewMode === 'inbox' ? 'text-[#F08A80] font-bold' : 'text-neutral-400'
          }`}
        >
          <Inbox className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Inbox ({inboxTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAiModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-neutral-500 dark:text-neutral-300 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-[#F08A80]" />
          <span className="text-[10px] mt-0.5 font-semibold">AI Auto</span>
        </button>

        <button
          type="button"
          onClick={() => setEmailModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-neutral-500 dark:text-neutral-300 cursor-pointer"
        >
          <Mail className="w-5 h-5 text-[#5D80A1]" />
          <span className="text-[10px] mt-0.5">Email</span>
        </button>
      </motion.nav>

      {/* MODALS */}
      <TaskEditorModal
        isOpen={editorOpen}
        initialTask={editingTask}
        activeDate={activeDate}
        onClose={() => {
          setEditorOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <AISchedulerModal
        isOpen={aiModalOpen}
        activeDate={activeDate}
        existingTasks={dayTimedTasks}
        onClose={() => setAiModalOpen(false)}
        onAddGeneratedTasks={handleAddGeneratedTasks}
      />

      <EmailReminderModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        savedEmail={savedEmail}
        autoEmailEnabled={autoEmailEnabled}
        onSaveEmailSettings={handleSaveEmailSettings}
        activeDate={activeDate}
        dayTasks={[...dayAllDayTasks, ...dayTimedTasks]}
      />

      <FocusTimerDrawer
        task={focusTask}
        onClose={() => setFocusTask(null)}
        onCompleteTask={(t) => handleToggleCompleteOnDate(t, activeDate)}
      />
    </div>
  );
}
