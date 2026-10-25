# Structured Day-to-Day Visual Planner

A clean, tactile day-to-day visual planner inspired by the reference interface that combines an unscheduled **Inbox**, circular **All-Day Routines**, and a proportional **Visual Timeline** with real-time cloud synchronization, warm Dark Mode, a live Focus Timer, and an AI scheduling assistant.

## User Review & Critical Decisions

> [!IMPORTANT]
> Below is a summary of the product and design choices confirmed from your preferences, along with how cloud storage synchronization will be provisioned once you approve this plan.

- **Confirmed Account & Cloud Sync Model**: **Google Sign-In with automatic Firebase Firestore synchronization** across devices, paired with a seamless **Local Guest Mode fallback** (`localStorage`) so you can immediately use and test every feature offline or before signing in, with automatic one-click cloud migration upon login.
- **Confirmed Feature Scope**:
  1. **Subtasks, Checklists & Notes**: Expandable checklists (`1/3` completion indicators) and rich notes inside any timeline or inbox task.
  2. **Repeating Daily & Weekly Routines**: Support for recurring tasks (`Daily`, `Weekdays`, `Weekly`) that automatically populate across matching dates on the calendar strip.
  3. **AI Auto-Scheduler (`+ AI` button)**: Natural-language day planning (e.g., *"Tomorrow morning I need 45m for yoga at 8am, 1hr to study React, and call grandparents in the afternoon"*) powered by a server-side Gemini API endpoint that converts freeform text into structured, non-overlapping timeline tasks.
  4. **Active Task Focus Timer**: Live countdown and visual fill on the currently running task node (e.g., *"19 min remaining"*), plus a dedicated interactive Focus Timer drawer with play/pause/complete controls.
- **Confirmed Aesthetic & Palette**: Soft coral (`#F48C84`), sage green (`#7FB069`), and slate blue (`#5C7E9E`) pastel palette on a warm alabaster canvas in Light Mode, transitioning to a warm obsidian-slate Dark Mode (`#141413` canvas, `#1E1E1C` elevated timeline sheet) with optical contrast compensation.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms scattered to-dos and daily routines into a calm, visual timeline where every task has a dedicated icon, color, duration pill, and time slot—showing you exactly what you are doing right now, how much time remains, and where your free-time pockets are.
- **Target Audience / Persona**: Students, creators, and professionals who find traditional grid calendars too rigid and plain to-do lists too unstructured.
- **Key Value**: Bridges the gap between an unscheduled **Inbox** (holding tasks with durations like *"1 hr · Do Laundry"*) and a structured **Daily Timeline** with one-tap scheduling, visual free-time calculation, and cross-device cloud sync.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Exploring & Navigating Your Day**:
   - At the top of the workspace, the header displays the active date (`25. October 2026 ›`), a 7-day interactive weekly calendar strip (`Mon` through `Sun`) with mini colored activity icon dots beneath each date, plus quick-action buttons for the **AI Assistant**, **Dark Mode Toggle**, **Cloud Sync / Account Status**, and **Settings**.
   - Directly below the weekly strip, a horizontal row of circular **All-Day / Anytime** bubbles (e.g., *Structure Tomorrow*, *Water Plants*, *Call Mum*) lets users check off flexible daily habits without tying them to a specific clock hour.
2. **Visual Timeline & Live Progress**:
   - The main rounded sheet renders the day's schedule along a vertical axis with tabular timestamps (`8:00`, `8:15`, `9:30`, `10:30`).
   - Each task appears as a colored circular or vertical pill node (scaled proportionally to its duration) containing its category icon, time range, duration label, recurring indicator, subtask counter (`1/3`), and a circular completion checkbox on the right.
   - **Current Time & Free-Time Pockets**: If a task is currently in progress, its node displays a partial color fill and a live *"X min remaining"* status with a **Start Focus** trigger. Gaps between tasks automatically render a subtle dashed timeline connector with an interactive *"30min of free time?"* prompt that lets you schedule a task directly into that open window.
3. **Inbox to Timeline Flow**:
   - The left sidebar houses the **Inbox** for unscheduled tasks (*Do Laundry · 1 hr*, *Do Homework · 1 hr*, *Call Grandparents · 30 min*).
   - Clicking the `+` button on any Inbox card opens the quick-schedule time picker or slots it directly into the next available free-time gap on the active day's timeline.
4. **Task Creation & Edit Sheet (Reference Photo 1)**:
   - Clicking the floating coral `+` button (or any existing task) opens the signature split-header modal:
     - **Colored Top Banner**: Dynamically tinted with the selected task color (e.g., Sage Green `#7FB069` or Coral `#F48C84`), featuring a large circular category icon selector, live time & duration summary (`18:00–18:45 (45 min)`), inline title input (`Read a Book`), and completion toggle.
     - **Date & Recurrence Row**: Interactive date selector with relative labels (*Today*, *Tomorrow*, *Yesterday*) and repeat cadence (*None*, *Daily*, *Weekdays*, *Weekly*).
     - **Interactive Time Wheel / Scroller**: Smooth vertical time-slot selector (`17:30`, `17:45`, highlighted coral pill `18:00–18:45`, `19:00`, `19:15`) in 15-minute increments.
     - **Duration Scroller**: Horizontal segmented pill selector (`1m`, `15m`, `30m`, `45m`, `1h`, `1.5h`, `2h`) with a highlighted coral capsule on the active duration.
     - **Subtasks & Notes**: Add/toggle checklist items and attach plain-text notes before hitting the full-width coral **Continue / Save** button.

### Visual Identity & Theme

- **Aesthetic Direction**: Warm, tactile, human-centric productivity interface combining the calm two-column spatial layout of Reference Photo 2 with the focused, color-adaptive task editor of Reference Photo 1.
- **Color Palette & Mood**:
  - **Light Mode**: Warm Alabaster outer canvas (`#F2EFE9`), Pure Crisp White main timeline sheet (`#FFFFFF`), Soft Coral primary accent (`#F48C84`), Sage Green (`#7EB06B`), Slate Blue (`#5B7E9E`), Warm Amber (`#E8A855`), and Lavender (`#9A86B8`).
  - **Dark Mode**: Deep Warm Charcoal outer canvas (`#121211`), Elevated Obsidian timeline sheet (`#1C1C1A`), Subtle Hairline Borders (`#2A2A27`), and luminous pastel accents tuned for WCAG AA contrast on dark surfaces.
- **Typography & Hierarchy**:
  - **Display & Headings**: `Plus Jakarta Sans` (Bold/SemiBold) for expressive date headers (`25. October 2026`), modal titles, and section headers.
  - **Body & Task Copy**: `DM Sans` (Regular/Medium) for clean task titles, subtask checklists, and notes.
  - **Timestamps & Durations**: `JetBrains Mono` with `tabular-nums` for all timeline clock markers (`08:15`, `18:00–18:45`), countdown timers, and subtask fractions (`1/3`).
- **Component Styling & Layout**:
  - Responsive 1440px desktop two-column architecture (`320px` Inbox sidebar on the left + expansive rounded-3xl Timeline sheet on the right) that adapts seamlessly to tablet and mobile viewports with a slide-over Inbox drawer and thumb-friendly bottom controls.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Cloud + Local Guest Persistence**
  - *Chosen Approach*: Real-time Firebase Firestore synchronization tied to Google Sign-In (`onSnapshot`), backed by a local storage mirror and automatic guest-to-cloud syncing when a user signs in.
  - *Why*: Ensures zero friction on first load while delivering true multi-device cloud persistence and strict per-user data isolation in Firestore.
- **Decision 2: Native Recurrence & Virtual Timeline Projection**
  - *Chosen Approach*: Store a task's recurrence rule (`none | daily | weekdays | weekly`) and per-date completion overrides so repeating habits (like *Rise and Shine* at 8:00 AM) appear on every applicable day without duplicating database documents unnecessarily.
  - *Why*: Keeps cloud storage lean and makes toggling a daily habit on Tuesday independent of Wednesday's completion status.
- **Decision 3: Server-Side Gemini AI Smart Scheduler**
  - *Chosen Approach*: Route all `+ AI` scheduling requests through an Express `/api/ai/schedule` endpoint using `@google/genai` (`gemini-3.8-flash`) with a strict JSON `responseSchema`.
  - *Why*: Keeps API keys strictly server-side while guaranteeing well-typed tasks (title, startTime, durationMinutes, categoryIcon, color, subtasks) that can be previewed and added to the timeline in one click.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Client Application (React 19)                       │
│                                                                            │
│  ┌──────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │  Top Header & Week   │    │       Cloud Sync & Auth Controller       │  │
│  │  Calendar Scroller   │    │  (Google Sign-In + Guest Sync Engine)    │  │
│  └──────────┬───────────┘    └────────────────────┬─────────────────────┘  │
│             │                                     │                        │
│  ┌──────────▼───────────┐    ┌────────────────────▼─────────────────────┐  │
│  │  Left Sidebar:       │    │  Main Sheet: Visual Day Timeline         │  │
│  │  Unscheduled Inbox   ├───►│  • Circular All-Day Habit Row            │  │
│  │  • Quick + Schedule  │    │  • Proportional Time Nodes & Checkboxes  │  │
│  │  • Search & Filter   │    │  • Free-Time Gap Calculators             │  │
│  └──────────────────────┘    │  • Active Task Focus Timer Bar           │  │
│                              └────────────────────┬─────────────────────┘  │
│                                                   │                        │
│  ┌────────────────────────────────────────────────▼─────────────────────┐  │
│  │                  Interactive Modals & Drawers                        │  │
│  │  • Task Editor Modal (Color Header, Time Wheel, Duration Pills)      │  │
│  │  • AI Smart Scheduler Modal      • Active Focus Timer Overlay        │  │
│  └──────────────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│   Firebase Cloud Services     │           │   Express Backend (server.ts) │
│  • Firebase Auth (Google)     │           │  • POST /api/ai/schedule      │
│  • Firestore (/tasks, /users) │           │  • @google/genai SDK          │
│  • Zero-Trust firestore.rules │           │    (gemini-3.8-flash JSON)    │
└───────────────────────────────┘           └───────────────────────────────┘
```

### Data Model & State

1. **PlannerTask Entity (`/tasks/{taskId}`)**:
   - `id`: Unique identifier (`string`)
   - `ownerId`: Authenticated user UID (`string`, immutable)
   - `title`: Task title (`string`, 1–120 chars)
   - `date`: Scheduled YYYY-MM-DD date string or `null` if in **Inbox**
   - `startTime`: 24-hour time string (`"08:00"`, `"18:00"`) or `null` if **Inbox** / **All-Day**
   - `isAllDay`: Boolean flag for top-row circular tasks (*Water Plants*, *Call Mum*)
   - `durationMinutes`: Integer duration (`1`, `15`, `30`, `45`, `60`, `90`, `120`)
   - `color`: Theme color key (`coral`, `sage`, `slate`, `amber`, `lavender`, `teal`)
   - `icon`: Category icon identifier (`book`, `alarm`, `yoga`, `bike`, `users`, `laundry`, `phone`, `run`, `plant`, `sparkles`, `coffee`, `code`, `briefcase`)
   - `recurrence`: `'none' | 'daily' | 'weekdays' | 'weekly'`
   - `completed`: Boolean completion status (plus `completedDates: string[]` for recurring tasks)
   - `subtasks`: Bounded array (max 20) of `{ id, title, completed }`
   - `notes`: Optional text notes (max 1000 chars)
   - `createdAt` / `updatedAt`: Server timestamps

### Interactive Component & State Mapping

- **Timeline Gap Detector**: Sorts all scheduled timed tasks for the active date chronologically, computes `endTime = startTime + durationMinutes`, and injects interactive *"X min of free time?"* slots whenever the gap between consecutive tasks is $\ge 15\text{ minutes}$. Clicking a free-time prompt opens the Task Editor pre-filled with that exact start time and gap duration.
- **Task Editor Modal (Photo 1 Fidelity)**:
  - Selecting a color (`coral`, `sage`, `slate`, etc.) immediately transitions the modal's top header background.
  - Clicking or scrolling the **Time** list updates `startTime` in 15-minute increments (`00:00` to `23:45`) and dynamically recalculates the displayed range (`18:00–18:45 (45 min)`).
  - Selecting a **Duration** pill (`1m`, `15m`, `30m`, `45m`, `1h`, `1.5h`) slides the coral highlight pill and updates the end time.
- **Real-Time Cloud Sync & Security**:
  - Upon plan approval, we will trigger the Firebase provisioning flow (`show_aistudio_ui` for `firebase_setup`), generate hardened `firestore.rules` enforcing strict `ownerId == request.auth.uid` read/write/list boundaries, and wire live `onSnapshot` listeners with automatic local-to-cloud task syncing.
