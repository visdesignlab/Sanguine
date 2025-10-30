import {
  ReactNode, useContext, useMemo, useState,
} from 'react';

import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, Tabs, ActionIcon, Title, Flex, Container, Menu, Box, Text, Tooltip,
  Modal,
  Button,
  Stack,
  Badge,
} from '@mantine/core';
import {
  IconDatabase, IconBook,
  IconArrowNarrowLeftDashed,
  IconArrowNarrowRightDashed, IconDeviceFloppy,
  IconCamera, IconLogout, IconUser, IconMenu,
  IconRestore, type IconProps,
  IconChartBar,
  IconClipboardList,
  IconDownload, IconMail,
} from '@tabler/icons-react';
import * as htmlToImage from 'html-to-image';
import { Store } from '../Store/Store';
import { useThemeConstants } from '../Theme/mantineTheme';
import { DashboardView } from '../Components/Views/DashboardView/DashboardView';
import { ExploreView } from '../Components/Views/ExploreView/ExploreView';
import { ProvidersView } from '../Components/Views/ProvidersView/ProvidersView';
import { SettingsView } from '../Components/Views/SettingsView/SettingsView';
import classes from './Shell.module.css';
import { FilterPanel } from '../Components/Toolbar/Filters/FilterPanel';
import { FilterIcon } from '../Components/Toolbar/Filters/FilterIcon';
import { SelectedVisitsPanel } from '../Components/Toolbar/SelectedVisits/SelectedVisitsPanel';

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export function Shell() {
  const store = useContext(Store);
  const [screenshots, setScreenshots] = useState<{ id: string; dataUrl: string; tab: string; ts: string }[]>([]);
  // View tabs -----------------
  const TABS = [
    {
      key: 'Dashboard',
      content: <DashboardView />,
    },
    {
      key: 'Providers',
      content: <ProvidersView />,
    },
    {
      key: 'Explore',
      content: <ExploreView />,
    },
    {
      key: 'Settings',
      content: <SettingsView />,
    },
  ];
  // Default tab shown initial load
  const defaultTab = TABS[0].key;

  // Active tab in the view tabs
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Reset to defaults modal ----------------------
  const [resetModalOpened, setResetModalOpened] = useState(false);
  const handleConfirmReset = () => {
    // Reset filters (add other reset logic as needed)
    store.filtersStore.resetAllFilters();
    setResetModalOpened(false);
  };

  // Toolbar & Left Panel states ----------------------
  // Width of the header toolbar & left toolbar
  const { toolbarWidth, iconStroke } = useThemeConstants();

  // Width of the navbar when left toolbar is open
  const LEFT_PANEL_WIDTH = 6 * toolbarWidth;

  // Open and close the left toolbar, burger toggle visible on hover.
  const [leftToolbarOpened, { toggle: toggleLeftToolbar }] = useDisclosure(true);
  const [activeLeftPanel, setActiveLeftPanel] = useState<number | null>(null);
  const navbarWidth = useMemo(() => (activeLeftPanel === null ? toolbarWidth : LEFT_PANEL_WIDTH), [activeLeftPanel, LEFT_PANEL_WIDTH, toolbarWidth]);

  // Toolbar icons ----------------------
  // Left toolbar icons
  const leftToolbarIcons: { icon: React.ComponentType<IconProps>; label: string; content: ReactNode; actionButtons?: ReactNode[]; disabled?: boolean }[] = [
    {
      icon: FilterIcon,
      label: 'Filter Panel',
      content: <FilterPanel />,
      actionButtons: [
        <ActionIcon key="reset-filters" aria-label="Reset all filters" onClick={() => { store.filtersStore.resetAllFilters(); }} className={classes.leftToolbarIcon}>
          <IconRestore stroke={iconStroke} size={21} />
        </ActionIcon>,
        <ActionIcon key="toggle-filter-histograms" aria-label="Toggle filter historgrams" onClick={() => { store.filtersStore.showFilterHistograms = !store.filtersStore.showFilterHistograms; }} data-active={store.filtersStore.showFilterHistograms} className={classes.leftToolbarIcon}>
          <IconChartBar stroke={iconStroke} />
        </ActionIcon>,
      ],
    },
    {
      icon: IconClipboardList,
      label: 'Selected Visits',
      content: <SelectedVisitsPanel />,
      actionButtons: [
        <Badge key="selected-visits-badge" variant="light" size="sm">
          {store.selectionsStore.selectedVisitNos.length}
          {' '}
          Visits
        </Badge>,

      ],
    },
    {
      icon: IconDatabase,
      label: 'Database',
      content: <Text>Database content</Text>,
      disabled: true,
    },
    {
      icon: IconBook,
      label: 'Learn',
      content: <Text>Learning content</Text>,
      disabled: true,
    },
  ];

  // Screenshot function
  const handleScreenshot = async () => {
    const htmlEl = document.documentElement;
    const filter = (node: HTMLElement) => node.tagName !== 'NOSCRIPT';
    const tempStyleEl: HTMLStyleElement = document.createElement('style');
    // make common grid items overflow visible for full-page capture
    tempStyleEl.innerHTML = '.react-grid-item, .layout, .MuiGrid-item { overflow: visible !important; }';
    document.head.appendChild(tempStyleEl);

    const options = {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter,
      width: htmlEl.scrollWidth,
      height: htmlEl.scrollHeight,
    };

    const dateString = new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');

    try {
      const dataUrl = await htmlToImage.toPng(htmlEl, options);
      // Store screenshot
      const item = {
        id: dateString,
        dataUrl,
        tab: activeTab,
        ts: new Date().toISOString(),
      };
      setScreenshots((prev) => [item, ...prev]);
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      document.head.removeChild(tempStyleEl);
    }
  };

  const downloadScreenshot = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const emailScreenshot = (_dataUrl: string) => {
    // Dummy email handler
    // Replace with real email flow later
    // eslint-disable-next-line no-console
    console.log('Email action (dummy)');
  };

  // Header toolbar icons
  const headerIcons: { icon: React.ComponentType<IconProps>; label: string; onClick?: () => void }[] = [
    { icon: IconArrowNarrowLeftDashed, label: 'Back' },
    { icon: IconArrowNarrowRightDashed, label: 'Forward' },
    { icon: IconDeviceFloppy, label: 'Save' },
    { icon: IconCamera, label: 'Camera', onClick: handleScreenshot },
    { icon: IconUser, label: 'User' },
  ];

  return (
    <AppShell
      header={{ height: toolbarWidth }}
      navbar={{
        width: navbarWidth,
        breakpoint: 0,
        collapsed: { desktop: !leftToolbarOpened },
      }}
      padding="xs"
    >
      {/** Header Toolbar */}
      <AppShell.Header withBorder>
        <Group justify="space-between">
          <Group>
            {/** Left Toolbar Toggle Burger Icon */}
            <Flex justify="center" w={toolbarWidth}>
              <ActionIcon aria-label="Toggle Left Toolbar">
                <IconMenu onClick={toggleLeftToolbar} stroke={iconStroke} />
              </ActionIcon>
            </Flex>
            {/** Intelvia Title */}
            <Title order={1} pl="xs">Intelvia</Title>
            {/** View Tabs */}
            <Tabs
              variant="outline"
              value={activeTab}
              onChange={(value) => {
                if (value) setActiveTab(value);
              }}
              radius="md"
              defaultValue={defaultTab}
              classNames={{
                tab: activeLeftPanel !== null ? classes.tabOutlineActive : undefined,
              }}
              pl="xs"
            >
              {/** Render each tab in tabs list */}
              <Tabs.List h={toolbarWidth} style={{ paddingTop: 10 }}>
                {Object.values(TABS).map((tab) => (
                  <Tabs.Tab key={tab.key} value={tab.key}>{tab.key}</Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Group>
          {/** All Header Icons, right-aligned */}
          <Group gap="sm" pr="md">
            {headerIcons.map(({ icon: Icon, label, onClick }) => {
              // Hover Menu for Camera to show screenshots
              if (label === 'Camera') {
                return (
                  <Menu key={label} shadow="md" width={320} trigger="hover" closeDelay={200} offset={12}>
                    <Menu.Target>
                      <ActionIcon aria-label={label} onClick={onClick}>
                        <Icon stroke={iconStroke} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Screenshots</Menu.Label>
                      <Box style={{ maxHeight: 240, overflow: 'auto' }}>
                        {screenshots.length === 0 ? (
                          <Menu.Item disabled>No screenshots</Menu.Item>
                        ) : screenshots.map((s) => (
                          <Menu.Item
                            key={s.id}
                            onClick={() => downloadScreenshot(s.dataUrl, `Intelvia_Screenshot_${s.id}.png`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <Box style={{
                              display: 'flex', gap: 6, alignItems: 'center', marginRight: 8,
                            }}
                            >
                              <ActionIcon size="xs" variant="transparent" onClick={(e) => { e.stopPropagation(); downloadScreenshot(s.dataUrl, `Intelvia_Screenshot_${s.id}.png`); }}>
                                <IconDownload size={14} />
                              </ActionIcon>
                              <ActionIcon size="xs" variant="transparent" onClick={(e) => { e.stopPropagation(); emailScreenshot(s.dataUrl); }}>
                                <IconMail size={14} />
                              </ActionIcon>
                            </Box>
                            <Box style={{ flex: 1, textAlign: 'left' }}>
                              <Text size="sm">{s.tab}</Text>
                              <Text size="xs" color="dimmed">{new Date(s.ts).toLocaleString()}</Text>
                            </Box>
                          </Menu.Item>
                        ))}
                      </Box>
                    </Menu.Dropdown>
                  </Menu>
                );
              }
              // User menu
              if (label === 'User') {
                return (
                  <Menu shadow="md" width={200} offset={12} trigger="hover" closeDelay={200} key="user-menu">
                    <Menu.Target>
                      <ActionIcon aria-label="User">
                        <IconUser stroke={iconStroke} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>User</Menu.Label>
                      <Menu.Item
                        leftSection={<IconRestore size={14} />}
                        onClick={() => setResetModalOpened(true)}
                      >
                        Reset to defaults
                      </Menu.Item>
                      <Menu.Item leftSection={<IconLogout size={14} />}>
                        Log out
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                );
              }
              // Default header icon button
              return (
                <Tooltip key={label} label={label}>
                  <ActionIcon aria-label={label} onClick={onClick}>
                    <Icon stroke={iconStroke} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </Group>
        </Group>
      </AppShell.Header>
      {/** Left Toolbar */}
      <AppShell.Navbar>
        {/** Left Toolbar Icons */}
        <Flex direction="row" h="100%" w={navbarWidth}>
          <Box h="100%" style={{ borderRight: activeLeftPanel !== null ? '1px solid var(--mantine-color-gray-3)' : 'none' }}>
            <Group
              justify="center"
              w={toolbarWidth}
              pt="md"
            >
              {leftToolbarIcons.map(({ icon: Icon, label, disabled }, index) => (
                <Tooltip
                  key={label}
                  label={label}
                  position="right"
                >
                  <ActionIcon
                    key={label}
                    aria-label={label}
                    onClick={() => (index === activeLeftPanel ? setActiveLeftPanel(null) : setActiveLeftPanel(index))}
                    data-active={index === activeLeftPanel}
                    className={classes.leftToolbarIcon}
                    style={{ overflow: 'visible' }}
                    disabled={disabled}
                  >
                    <Icon
                      stroke={iconStroke}
                    />
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          </Box>

          {/** Left Panel Content */}
          {activeLeftPanel !== null && (
            <Box style={{ flexGrow: 1 }} p="md">
              {leftToolbarIcons[activeLeftPanel].content}
            </Box>
          )}
        </Flex>
      </AppShell.Navbar>
      {/** Main Area */}
      <AppShell.Main>
        <Container fluid mt="xs">
          {/** Display content of active tab */}
          {TABS.map((tab) => (
            <Box
              key={tab.key}
              style={{ display: activeTab === tab.key ? 'block' : 'none' }}
            >
              {tab.content}
            </Box>
          ))}
        </Container>
      </AppShell.Main>
      {/** Reset to Defaults Modal */}
      <Modal
        opened={resetModalOpened}
        onClose={() => setResetModalOpened(false)}
        title="Are you sure you want to reset?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            This action will reset to Intelvia&apos;s default state.
            <br />
            All custom charts and filters will be removed.
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setResetModalOpened(false)}>Cancel</Button>
            <Button color="red" onClick={handleConfirmReset}>Reset</Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
