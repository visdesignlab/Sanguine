import { Flex, Box, Text } from '@mantine/core';

export function EmptyChartState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Flex style={{ position: 'absolute', inset: 0, zIndex: 10 }} align="center" justify="center">
      <Box px="lg" py="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 6 }}>
        <Text c="dimmed" fs="italic" size="sm">
          {hasFilters ? 'No data available for this chart after filtering' : 'No data available for this chart'}
        </Text>
      </Box>
    </Flex>
  );
}
