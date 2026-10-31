/**
 * Chat service for the AI Twin.
 *
 * Set VITE_CHAT_API_URL (e.g. http://localhost:8000) to use the FastAPI RAG
 * backend; without it the site uses a local mock that only knows what is
 * in src/data and src/config. See docs/CHAT_API.md for the contract.
 */
import { projects } from '../data/projects';
import { site } from '../config/site';

export interface ChatSource {
  title: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export interface ChatReply {
  content: string;
  sources?: ChatSource[];
}

export interface ChatService {
  readonly mode: 'mock' | 'remote';
  /** `messages` is the full conversation; the last item is the new user message. */
  reply(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatReply>;
}

export function createRemoteChatService(baseUrl: string): ChatService {
  return {
    mode: 'remote',
    async reply(messages, signal) {
      const last = messages[messages.length - 1];
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          message: last.content,
          history: messages.slice(0, -1).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error(`Chat API responded ${res.status}`);
      const data = (await res.json()) as { answer?: string; sources?: ChatSource[] };
      if (typeof data.answer !== 'string') throw new Error('Chat API returned no answer');
      return { content: data.answer, sources: data.sources };
    },
  };
}

// --- Mock ------------------------------------------------------------------

const list = (items: string[]) => items.map((i) => `• ${i}`).join('\n');

const stack = [...new Set(projects.flatMap((p) => p.stack))];

type Rule = { test: RegExp; answer: () => string };

/** Checked before project-name matching (so "machine learning" isn't read as a project). */
const priorityRules: Rule[] = [
  {
    test: /intern/i,
    answer: () =>
      "My internship details aren't in my knowledge base yet, so I'd rather not make something up. Once the real AI Twin is connected, I'll answer this from my own notes.",
  },
  {
    test: /why|interest|motivat|passion/i,
    answer: () =>
      `Short version: "${site.tagline}" I like ML most when it ends up in something people actually use. The longer answer will come from my knowledge base once the real AI Twin is connected.`,
  },
];

const generalRules: Rule[] = [
  {
    test: /stack|tech|tool|language|framework/i,
    answer: () =>
      `Across the projects on this site:\n${list(stack)}\n\nThe AML Platform is the fullest example: React + TypeScript on the front, FastAPI and Supabase behind it, YOLO and SAM for vision.`,
  },
  {
    test: /project|built|build|work|ai\/ml|portfolio/i,
    answer: () =>
      `Here's what's on the site right now:\n${projects
        .map((p) => `• ${p.title}: ${p.summary}`)
        .join('\n')}\n\nAsk about any of them by name.`,
  },
  {
    test: /resume|cv/i,
    answer: () =>
      site.resumeUrl
        ? `You can grab my resume here: ${site.resumeUrl}`
        : "The resume PDF isn't uploaded yet. It's on my list, right after fixing the bugs from my first few years.",
  },
  {
    test: /contact|email|reach|github|linkedin|hire/i,
    answer: () => {
      const links = Object.entries(site.contact).filter(([, v]) => v);
      return links.length
        ? `Best places to reach me:\n${list(links.map(([k, v]) => `${k}: ${v}`))}`
        : 'Contact links are coming soon.';
    },
  },
  {
    test: /^(hi|hey|hello|yo|sup)\b/i,
    answer: () => 'Hey! Ask me about my projects, my stack, or what I am building next.',
  },
];

function projectAnswer(text: string): string | undefined {
  const lowered = text.toLowerCase();
  const match = projects.find(
    (p) => lowered.includes(p.title.toLowerCase()) || p.title.toLowerCase().split(' ').some((w) => w.length > 3 && lowered.includes(w)),
  );
  if (!match) return undefined;
  return `${match.title}: ${match.summary}\n\nFocus areas:\n${list(match.highlights)}`;
}

export function createMockChatService(): ChatService {
  return {
    mode: 'mock',
    reply(messages, signal) {
      const text = messages[messages.length - 1]?.content ?? '';
      const match = (rules: Rule[]) => rules.find((r) => r.test.test(text))?.answer();
      const content =
        match(priorityRules) ??
        projectAnswer(text) ??
        match(generalRules) ??
        "I'm in demo mode right now, so I can only answer from what's on this page: my projects, my stack, and how to reach me. The full AI Twin, with retrieval over my actual notes, is coming.";

      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => resolve({ content }), 650 + Math.random() * 600);
        signal?.addEventListener('abort', () => {
          window.clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    },
  };
}

const apiUrl = import.meta.env.VITE_CHAT_API_URL;

export const chatService: ChatService = apiUrl ? createRemoteChatService(apiUrl) : createMockChatService();
