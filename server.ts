import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUD_STORE_PATH = path.join(__dirname, '.cloud-planner-store.json');

interface CloudStoreData {
  tasks: unknown[];
  theme?: 'light' | 'dark';
  email?: string;
  updatedAt: string;
}

function readCloudStore(): CloudStoreData | null {
  try {
    if (fs.existsSync(CLOUD_STORE_PATH)) {
      const raw = fs.readFileSync(CLOUD_STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read cloud store:', e);
  }
  return null;
}

function writeCloudStore(data: CloudStoreData) {
  try {
    fs.writeFileSync(CLOUD_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write cloud store:', e);
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Instant Cloud Storage Sync API (works without browser popup blockers)
  app.get('/api/cloud/sync', (_req, res) => {
    const existing = readCloudStore();
    res.json({
      ok: true,
      data: existing,
    });
  });

  app.post('/api/cloud/sync', (req, res) => {
    const { tasks, theme, email } = req.body;
    const payload: CloudStoreData = {
      tasks: Array.isArray(tasks) ? tasks : [],
      theme: theme === 'dark' ? 'dark' : 'light',
      email: typeof email === 'string' ? email : '',
      updatedAt: new Date().toISOString(),
    };
    writeCloudStore(payload);
    res.json({
      ok: true,
      syncedAt: payload.updatedAt,
      count: payload.tasks.length,
    });
  });

  // Server-side Gemini API endpoint for AI Smart Day Scheduling
  app.post('/api/ai/schedule', async (req, res) => {
    try {
      const { prompt, activeDate, existingTasksSummary } = req.body;
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Please provide a schedule description.' });
        return;
      }

      const systemPrompt = `You are an intelligent visual day-planner assistant for the "Structured" day planner app.
Convert the user's natural language request (which may be in English, Hindi, or Hinglish) into a clean, realistic list of daily tasks.
Target date: ${activeDate || '2026-10-25'}.
Existing tasks on this date: ${existingTasksSummary || 'None'}.
Rules:
- Avoid overlapping times with existing tasks unless requested.
- Choose startTime in 24-hour "HH:MM" format (e.g., "08:00", "14:30", "18:00") in 15-minute increments, or "" if it is an unscheduled Inbox task or an All-Day habit.
- Choose durationMinutes from realistic values (15, 30, 45, 60, 90, 120).
- Choose color from: ["coral", "sage", "slate", "amber", "lavender", "teal"].
- Choose icon from: ["book", "alarm", "yoga", "bike", "users", "laundry", "phone", "run", "plant", "sparkles", "coffee", "code", "briefcase", "heart", "music", "utensils"].
- Choose recurrence from: ["none", "daily", "weekdays", "weekly"].
- Provide up to 3 concise subtasks if appropriate for the task.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt.trim(),
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A friendly 1-sentence summary of the generated schedule.',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Concise task title (max 80 chars).',
                    },
                    startTime: {
                      type: Type.STRING,
                      description: '24-hour HH:MM start time (e.g. "09:00") or "" if all-day/inbox.',
                    },
                    isAllDay: {
                      type: Type.BOOLEAN,
                      description: 'True if this is an all-day circular habit at the top of the day.',
                    },
                    isInbox: {
                      type: Type.BOOLEAN,
                      description: 'True if this task has no specific date/time and belongs in the Inbox.',
                    },
                    durationMinutes: {
                      type: Type.INTEGER,
                      description: 'Duration in minutes (15, 30, 45, 60, 90, 120).',
                    },
                    color: {
                      type: Type.STRING,
                      description: 'One of: coral, sage, slate, amber, lavender, teal.',
                    },
                    icon: {
                      type: Type.STRING,
                      description: 'One of: book, alarm, yoga, bike, users, laundry, phone, run, plant, sparkles, coffee, code, briefcase, heart, music, utensils.',
                    },
                    recurrence: {
                      type: Type.STRING,
                      description: 'One of: none, daily, weekdays, weekly.',
                    },
                    subtasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.STRING,
                      },
                      description: 'Optional list of short subtask step titles.',
                    },
                    notes: {
                      type: Type.STRING,
                      description: 'Optional short helpful note or tip.',
                    },
                  },
                  required: [
                    'title',
                    'startTime',
                    'isAllDay',
                    'isInbox',
                    'durationMinutes',
                    'color',
                    'icon',
                    'recurrence',
                    'subtasks',
                    'notes',
                  ],
                },
              },
            },
            required: ['summary', 'tasks'],
          },
        },
      });

      const text = response.text || '{"summary":"Schedule ready","tasks":[]}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error) {
      console.error('Gemini schedule error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate AI schedule.',
      });
    }
  });

  // Email Digest & Task Reminder Formatting Endpoint
  app.post('/api/email/prepare', async (req, res) => {
    try {
      const { toEmail, date, tasks, customMessage } = req.body;
      if (!toEmail || typeof toEmail !== 'string' || !toEmail.includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const subject = `Structured Day Plan for ${date || 'Today'}`;
      const lines: string[] = [
        `Hello! Here is your Structured Day Plan for ${date || 'Today'}:`,
        '',
      ];

      if (customMessage && customMessage.trim()) {
        lines.push(`Note: ${customMessage.trim()}`, '');
      }

      if (Array.isArray(tasks) && tasks.length > 0) {
        tasks.forEach(
          (t: {
            startTime?: string;
            title?: string;
            durationMinutes?: number;
            completed?: boolean;
          }) => {
            const status = t.completed ? '[✓]' : '[ ]';
            const timeLabel = t.startTime
              ? `${t.startTime} (${t.durationMinutes || 30}m)`
              : 'All-Day / Inbox';
            lines.push(`${status} ${timeLabel} — ${t.title || 'Task'}`);
          }
        );
      } else {
        lines.push('No tasks scheduled yet for this date.');
      }

      lines.push('', '— Sent from your Structured Visual Day Planner');

      const bodyText = lines.join('\n');
      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        toEmail.trim()
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      const mailtoUrl = `mailto:${encodeURIComponent(
        toEmail.trim()
      )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

      res.json({
        ok: true,
        subject,
        bodyText,
        gmailComposeUrl,
        mailtoUrl,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to prepare email.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
