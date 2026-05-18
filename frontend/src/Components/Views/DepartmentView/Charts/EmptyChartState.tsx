import { Flex, Box, Text } from '@mantine/core';

interface EmptyChartStateProps {
  hasFilters: boolean;
  absolute?: boolean;
}

/**
 * Shared component for displaying a "No data available" message when a chart
 * has no records to display.
 */
export function EmptyChartState({ hasFilters, absolute = true }: EmptyChartStateProps) {
  const message = hasFilters
    ? 'No data available for this chart after filtering'
    : 'No data available for this chart';

  const containerStyle = absolute ? {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 10,
  } : {
    height: '100%',
  };

  return (
    <Flex
      style={containerStyle}
      align="center"
      justify="center"
    >
      <Box
        px="lg"
        py="md"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: 6,
        }}
      >
        <Text c="dimmed" fs="italic" size="sm">
          {message}
        </Text>
      </Box>
    </Flex>
  );
}
