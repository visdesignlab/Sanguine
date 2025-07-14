import {
  Title, Stack,
  Card,
} from '@mantine/core';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { StatsGrid } from './StatsGrid';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export function PBMDashboard() {
  const ResponsiveGridLayout = WidthProvider(Responsive);

  const layouts = {
    lg: [
      {
        i: 'a', x: 0, y: 0, w: 2, h: 1,
      },
      {
        i: 'b', x: 0, y: 1, w: 1, h: 1,
      },
      {
        i: 'c', x: 1, y: 1, w: 1, h: 1,
      },
      {
        i: 'd', x: 0, y: 2, w: 2, h: 1,
      },
    ],
  };
  return (
    <Stack>
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
        <Card key="a" withBorder>
          <Title order={4}>Card A</Title>
        </Card>
        <div
          style={{ backgroundColor: '#f0f0f0' }}
          key="b"
        >
          b
        </div>
        <div
          style={{ backgroundColor: '#f0f0f0' }}
          key="c"
        >
          c
        </div>
        <div
          style={{ backgroundColor: '#f0f0f0' }}
          key="d"
        >
          d
        </div>
      </ResponsiveGridLayout>
    </Stack>
  );
}
