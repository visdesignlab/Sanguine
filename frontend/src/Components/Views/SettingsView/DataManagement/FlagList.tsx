import {
  Badge, Box, Group, NavLink, Stack, Text,
} from '@mantine/core';
import { IconCheck, IconFlag } from '@tabler/icons-react';
import {
  FLAG_CATEGORY_META, FLAGS, resolveLabel, type FlagCategory,
} from './flagDefinitions';

interface FlagListProps {
  selectedFlagKey: string | null;
  flagCounts: Record<string, number>;
  totalExcluded: number;
  flagThresholds: Record<string, Record<string, number>>;
  onSelectFlag: (key: string) => void;
}

const CATEGORY_ORDER: FlagCategory[] = ['data_quality', 'clinical', 'opportunity'];

export function FlagList({
  selectedFlagKey,
  flagCounts,
  totalExcluded,
  flagThresholds,
  onSelectFlag,
}: FlagListProps) {
  return (
    <Stack gap={0} h="100%" style={{ overflowY: 'auto' }}>
      {CATEGORY_ORDER.map((category) => {
        const meta = FLAG_CATEGORY_META[category];
        const flagsInCategory = FLAGS.filter((f) => f.category === category);

        const withIssues = flagsInCategory.filter((f) => {
          const loaded = f.key in flagCounts;
          return !loaded || flagCounts[f.key] > 0;
        });
        const noIssues = flagsInCategory.filter((f) => {
          const loaded = f.key in flagCounts;
          return loaded && flagCounts[f.key] === 0;
        });
        const ordered = [...withIssues, ...noIssues];

        return (
          <Box key={category} mb="sm">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px="sm" pt="sm" pb={4}>
              {meta.label}
            </Text>
            {ordered.map((flag) => {
              const count = flagCounts[flag.key];
              const loaded = flag.key in flagCounts;
              const isEmpty = loaded && count === 0;
              const isActive = selectedFlagKey === flag.key;

              let rightSection: React.ReactNode = null;
              if (isEmpty) {
                rightSection = (
                  <Badge
                    size="sm"
                    variant="light"
                    color="green"
                    style={{ cursor: 'default' }}
                    leftSection={<IconCheck size={10} />}
                  >
                    Clean
                  </Badge>
                );
              } else if (loaded) {
                rightSection = (
                  <Badge
                    size="sm"
                    variant={isActive ? 'filled' : 'light'}
                    color="red"
                    leftSection={<IconFlag size={10} />}
                  >
                    {count}
                  </Badge>
                );
              }

              return (
                <NavLink
                  key={flag.key}
                  label={resolveLabel(flag, flagThresholds)}
                  active={isActive}
                  onClick={() => onSelectFlag(flag.key)}
                  rightSection={rightSection}
                  styles={{
                    label: {
                      fontSize: 13,
                      lineHeight: 1.3,
                      color: isEmpty ? 'var(--mantine-color-dimmed)' : undefined,
                    },
                    root: { borderRadius: 6 },
                    rightSection: { flexShrink: 0 },
                  }}
                />
              );
            })}
          </Box>
        );
      })}

      <Box
        mt="auto"
        px="sm"
        py="xs"
        style={(theme) => ({
          borderTop: `1px solid ${theme.colors.gray[2]}`,
        })}
      >
        <Group justify="space-between">
          <Text size="xs" c="dimmed">Total excluded</Text>
          <Text size="xs" fw={600}>{totalExcluded}</Text>
        </Group>
      </Box>
    </Stack>
  );
}
