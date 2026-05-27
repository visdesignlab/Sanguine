import {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Flex,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconArrowUp, IconTrash, IconX } from '@tabler/icons-react';
import type { LlmChatSession } from './useLlmChatSession';
import classes from './LlmChatPanel.module.css';

/**
 * LlmChatPanel — the chat UI for the LLM-powered assistant.
 *
 * Displays a scrollable message history, a text input, send button,
 * loading indicator, and error display. Assistant replies are rendered
 * as pre-wrapped text so JSON / code-style output remains readable.
 *
 * Session state (messages, isSending, error) is owned by the
 * `useLlmChatSession` hook which lives at the Shell level so that
 * history survives left-panel toggling and tab switches.
 */
export interface LlmChatPanelProps extends LlmChatSession {
  onCloseSidebar: () => void;
}

export function LlmChatPanel({
  messages,
  isSending,
  error,
  sendMessage,
  clearMessages,
  onCloseSidebar,
}: LlmChatPanelProps) {
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
        if (isSending) return;
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isSending],
  );

  return (
    <Stack
      h="100%"
      style={{
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
      }}
      gap={0}
    >
      {/* Header */}
      <Flex
        direction="row"
        justify="space-between"
        align="center"
        mb="xs"
        w="100%"
      >
        <Text
          fw={700}
          size="xs"
          tt="uppercase"
          c="blue.7"
        >
          LLM Chat
        </Text>
        <Flex gap={4}>
          <Tooltip label="Clear chat" position="bottom">
            <ActionIcon
              aria-label="Clear chat"
              onClick={clearMessages}
              size="sm"
              variant="subtle"
              color="gray"
              disabled={isSending}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Close sidebar" position="bottom">
            <ActionIcon
              aria-label="Close sidebar"
              onClick={onCloseSidebar}
              size="sm"
              variant="subtle"
              color="gray"
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>

      {/* Message history */}
      <ScrollArea
        ref={scrollRef}
        className={classes.messageArea}
        style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
        offsetScrollbars
      >
        {messages.length === 0 && !isSending && (
          <div className={classes.emptyState}>
            <Text size="sm" c="dimmed">
              Ask a question to generate a filter configuration.
            </Text>
          </div>
        )}

        {messages.map((msg) => (
          <Box
            key={msg.id}
            className={`${classes.messageRow} ${msg.role === 'user'
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
              msg.content.length === 0 && isSending ? (
                <Text size="sm" c="dimmed">
                  Thinking…
                </Text>
              ) : (
                <Box
                  component="pre"
                  className={classes.messageCodeBlock}
                >
                  {msg.content}
                </Box>
              )
            ) : (
              <Text
                size="sm"
              >
                {msg.content}
              </Text>
            )}
          </Box>
        ))}

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
        <Textarea
          ref={inputRef}
          placeholder="Ask a question…"
          size="sm"
          autosize
          minRows={2}
          maxRows={4}
          onKeyDown={handleKeyDown}
          rightSection={(
            <Tooltip label="Send message" position="top">
              <ActionIcon
                aria-label="Send message"
                onClick={handleSend}
                disabled={isSending}
                size="sm"
                variant="filled"
                color="blue"
              >
                <IconArrowUp size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          rightSectionPointerEvents="all"
          rightSectionWidth={40}
        />
        <Text size="xs" c="dimmed" mt={4} pl={4}>
          Press Enter to send · Shift+Enter for new line ·
        </Text>
      </div>
    </Stack>
  );
}
