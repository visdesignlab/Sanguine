import { useMemo } from 'react';
import {
  Title, Stack, Card,
} from '@mantine/core';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { StatsGrid } from './StatsGrid';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export function PBMDashboard() {
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);

  const layouts = {
    lg: [
      {
        i: '0', x: 0, y: 0, w: 2, h: 1,
      },
      {
        i: '1', x: 0, y: 1, w: 1, h: 1,
      },
      {
        i: '2', x: 1, y: 1, w: 1, h: 1,
      },
      {
        i: '3', x: 0, y: 2, w: 2, h: 1,
      },
    ],
  };
  return (
    <Stack mb="xl">
      <Title order={3}>Patient Blood Management Dashboard</Title>

      <StatsGrid />
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{
          lg: 852, sm: 0,
        }}
        cols={{
          lg: 2, sm: 1,
        }}
        rowHeight={300}
        containerPadding={[0, 0]}
      >
        {['0', '1', '2', '3'].map((i) => (
          <Card key={i} withBorder>
            <Title order={4}>Card {i}</Title>
          </Card>
        ))}
      </ResponsiveGridLayout>
    </Stack>
  );
}
