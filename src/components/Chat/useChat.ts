import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatService } from '../../services/chat';

let nextId = 0;
const makeId = () => `m${++nextId}`;

/** Conversation state for a ChatService. UI-agnostic. */
export function useChat(service: ChatService, greeting: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: 'assistant', content: greeting },
  ]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const abort = useRef<AbortController | null>(null);

  const request = useCallback(
    async (conversation: ChatMessage[]) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setStatus('loading');
      try {
        const reply = await service.reply(conversation, controller.signal);
        setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', ...reply }]);
        setStatus('idle');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error');
      }
    },
    [service],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || status === 'loading') return;
      const conversation = [...messages, { id: makeId(), role: 'user' as const, content }];
      setMessages(conversation);
      void request(conversation);
    },
    [messages, request, status],
  );

  const retry = useCallback(() => void request(messages), [messages, request]);

  useEffect(() => () => abort.current?.abort(), []);

  return { messages, status, send, retry };
}
