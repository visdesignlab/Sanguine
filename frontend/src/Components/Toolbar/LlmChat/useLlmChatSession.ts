import { useState, useCallback } from 'react';
import { sendChatMessage } from '../../../Utils/llmChat';

/**
 * A single message in the chat conversation.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Hook that owns the current-session chat state.
 *
 * Message history is kept in shell-level state so it survives
 * left-panel toggling and tab switches.
 */
export function useLlmChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    const trimmed = userMessage.trim();
    if (!trimmed || isSending) return;

    // Optimistically add the user message.
    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(trimmed);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

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
