import { useState, useCallback } from 'react';
import { sendChatMessage } from '../../../Utils/llmChat';
import type { ApplicationStatePatch, RootStore } from '../../../Store/Store';

/**
 * A single message in the chat conversation.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LlmChatSession {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  sendMessage: (userMessage: string) => Promise<void>;
  clearMessages: () => void;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const extractJsonPayload = (content: string): string => {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
};

const parseApplicationStatePatch = (content: string): ApplicationStatePatch | null => {
  try {
    const parsed = JSON.parse(extractJsonPayload(content));
    return isPlainObject(parsed) ? (parsed as ApplicationStatePatch) : null;
  } catch {
    return null;
  }
};

const createMessageId = (): string => (
  globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

/**
 * Hook that owns the current-session chat state.
 *
 * Message history is kept in shell-level state so it survives
 * left-panel toggling and tab switches.
 */
export function useLlmChatSession(store: RootStore): LlmChatSession {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    const trimmed = userMessage.trim();
    if (!trimmed || isSending) return;

    // Optimistically add the user message.
    const userMsg: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setError(null);

    const assistantId = createMessageId();
    const assistantTimestamp = new Date();

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: assistantTimestamp,
        },
      ]);

      const response = await sendChatMessage(trimmed, {
        onChunk: (chunk) => {
          setMessages((prev) => prev.map((msg) => (
            msg.id === assistantId
              ? { ...msg, content: `${msg.content}${chunk}` }
              : msg
          )));
        },
      });

      const statePatch = parseApplicationStatePatch(response.message);
      if (statePatch) {
        store.applyApplicationStatePatch(statePatch);
      }
      setMessages((prev) => prev.map((msg) => (
        msg.id === assistantId
          ? {
            ...msg,
            content: statePatch ? JSON.stringify(statePatch, null, 2) : response.message,
          }
          : msg
      )));
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId || msg.content.length > 0));
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }, [isSending, store]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isSending,
    error,
    sendMessage,
    clearMessages,
  };
}
