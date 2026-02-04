import {
  Modal,
  Stack,
  Image,
  Group,
  ActionIcon,
  Title,
  Text,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { formatTimestamp } from '../../Utils/dates';

/**
 * Zoomed-In State Images Modal (Large image preview viewer when state image is clicked)
 */
export function ZoomedStateModal({
  opened, onClose, state, onPrev, onNext, hasPrev, hasNext,
}: {
  opened: boolean;
  onClose: () => void;
  state: {
    id: string;
    name?: string;
    screenshot?: string;
    timestamp: number;
  } | undefined;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  if (!state) return null;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90%"
      centered
      zIndex={2000}
      withCloseButton
      styles={{
        body: {
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, backgroundColor: 'transparent', position: 'relative',
        },
        content: { backgroundColor: 'transparent', boxShadow: 'none' },
        header: {
          backgroundColor: 'transparent', color: 'white', position: 'absolute', top: 0, right: 0, zIndex: 2001,
        },
      }}
    >
      <Stack
        align="center"
        justify="center"
        gap="xl"
        style={{ width: '100%', height: '100%', padding: '40px 0' }}
      >
        {/** Zoomed State Image Preview */}
        <Image
          src={state.screenshot}
          alt={`Screenshot of state: ${state.name} created on ${formatTimestamp(state.timestamp)}`}
          fit="contain"
          style={{
            maxHeight: '75vh', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', borderRadius: 8,
          }}
        />
        <Group gap="xl" align="center">
          {/** Previous Image Button */}
          <ActionIcon
            variant="filled"
            color="dark"
            size="xl"
            radius="xl"
            disabled={!hasPrev}
            style={{ opacity: hasPrev ? 1 : 0, cursor: hasPrev ? 'pointer' : 'default' }}
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <IconChevronLeft size={24} />
          </ActionIcon>
          {/** State Name and Timestamp */}
          <Stack gap={0} align="center">
            <Title order={3} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {state.name}
            </Title>
            <Text c="dimmed" size="sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {formatTimestamp(state.timestamp)}
            </Text>
          </Stack>
          {/** Next Image Button */}
          <ActionIcon
            variant="filled"
            color="dark"
            size="xl"
            radius="xl"
            disabled={!hasNext}
            style={{ opacity: hasNext ? 1 : 0, cursor: hasNext ? 'pointer' : 'default' }}
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <IconChevronRight size={24} />
          </ActionIcon>
        </Group>
      </Stack>
    </Modal>
  );
}
