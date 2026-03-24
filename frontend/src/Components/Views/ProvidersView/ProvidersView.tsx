import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { DatePickerInput, DatePickerPreset } from '@mantine/dates';
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
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { providerChartGroups } from '../../../Types/application';
import {
  buildScreenshotFilename, captureScreenshot, dataUrlToFile, downloadDataUrl, shareFiles,
} from '../../../Utils/screenshotUtils';
import { AddChartModal } from './AddChartModal';
import { ProviderChartCard } from './ProviderChartCard';

const DATE_FORMAT = 'YYYY-MM-DD';

/** Build the human-readable date-range subtitle for the Provider Summary card. */
function buildDateRangeLabel(
  dateRange: [string | null, string | null],
  datePresets: DatePickerPreset<'range'>[],
  earliestDate: string | null | undefined,
) {
  const [s, e] = dateRange;

  if (!s || !e) {
    if (earliestDate) {
      return <Text component="span" td="underline">{`Since ${dayjs(earliestDate).format('MMM D, YYYY')}`}</Text>;
    }
    return <Text component="span" td="underline">Since our earliest records</Text>;
  }

  const matchedPreset = datePresets.find((p) => p.value[0] === s && p.value[1] === e);
  if (matchedPreset) {
    const label = String(matchedPreset.label);
    if (label.startsWith('Past ')) {
      return <Text component="span" td="underline">{`In the past ${label.slice(5)}`}</Text>;
    }
    if (label.startsWith('This ')) {
      return <Text component="span" td="underline">{label}</Text>;
    }
    if (label === 'All time') {
      return <Text component="span" td="underline">{`Since ${dayjs(s).format('MMM D, YYYY')}`}</Text>;
    }
    return <Text component="span" td="underline">{label}</Text>;
  }

  return (
    <Text component="span" td="underline">
      {`During ${dayjs(s).format('MMM D, YYYY')} — ${dayjs(e).format('MMM D, YYYY')}`}
    </Text>
  );
}

const datePresets: DatePickerPreset<'range'>[] = [
  { label: 'Past month', value: [dayjs().startOf('month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  { label: 'This quarter', value: [dayjs().subtract(dayjs().month() % 3, 'month').startOf('month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  { label: 'Past 3 months', value: [dayjs().subtract(3, 'month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  { label: 'Past 6 months', value: [dayjs().subtract(6, 'month').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  { label: 'Past year', value: [dayjs().subtract(1, 'year').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
  { label: 'All time', value: [dayjs('2020-01-01').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)] },
];

export function ProvidersView() {
  const store = useContext(Store);
  const {
    buttonIconSize, cardIconStroke, toolbarWidth, iconStroke,
  } = useThemeConstants();

  // --- Export / Screenshot ---
  const [exportMenuOpened, setExportMenuOpened] = useState(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const prevExportMenuOpen = useRef(false);
  const screenshotRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadView = useCallback(async () => {
    try {
      const dataUrl = await captureScreenshot(screenshotRef.current, { hideSelector: '[data-screenshot-hidden]' });
      downloadDataUrl(dataUrl, buildScreenshotFilename('providers'));
    } catch (err) {
      console.error('ProvidersView: Download View failed', err);
    } finally {
      setExportMenuOpened(false);
    }
  }, []);

  const handleShareView = useCallback(async () => {
    try {
      prevExportMenuOpen.current = exportMenuOpened;
      setSharingInProgress(true);
      setExportMenuOpened(true);

      const dataUrl = await captureScreenshot(screenshotRef.current, { hideSelector: '[data-screenshot-hidden]' });
      const filename = buildScreenshotFilename('providers');
      const file = await dataUrlToFile(dataUrl, filename);
      await shareFiles([file], 'Screenshot from Intelvia - Patient Blood Management Analytics\n\n');
    } catch (err) {
      console.error('ProvidersView: Share View failed', err);
    } finally {
      setSharingInProgress(false);
      setExportMenuOpened(prevExportMenuOpen.current);
    }
  }, [exportMenuOpened]);

  // --- Charts ---
  const handleRemoveChart = useCallback((chartId: string) => {
    store.providersStore.removeChart(chartId);
  }, [store.providersStore]);

  // --- Date Range ---
  const [dateRange, setDateRange] = useState<[string | null, string | null]>(
    [dayjs('2020-01-01').format(DATE_FORMAT), dayjs().format(DATE_FORMAT)],
  );

  const onDateRangeChange = useCallback((val: [string | null, string | null]) => {
    setDateRange(val);
    if (store.providersStore) {
      store.providersStore.setDateRange(val?.[0] ?? null, val?.[1] ?? null);
    }
  }, [store.providersStore]);

  useEffect(() => {
    if (store.duckDB && store.providersStore) {
      (async () => {
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
    const { openModal, modal: addChartModal } = AddChartModal({
      providerName: selectedProviderName,
      providersStore: store.providersStore,
    });

    return (
      <Stack mb="xl" gap="lg">
        {/* Toolbar */}
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
            {/* Export menu */}
            <Tooltip label="Export View" position="bottom">
              <Menu
                withinPortal
                shadow="md"
                trigger="hover"
                closeOnItemClick={false}
                opened={exportMenuOpened}
                onOpen={() => setExportMenuOpened(true)}
                onClose={() => { if (!sharingInProgress) setExportMenuOpened(false); }}
              >
                <Menu.Target>
                  <ActionIcon size="lg" aria-label="Export View">
                    <IconShare2 stroke={iconStroke} />
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
            {/* Select Provider */}
            <Select
              leftSection={<IconSearch size={18} stroke={1} />}
              searchable
              data={store.providersStore.providerList}
              value={store.providersStore.selectedProvider}
              w="fit-content"
              style={{ minWidth: 180 }}
              onChange={(val) => { if (store.providersStore) store.providersStore.selectedProvider = val; }}
            />
            {/* Add Chart */}
            <Button onClick={openModal}>
              <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
              Add Chart
            </Button>
          </Flex>
        </Flex>

        <Divider />

        {addChartModal}

        {/* Screenshot target */}
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
                {buildDateRangeLabel(
                  [dateRange?.[0] ?? store.providersStore?.dateStart ?? null,
                    dateRange?.[1] ?? store.providersStore?.dateEnd ?? null],
                  datePresets,
                  store.providersStore.earliestDate,
                )}
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
              </Stack>
            </Stack>
          </Card>

          {/* Provider Charts — grouped by category */}
          {providerChartGroups.map((group) => (
            <div key={group}>
              <Title order={3} mt="xl" mb="md">{group}</Title>
              <Flex gap="md" mt="md" wrap="wrap">
                {(store.providersStore?.chartConfigs || [])
                  .filter((cfg) => cfg.group === group)
                  .map((cfg) => {
                    const chartKey = `${cfg.chartId}_${cfg.xAxisVar}`;
                    const chart = store.providersStore?.providerChartData?.[chartKey];
                    if (!chart) return null;

                    return (
                      <ProviderChartCard
                        key={chartKey}
                        cfg={cfg}
                        chart={chart}
                        selectedProviderName={store.providersStore?.selectedProvider ?? null}
                        onRemove={handleRemoveChart}
                      />
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
