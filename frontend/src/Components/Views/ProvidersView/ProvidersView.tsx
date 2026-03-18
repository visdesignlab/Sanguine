import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
  Modal,
  CloseButton,
  Tabs,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { DatePickerInput, DatePickerPreset } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarWeek, IconPlus, IconSearch,
  IconDownload, IconShare,
  IconShare2,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useObserver } from 'mobx-react-lite';
import {
  useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import clsx from 'clsx';
import { BarChart, LineChart } from '@mantine/charts';
import { ReferenceLine } from 'recharts';
import * as htmlToImage from 'html-to-image';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  AGGREGATION_OPTIONS, providerXAxisOptions, TIME_AGGREGATION_OPTIONS, providerChartGroups, ProviderChartConfig,
} from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import { ProviderChartTooltip } from './ProviderChartTooltip';
import classes from '../GridLayoutItem.module.css';

export function ProvidersView() {
  const store = useContext(Store);
  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));
  const [hoveredRecommendedLine, setHoveredRecommendedLine] = useState<string | null>(null);

  const {
    buttonIconSize, cardIconStroke, toolbarWidth,
    iconStroke,
  } = useThemeConstants();

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
      if (node.tagName === 'NOSCRIPT') return false;
      if (node.closest && node.closest('[data-screenshot-hidden]')) return false;
      return true;
    } catch {
      return true;
    }
  };

  // Create a PNG data URL with border
  const createFullPagePng = async () => {
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
      const canShareFiles = typeof (nav).canShare === 'function' ? (nav).canShare({ files: [file] }) : true;

      if (nav.share && canShareFiles) {
        await nav.share({
          files: [file],
          text: 'Screenshot from Intelvia - Patient Blood Management Analytics\n\n',
        });
      } else {
        // Fallback: attempt to open mailto link (attachments not supported via mailto)
        // Provide user guidance in console; UI fallback can be implemented later.
        console.warn('Web Share API not available or cannot share files. No direct email attachment fallback available.');
      }
    } catch (err) {
      console.warn('shareScreenshot failed or unsupported', err);
    }
  };

  // Download the view
  const handleDownloadView = async () => {
    try {
      const dataUrl = await createFullPagePng();
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

      const dataUrl = await createFullPagePng();
      await shareScreenshot(dataUrl, buildScreenshotFilename('providers'));
    } catch (err) {
      console.error('ProvidersView: Share View failed', err);
    } finally {
      setSharingInProgress(false);
      // restore previous menu open state
      setExportMenuOpened(prevExportMenuOpen.current);
    }
  };

  // --- Add Chart Modal ----
  const [selectedAggregation, setSelectedAggregation] = useState<string>('sum');
  const [selectedChartType, setSelectedChartType] = useState<string>('population-histogram');
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [selectedTimeGrouping, setSelectedTimeGrouping] = useState<string>('month');
  const [isAddChartModalOpen, { open, close }] = useDisclosure(false);

  const openAddChartModal = useCallback(() => {
    setSelectedAggregation('avg');
    setSelectedVar('');
    setSelectedChartType('population-histogram');
    setSelectedTimeGrouping('month');
    open();
  }, [open]);

  // --- Handle Charts ---

  const handleRemoveChart = useCallback((chartId: string) => {
    store.providersStore.removeChart(chartId);
  }, [store.providersStore]);

  const addChart = useCallback(() => {
    const isHistogram = selectedChartType === 'population-histogram';

    const xAxisVar = isHistogram
      ? (selectedVar as ProviderChartConfig['xAxisVar'])
      : (selectedTimeGrouping as ProviderChartConfig['xAxisVar']);

    const yAxisVar = isHistogram
      ? ('attending_provider' as ProviderChartConfig['yAxisVar'])
      : (selectedVar as ProviderChartConfig['yAxisVar']);

    store.providersStore.addChart({
      chartId: `chart-${Date.now()}`,
      xAxisVar,
      yAxisVar,
      aggregation: selectedAggregation as ProviderChartConfig['aggregation'],
      chartType: selectedChartType as ProviderChartConfig['chartType'],
      group: 'Anemia Management',
    });

    close();
  }, [selectedAggregation, selectedVar, selectedChartType, close, store.providersStore, selectedTimeGrouping]);

  // TODO: Handle Chart Hover
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);

  // --- Date Range Picker ---

  const DATE_FORMAT = 'YYYY-MM-DD';
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([dayjs('2020-01-01').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)]);

  const datePresets: DatePickerPreset<'range'>[] = [
    { label: 'Past month', value: [dayjs().startOf('month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
    { label: 'This quarter', value: [dayjs().subtract(dayjs().month() % 3, 'month').startOf('month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
    { label: 'Past 3 months', value: [dayjs().subtract(3, 'month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
    { label: 'Past 6 months', value: [dayjs().subtract(6, 'month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
    { label: 'Past year', value: [dayjs().subtract(1, 'year').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
    { label: 'All time', value: [dayjs('2020-01-01').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  ];

  // Keep providersStore in sync when user changes date range.
  const onDateRangeChange = useCallback((val: [string | null, string | null]) => {
    setDateRange(val);
    if (store.providersStore) {
      const s = val?.[0] ?? null;
      const e = val?.[1] ?? null;
      store.providersStore.setDateRange(s, e);
    }
  }, [store.providersStore]);

  useEffect(() => {
    // If we have a duckDB instance, ensure providersStore uses its current dateRange (or default)
    if (store.duckDB && store.providersStore) {
      (async () => {
        // populate earliestDate once DB is ready
        await store.providersStore.findEarliestDate().catch((e) => {
          console.error('Error finding earliest provider date:', e);
        });
        const s = store.providersStore.dateStart ?? null;
        const e = store.providersStore.dateEnd ?? null;
        store.providersStore.setDateRange(s, e);
      })();
    }
  }, [store.duckDB, store.providersStore]);

  // --- Render ---
  return useObserver(() => {
    const selectedProviderName = store.providersStore?.selectedProvider ?? 'No Provider Selected';

    return (
      <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
          <Title order={3}>Providers</Title>
          <Flex direction="row" align="center" gap="md" ml="auto">
            {/* Visit Count */}
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
            {/* Date Range Picker */}
            <DatePickerInput
              type="range"
              presets={datePresets}
              defaultValue={[dayjs().format(DATE_FORMAT), dayjs().format(DATE_FORMAT)]}
              defaultLevel="month"
              leftSection={<IconCalendarWeek size={18} stroke={1} />}
              placeholder="Pick dates range"
              value={dateRange}
              onChange={onDateRangeChange}
            />
            {/** Select Provider */}
            <Select
              leftSection={<IconSearch size={18} stroke={1} />}
              searchable
              data={store.providersStore.providerList}
              value={store.providersStore.selectedProvider}
              w="fit-content"
              style={{ minWidth: 180 }}
              onChange={(val) => { if (store.providersStore) store.providersStore.selectedProvider = val; }}
            />
            {/** Add Chart Button */}
            <Button onClick={openAddChartModal}>
              <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
              Add Chart
            </Button>
          </Flex>
        </Flex>
        <Divider />
        {/** Modal when add chart or stat clicked */}
        <Modal
          opened={isAddChartModalOpen}
          onClose={close}
          title={`Add chart for ${selectedProviderName}`}
          centered
        >
          <Tabs defaultValue="compare" style={{ width: '100%' }} onChange={(val) => { setSelectedChartType(val === 'progress' ? 'time-series-line' : 'population-histogram'); }}>
            <Tabs.List grow>
              <Tabs.Tab value="compare">Compare to Population</Tabs.Tab>
              <Tabs.Tab value="progress">Progress over Time</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="compare" pt="md">
              <Stack gap="md">
                {/** Modal - choose aggregation for chart */}
                <Select
                  label="Aggregation"
                  placeholder="Choose aggregation type"
                  data={aggregationOptions}
                  value={selectedAggregation}
                  onChange={(value) => setSelectedAggregation(value || 'Average')}
                />
                {/** Modal - choose y-axis for chart or stat */}
                <Select
                  label="Variable"
                  placeholder="Choose Variable"
                  data={providerXAxisOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label.base,
                  }))}
                  value={selectedVar}
                  onChange={(value) => setSelectedVar(value || '')}
                />
                {/** Done Button - Add chart to view */}
                <Button
                  mt="md"
                  onClick={addChart}
                  disabled={!selectedVar}
                  fullWidth
                >
                  Done
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="progress" pt="md">
              <Stack gap="md">
                {/** Modal - choose aggregation for chart */}
                <Select
                  label="Aggregation"
                  placeholder="Choose aggregation type"
                  data={aggregationOptions}
                  value={selectedAggregation}
                  onChange={(value) => setSelectedAggregation(value || 'Average')}
                />
                {/** Modal - choose y-axis for chart or stat */}
                <Select
                  label="Variable"
                  placeholder="Choose Variable"
                  data={providerXAxisOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label.base,
                  }))}
                  value={selectedVar}
                  onChange={(value) => setSelectedVar(value || '')}
                />
                {/** Modal - choose time grouping for time-series */}
                <Select
                  label="Time Grouping"
                  placeholder="Month / Quarter / Year"
                  data={Object.entries(TIME_AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }))}
                  value={selectedTimeGrouping}
                  onChange={(value) => setSelectedTimeGrouping(value || 'month')}
                />
                {/** Done Button - Add chart to view */}
                <Button
                  mt="md"
                  onClick={addChart}
                  disabled={!selectedVar}
                  fullWidth
                >
                  Done
                </Button>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Modal>
        <div ref={screenshotRef} data-screenshot-target>
          {/* Provider Summary Card */}
          <Card shadow="sm" radius="md" p="xl" mb="md" withBorder>
            <Stack gap="xs">
              <Title order={3}>
                Provider Summary -
                {' '}
                {selectedProviderName}
              </Title>
              <Title order={4} mt="xs">
                {(() => {
                  const s = dateRange?.[0] ?? store.providersStore?.dateStart ?? null;
                  const e = dateRange?.[1] ?? store.providersStore?.dateEnd ?? null;

                  // Default "All time" when nothing is set; try to emit "Since <date>" if store has a start
                  if (!s || !e) {
                    const storeStart = store.providersStore?.dateStart ?? null;
                    if (storeStart) {
                      return <Text component="span" td="underline">{`Since ${dayjs(storeStart).format('MMM D, YYYY')}`}</Text>;
                    }
                    return (
                      <Text component="span" td="underline">
                        Since
                        {store.providersStore.earliestDate ? ` ${dayjs(store.providersStore.earliestDate).format('MMM D, YYYY')}` : ' our earliest records'}
                      </Text>
                    );
                  }
                  // If the selected range exactly matches one of the presets, use its label.
                  const matchedPreset = datePresets.find((p) => p.value[0] === s && p.value[1] === e);

                  if (matchedPreset) {
                    // Ensure label is treated as a string for safe string operations
                    const labelRaw = matchedPreset.label;
                    const label = String(labelRaw);
                    if (label.startsWith('Past ')) {
                      // "Past month" -> "In the past month"
                      return <Text component="span" td="underline">{`In the past ${label.slice(5)}`}</Text>;
                    }
                    if (label.startsWith('This ')) {
                      // "This quarter" -> "This quarter"
                      return <Text component="span" td="underline">{label}</Text>;
                    }
                    if (label === 'All time') {
                      // "All time" -> "Since <start>"
                      return <Text component="span" td="underline">{`Since ${dayjs(s).format('MMM D, YYYY')}`}</Text>;
                    }
                    // Fallback to preset label
                    return <Text component="span" td="underline">{label}</Text>;
                  }

                  // Not a preset: show explicit start — end
                  const start = dayjs(s).format('MMM D, YYYY');
                  const end = dayjs(e).format('MMM D, YYYY');
                  return <Text component="span" td="underline">{`During ${start} — ${end}`}</Text>;
                })()}
                ,
                {' '}
                {store.providersStore.selectedProvider}
                {' '}
                has recorded:
              </Title>
              <Stack gap={2} mt="xs">
                <Text size="md">
                  • Involvement in
                  {' '}
                  <Text component="span" td="underline">{store.providersStore?.selectedProvSurgCount ?? 0}</Text>
                  {' '}
                  Surgeries
                </Text>
                <Text size="md">
                  • Used
                  {' '}
                  <Text component="span" td="underline">{store.providersStore?.selectedProvRbcUnits ?? 0}</Text>
                  {' '}
                  Units of Red Blood Cells
                </Text>
                <Text size="md">
                  • Average Complexity of cases
                  {' '}
                  <Text component="span" td="underline">{store.providersStore?.cmiComparisonLabel ?? 'within typical range'}</Text>
                </Text>
                {/* <Text size="md">
                •
                {' '}
                <Text component="span" td="underline">13%</Text>
                {' '}
                of transfused patients had post operative hemoglobin above the recommended threshold
              </Text> */}
              </Stack>
            </Stack>
          </Card>
          {/* Provider Charts - render for each chart group (i.e 'Outcomes') */}
          {providerChartGroups.map((group) => (
            <div key={group}>
              <Title order={3} mt="xl" mb="md">{group}</Title>
              <Flex gap="md" mt="md" wrap="wrap">
                {/* For each chart configuration, render charts for this group. */}
                {(store.providersStore?.chartConfigs || [])
                  .filter((cfg) => cfg.group === group)
                  .map((cfg) => {
                    // Get chart key and data
                    const chartKey = `${cfg.chartId}_${cfg.xAxisVar}`;
                    const chart = store.providersStore?.providerChartData?.[chartKey];
                    if (!chart) return null;

                    // Chart series
                    const MANTINE_BLUE = '#1C7ED6';
                    const GOLD = '#FFD43B';

                    const series = (chart.data && chart.data.length > 0)
                      ? Object.keys(chart.data[0])
                        .filter((k) => k !== chart.dataKey)
                        .map((name, idx) => ({
                          name,
                          color: idx % 2 === 0 ? MANTINE_BLUE : GOLD,
                          label: name,
                        }))
                      : [];

                    return (
                      <Card
                        key={chartKey}
                        p="md"
                        shadow="sm"
                        withBorder
                        className={clsx(classes.gridItem, hoveredChartId === cfg.chartId && classes.gridItemHovered)}
                        style={{
                          position: 'relative', width: 'fit-content', minWidth: 300, flexShrink: 0,
                        }}
                        onMouseLeave={() => setHoveredChartId(null)}
                        onMouseEnter={() => setHoveredChartId(cfg.chartId)}
                      >
                        {/** Close button */}
                        {hoveredChartId === cfg.chartId && (
                          <CloseButton
                            size="xs"
                            onClick={() => handleRemoveChart(cfg.chartId)}
                            style={{
                              position: 'absolute', top: 8, right: 8, zIndex: 2,
                            }}
                            aria-label="Remove chart"
                          />
                        )}
                        <Stack gap={0} align="stretch" justify="space-between" h="100%">
                          {/** Chart */}
                          {cfg.chartType === 'time-series-line' ? (
                            <LineChart
                              h={160}
                              w="100%"
                              data={chart.data}
                              dataKey={chart.dataKey}
                              orientation={chart.orientation}
                              lineProps={{ strokeWidth: 2, dot: false }}
                              lineChartProps={{
                                margin: {
                                  top: 12,
                                  right: 25,
                                  bottom: 15,
                                  left: 25,
                                },
                              }}
                              withLegend
                              legendProps={{
                                wrapperStyle: { padding: 0, margin: 0, top: -5 },
                                iconSize: 2, // shrink the icon if desired
                                verticalAlign: 'top',
                                height: 18,
                                formatter: (value) => <span style={{ fontSize: 12 }}>{value}</span>,
                              }}
                              yAxisProps={{
                                type: 'number',
                                width: 20,
                                domain: ['dataMin', 'dataMax'],
                                tickFormatter: (value) => formatValueForDisplay(cfg.yAxisVar, value, cfg.aggregation, false),
                              }}
                              series={series}
                              xAxisProps={{
                                type: 'category',
                                domain: ['dataMin', 'dataMax'],
                                padding: { left: 10, right: 10 },
                                tickFormatter: (value) => formatValueForDisplay(cfg.xAxisVar, value, cfg.aggregation, false),
                              }}
                              tooltipProps={{
                                content: (props) => (
                                  <ProviderChartTooltip
                                    active
                                    payload={props.payload}
                                    xAxisVar={cfg.xAxisVar}
                                    yAxisVar={cfg.yAxisVar}
                                    aggregation={cfg.aggregation}
                                  />
                                ),
                              }}
                            />
                          ) : (
                            <BarChart
                              h={160}
                              w="100%"
                              data={chart.data}
                              dataKey={chart.dataKey}
                              orientation={chart.orientation}
                              barChartProps={{
                                margin: {
                                  top: 30,
                                  right: 25,
                                  bottom: 15,
                                  left: 25,
                                },
                              }}
                              yAxisProps={{ width: 20 }}
                              barProps={{ radius: 5 }}
                              series={series}
                              xAxisProps={{
                                type: 'number',
                                domain: ['dataMin', 'dataMax'],
                                padding: { left: 10, right: 10 },
                                tickFormatter: (value: number) => formatValueForDisplay(cfg.xAxisVar, value, cfg.aggregation, false),
                              }}
                              tooltipProps={{
                                content: (props) => (
                                  <ProviderChartTooltip
                                    active
                                    payload={props.payload}
                                    xAxisVar={cfg.xAxisVar}
                                    yAxisVar={cfg.yAxisVar}
                                    aggregation={cfg.aggregation}
                                  />
                                ),
                              }}
                            >
                              {(() => {
                                const values = (chart.data || []).map((r) => Number(r[chart.dataKey])).filter(Number.isFinite);
                                const min = values.length ? Math.min(...values) : 0;
                                const max = values.length ? Math.max(...values) : 1;
                                const marker = Number(chart.providerMark) || 0;

                                const range = (max - min) || 1;
                                const pct = (marker - min) / range;

                                let labelPosition: 'insideTop' | 'insideTopLeft' | 'insideTopRight' = 'insideTop';
                                if (pct <= 0.1) labelPosition = 'insideTopLeft';
                                else if (pct >= 0.9) labelPosition = 'insideTopRight';

                                return (
                                  <ReferenceLine
                                    yAxisId="left"
                                    x={chart.providerMark}
                                    ifOverflow="visible"
                                    stroke="#4a4a4a"
                                    label={{
                                      value: store.providersStore?.selectedProvider ?? 'Provider',
                                      fill: '#4a4a4a',
                                      position: labelPosition,
                                      offset: -25,
                                      fontSize: 12,
                                    }}
                                  />
                                );
                              })()}
                              <ReferenceLine
                                yAxisId="left"
                                x={Number(chart.recommendedMark)}
                                ifOverflow="visible"
                                stroke="#82ca9d"
                                strokeDasharray="3 3"
                              />
                              {/* Invisible hithox for recommended hovering */}
                              <ReferenceLine
                                yAxisId="left"
                                x={Number(chart.recommendedMark)}
                                ifOverflow="visible"
                              // Invisible
                                stroke="transparent"
                                strokeWidth={8}
                                style={{ pointerEvents: 'stroke', cursor: 'pointer', zIndex: 9999 }}
                                onMouseEnter={() => setHoveredRecommendedLine(chartKey)}
                                onMouseLeave={() => setHoveredRecommendedLine(null)}
                                label={hoveredRecommendedLine === chartKey ? {
                                  value: 'Recommended',
                                  position: 'bottom',
                                  fill: '#2f9e44',
                                  fontSize: 12,
                                  style: { zIndex: 9999 },
                                } : undefined}
                              />
                            </BarChart>
                          )}
                          <Text
                            size="sm"
                            fw={600}
                            ta="center"
                            mt="xs"
                            style={{
                              whiteSpace: 'nowrap',
                              color: 'var(--mantine-color-gray-7)',
                            }}
                          >
                            {chart.title}
                          </Text>
                        </Stack>
                      </Card>
                    );
                  })}
              </Flex>
            </div>
          ))}
        </div>
      </Stack>
    );
  });
}
