import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { useContext, useState, useRef } from 'react';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import {
  IconCalendarWeek, IconDownload, IconPlus, IconSearch, IconShare,
  IconShare2,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import * as htmlToImage from 'html-to-image';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  // keep export menu open while native share sheet is active (same pattern as Shell)
  const [exportMenuOpened, setExportMenuOpened] = useState(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const prevExportMenuOpen = useRef(false);
  const screenshotRef = useRef<HTMLDivElement | null>(null);

  // Filename helper
  const buildScreenshotFilename = (tab = 'providers') => {
    const ts = new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');
    return `intelvia-${tab}-view-${ts}.png`;
  };

  // Shared filter to exclude unwanted elements from screenshot
  const screenshotFilter = (node: Node) => {
    try {
      if (!(node instanceof Element)) return true;
      if (node.closest('[data-screenshot-hidden]')) return false;
      return true;
    } catch {
      return true;
    }
  };

  // Create a PNG data URL with border
  const screenshotProviderView = async () => {
    const targetEl = screenshotRef.current ?? document.documentElement;
    // Use the full scroll size of the target element
    const width = targetEl instanceof Element ? (targetEl as Element).scrollWidth : document.documentElement.scrollWidth;
    const height = targetEl instanceof Element ? (targetEl as Element).scrollHeight : document.documentElement.scrollHeight;

    // Render the element to a PNG first
    const pixelRatio = 2;
    const dataUrl = await htmlToImage.toPng(targetEl as HTMLElement, {
      backgroundColor: '#ffffff',
      pixelRatio,
      filter: screenshotFilter,
      width,
      height,
    });

    // Add a white padding border to the generated PNG only
    const paddingCssPx = 16;
    const pad = Math.round(paddingCssPx * pixelRatio);

    // Load the generated image and draw it onto a larger canvas with white background padding.
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width + pad * 2;
    canvas.height = img.height + pad * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad);

    return canvas.toDataURL('image/png');
  };

  // Download helper
  const downloadScreenshot = (dataUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || buildScreenshotFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share screenshot menu
  const shareScreenshot = async (dataUrl: string, filename?: string) => {
    try {
      const res = await fetch(dataUrl);
      if (!res.ok) throw new Error('Failed to fetch data URL');
      const blob = await res.blob();
      const file = new File([blob], filename || buildScreenshotFilename(), { type: blob.type || 'image/png' });
      const nav = navigator as Navigator;
      if (nav.share) {
        await nav.share({
          files: [file],
          text: 'Screenshot from Intelvia - Patient Blood Management Analytics\n\n',
        });
      } else {
        console.warn('Web Share API not available or cannot share files. No direct email attachment fallback available.');
      }
    } catch (err) {
      console.warn('shareScreenshot failed or unsupported', err);
    }
  };

  // Download the view
  const handleDownloadView = async () => {
    try {
      const dataUrl = await screenshotProviderView();
      downloadScreenshot(dataUrl, buildScreenshotFilename('providers'));
    } catch (err) {
      console.error('ProvidersView: Download View failed', err);
    } finally {
      // close export menu after download
      setExportMenuOpened(false);
    }
  };

  // Share the view
  const handleShareView = async () => {
    try {
      // preserve current menu open state and keep menu open while native share sheet is active
      prevExportMenuOpen.current = exportMenuOpened;
      setSharingInProgress(true);
      setExportMenuOpened(true);

      const dataUrl = await screenshotProviderView();
      await shareScreenshot(dataUrl, buildScreenshotFilename('providers'));
    } catch (err) {
      console.error('ProvidersView: Share View failed', err);
    } finally {
      setSharingInProgress(false);
      // restore previous menu open state
      setExportMenuOpened(prevExportMenuOpen.current);
    }
  };

  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);

  const dateRangePresets = [
    {
      value: [
        dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Past Quarter',
    },
    {
      value: [
        dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Last 3 Months',
    },
    {
      value: [
        dayjs().subtract(6, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Last 6 Months',
    },
    {
      value: [
        dayjs().startOf('year').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'This Calendar Year',
    },
    {
      value: [
        '2000-01-01',
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'All Time',
    },
  ];

  // TEMPORARY MOCK DATA ------------
  // TODO: Replace with real chart configs from a provider store
  type ChartOrientation = 'vertical' | 'horizontal';
  type ProviderChart = {
    title: string;
    data: { group: string; Adherence: number }[];
    dataKey: string;
    orientation: ChartOrientation;
  };
  const allCharts: Record<string, ProviderChart> = {
    anemia1: {
      title: 'Anemia Management',
      data: [
        { group: 'Group1', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'Adherence',
      orientation: 'horizontal',
    },
    anemia2: {
      title: 'Anemia Management',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    anemia3: {
      title: 'Anemia Management',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    outcome1: {
      title: 'Outcomes',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    outcome2: {
      title: 'Outcomes',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
  };

  const {
    cardIconStroke,
    buttonIconSize,
    toolbarWidth,
    iconStroke,
  } = useThemeConstants();

  return (
    <Stack mb="xl" gap="lg">
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        {/* Dashboard Title */}
        <Title order={3}>Providers</Title>
        <Flex direction="row" align="center" gap="md" ml="auto">
          {/** Visits Count */}
          <Tooltip label="Visible visits after filters" position="bottom">
            <Title order={5} c="dimmed">
              {`${store.filteredVisitsLength} / ${store.allVisitsLength}`}
              {' '}
              Visits
            </Title>
          </Tooltip>
          {/* Export menu: vertical ellipsis with tooltip */}
          <Tooltip label="Export View" position="bottom">
            <Menu
              withinPortal
              shadow="md"
              trigger="hover"
              closeOnItemClick={false}
              opened={exportMenuOpened}
              onOpen={() => setExportMenuOpened(true)}
              onClose={() => {
                // prevent closing the menu when a native share sheet is in progress
                if (sharingInProgress) return;
                setExportMenuOpened(false);
              }}
            >
              <Menu.Target>
                <ActionIcon size="lg" aria-label="Export View">
                  <IconShare2
                    stroke={iconStroke}
                  />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconDownload size={16} />} onClick={handleDownloadView}>
                  Download View
                </Menu.Item>
                <Menu.Item leftSection={<IconShare size={16} />} onClick={handleShareView}>
                  Share View
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Tooltip>
          {/** Select Provider */}
          <Select
            placeholder="Search for a provider"
            defaultValue="Dr. John Doe"
            leftSection={<IconSearch size={18} stroke={1} />}
            searchable
            data={[
              'Dr. John Doe',
              'Dr. Jane Smith',
              'Dr. Emily Carter',
              'Dr. Michael Brown',
            ]}
            w="fit-content"
            style={{ minWidth: 180 }}
          />
          {/** Date Range Picker */}
          <DatePickerInput
            type="range"
            defaultValue={[
              dayjs().subtract(6, 'month').startOf('day').toDate(),
              dayjs().toDate(),
            ]}
            defaultLevel="month"
            leftSection={<IconCalendarWeek size={18} stroke={1} />}
            placeholder="Pick dates range"
            presets={dateRangePresets}
            value={dateRange}
            onChange={setDateRange}
          />
          <Button>
            <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
            Add Chart
          </Button>
        </Flex>
      </Flex>
      <Divider />
      {/* Screenshot target: everything from Provider Summary down will be captured */}
      <div ref={screenshotRef} data-screenshot-target>
        {/* Provider Summary Card */}
        <Card shadow="sm" radius="md" p="xl" mb="md" withBorder>
          <Stack gap="xs">
            <Title order={3}>Provider Summary - Dr. John Doe</Title>
            <Title order={4} mt="xs">
              In the past
              {' '}
              <Text component="span" td="underline">3 Months</Text>
              , Dr. John Doe has recorded:
            </Title>
            <Stack gap={2} mt="xs">
              <Text size="md">
                •
                {' '}
                <Text component="span" td="underline">28</Text>
                {' '}
                Cardiac Surgeries
              </Text>
              <Text size="md">
                • Used
                {' '}
                <Text component="span" td="underline">187</Text>
                {' '}
                Units of Blood Products
              </Text>
              <Text size="md">
                • Average Complexity of cases
                {' '}
                <Text component="span" td="underline">higher</Text>
                {' '}
                than average
              </Text>
              <Text size="md">
                •
                {' '}
                <Text component="span" td="underline">13%</Text>
                {' '}
                of transfused patients had post operative hemoglobin above the recommended threshold
              </Text>
            </Stack>
          </Stack>
        </Card>
        <Title order={3} mt="xl" mb="lg">Anemia Management</Title>
        <Flex gap="sm">
          {Object.entries(allCharts)
            .filter(([_, chart]) => chart.title === 'Anemia Management')
            .map(([chartId, chart]) => (
              <Card key={chartId} h={200} w={300} p="md" shadow="sm">
                <BarChart
                  h={200}
                  p="sm"
                  w="100%"
                  data={chart.data}
                  dataKey={chart.dataKey}
                  orientation={chart.orientation}
                  yAxisProps={chart.orientation === 'vertical' ? { width: 80 } : undefined}
                  barProps={{ radius: 10 }}
                  series={[{ name: 'Adherence', color: 'blue.6' }]}
                />
              </Card>
            ))}
        </Flex>
        <Title order={3} mt="xl" mb="lg">Outcomes</Title>
        <Flex gap="sm">
          {Object.entries(allCharts)
            .filter(([_, chart]) => chart.title === 'Outcomes')
            .map(([chartId, chart]) => (
              <Card key={chartId} h={200} w={300} p="md" shadow="sm">
                <BarChart
                  h={200}
                  p="sm"
                  w="100%"
                  data={chart.data}
                  dataKey={chart.dataKey}
                  orientation={chart.orientation}
                  yAxisProps={chart.orientation === 'vertical' ? { width: 80 } : undefined}
                  barProps={{ radius: 10 }}
                  series={[{ name: 'Adherence', color: 'blue.6' }]}
                />
              </Card>
            ))}
        </Flex>
      </div>
    </Stack>
  );
}
