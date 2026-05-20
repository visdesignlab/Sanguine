import { useCallback, useEffect, useRef } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Flex,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconRobot,
  IconX,
} from '@tabler/icons-react';
import { useLlmChatSession } from './useLlmChatSession';
import classes from './LlmChatPanel.module.css';

/**
 * LlmChatPanel — the chat UI for the LLM-powered assistant.
 *
 * Displays a scrollable message history, a text input, send button,
 * loading indicator, and error display.  Assistant replies are rendered
 * as pre-wrapped text so JSON / code-style output remains readable.
 *
 * Session state (messages, isSending, error) is owned by the
 * `useLlmChatSession` hook which lives at the Shell level so that
 * history survives left-panel toggling and tab switches.
 */
export function LlmChatPanel() {
  const {
    messages,
    isSending,
    error,
    sendMessage,
    clearMessages,
  } = useLlmChatSession();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    // Read current input value from the ref.
    const val = inputRef.current?.value ?? '';
    const trimmed = val.trim();
    if (!trimmed || isSending) return;

    // Clear input before sending.
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    sendMessage(trimmed);
  }, [isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <Stack
      h="100%"
      style={{ minHeight: 0 }}
      gap={0}
    >
      {/* Header */}
      <Flex
        direction="row"
        justify="space-between"
        align="center"
        mb="xs"
      >
        <Text
          fw={700}
          size="xs"
          tt="uppercase"
          c="blue.7"
        >
          LLM Chat
        </Text>
        <ActionIcon
          aria-label="Clear chat"
          onClick={clearMessages}
          size="xs"
          variant="subtle"
          color="gray"
        >
          <IconX size={14} />
        </ActionIcon>
      </Flex>

      {/* Message history */}
      <ScrollArea
        ref={scrollRef}
        className={classes.messageArea}
        offsetScrollbars
      >
        {messages.length === 0 && !isSending && (
          <div className={classes.emptyState}>
            <Text size="sm" c="dimmed">
              Ask a question to generate a filter configuration.
            </Text>
          </div>
        )}

        {messages.map((msg, i) => (
          <Box
            key={`${i}-${msg.timestamp.getTime()}`}
            className={`${classes.messageRow} ${
              msg.role === 'user'
                ? classes.messageRowUser
                : classes.messageRowAssistant
            }`}
          >
            <Text
              className={`${classes.messageLabel} ${
                msg.role === 'user'
                  ? classes.messageLabelUser
                  : classes.messageLabelAssistant
              }`}
            >
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </Text>
            {msg.role === 'assistant' ? (
              <Text
                size="sm"
                ff="monospace"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {msg.content}
              </Text>
            ) : (
              <Text size="sm">{msg.content}</Text>
            )}
          </Box>
        ))}

        {/* Loading indicator */}
        {isSending && (
          <div className={classes.loadingRow}>
            <ThemeIcon variant="light" size="sm">
              <IconRobot size={14} />
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              Thinking…
            </Text>
          </div>
        )}
      </ScrollArea>

      {/* Error display */}
      {error && (
        <Alert
          color="red"
          variant="light"
          mb="xs"
          withCloseButton={false}
          style={{ fontSize: 12 }}
        >
          {error}
        </Alert>
      )}

      {/* Input area */}
      <div className={classes.inputArea}>
        <Flex direction="row" gap="xs" align="flex-end">
          <Textarea
            ref={inputRef}
            placeholder="Ask a question…"
            size="xs"
            autosize
            minRows={1}
            maxRows={4}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
            disabled={isSending}
          />
          <ActionIcon
            aria-label="Send message"
            onClick={handleSend}
            disabled={isSending}
            size="sm"
            variant="filled"
            color="blue"
          >
            <IconPlayerPlay size={14} />
          </ActionIcon>
        </Flex>
        <Text size="xs" c="dimmed" mt={4} pl={4}>
          Press Enter to send · Shift+Enter for new line
        </Text>
      </div>
    </Stack>
  );
}
