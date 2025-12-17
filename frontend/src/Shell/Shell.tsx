import { observer } from 'mobx-react-lite';
import {
  ReactNode, useContext, useMemo, useState,
} from 'react';
import {
  AppShell, Group, Tabs, ActionIcon, Title, Flex, Container, Menu, Box, Text, Tooltip,
  Modal,
  Button,
  Stack,
  Badge,
  TextInput,
} from '@mantine/core';
import {
  IconDatabase, IconBook,
  IconArrowNarrowLeftDashed,
  IconArrowNarrowRightDashed, IconDeviceFloppy,
  IconCamera, IconLogout, IconUser, IconMenu,
  IconRestore, type IconProps,
  IconChartBar,
  IconClipboardList,
} from '@tabler/icons-react';
import { Store } from '../Store/Store';
import { useThemeConstants } from '../Theme/mantineTheme';
import classes from './Shell.module.css';
import { DashboardView } from '../Components/Views/DashboardView/DashboardView';
import { ExploreView } from '../Components/Views/ExploreView/ExploreView';
import { ProvidersView } from '../Components/Views/ProvidersView/ProvidersView';
import { SettingsView } from '../Components/Views/SettingsView/SettingsView';
import { SelectedVisitsPanel } from '../Components/Toolbar/SelectedVisits/SelectedVisitsPanel';
import { FilterPanel } from '../Components/Toolbar/Filters/FilterPanel';
import { FilterIcon } from '../Components/Toolbar/Filters/FilterIcon';
import { ScreenshotMenu } from '../Components/Menus/ScreenshotMenu';
import { captureScreenshot } from '../Utils/screenshotUtils';

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export const Shell = observer(() => {
  const store = useContext(Store);
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
  const activeTab = store.state.ui.activeTab;
  const setActiveTab = (tab: string) => {
    store.actions.setUiState({ activeTab: tab });
  };

  // Reset to defaults modal ----------------------
  const [resetModalOpened, setResetModalOpened] = useState(false);
  const handleConfirmReset = () => {
    // Restore to initial state via provenance
    store.restoreToInitialState();
    setResetModalOpened(false);
  };

  // Save State Modal -----------------------------
  // Save State Modal -----------------------------
  const [saveModalOpened, setSaveModalOpened] = useState(false);
  const [stateName, setStateName] = useState('');

  const handleSaveState = async () => {
    if (stateName.trim()) {
      // Close modal first
      setSaveModalOpened(false);

      // Wait for modal transition to finish (approx 300ms is usually safe for Mantine modals)
      await new Promise((resolve) => { setTimeout(resolve, 300); });

      // Capture screenshot now that modal is gone
      const screenshot = await captureScreenshot(null, { pixelRatio: 1 });

      store.saveState(stateName, screenshot);
      setStateName('');
    }
  };

  // Restore State Modal --------------------------
  const [restoreModalOpened, setRestoreModalOpened] = useState(false);
  const [stateToRestore, setStateToRestore] = useState<string | null>(null);

  const handleRestoreState = () => {
    if (stateToRestore) {
      store.restoreState(stateToRestore);
      setRestoreModalOpened(false);
      setStateToRestore(null);
    }
  };

  const confirmRestore = (id: string) => {
    setStateToRestore(id);
    setRestoreModalOpened(true);
  };

  // Toolbar & Left Panel states ----------------------
  // Width of the header toolbar & left toolbar
  const { toolbarWidth, iconStroke } = useThemeConstants();

  // Width of the navbar when left toolbar is open
  const LEFT_PANEL_WIDTH = 6 * toolbarWidth;

  // Open and close the left toolbar, burger toggle visible on hover.
  const leftToolbarOpened = store.state.ui.leftToolbarOpened;
  const toggleLeftToolbar = () => {
    store.actions.setUiState({ leftToolbarOpened: !leftToolbarOpened });
  };

  const activeLeftPanel = store.state.ui.activeLeftPanel;
  const setActiveLeftPanel = (index: number | null) => {
    store.actions.setUiState({ activeLeftPanel: index });
  };
  const navbarWidth = useMemo(() => (activeLeftPanel === null ? toolbarWidth : LEFT_PANEL_WIDTH), [activeLeftPanel, LEFT_PANEL_WIDTH, toolbarWidth]);

  // Toolbar icons ----------------------
  // Left toolbar icons
  const leftToolbarIcons: { icon: React.ComponentType<IconProps>; label: string; content: ReactNode; actionButtons?: ReactNode[]; disabled?: boolean }[] = [
    {
      icon: FilterIcon,
      label: 'Filter Panel',
      content: <FilterPanel />,
      actionButtons: [
        <ActionIcon key="reset-filters" aria-label="Reset all filters" onClick={() => { store.resetAllFilters(); }} className={classes.leftToolbarIcon}>
          <IconRestore stroke={iconStroke} size={21} />
        </ActionIcon>,
        <ActionIcon key="toggle-filter-histograms" aria-label="Toggle filter historgrams" onClick={() => { store.actions.setUiState({ showFilterHistograms: !store.state.ui.showFilterHistograms }); }} data-active={store.state.ui.showFilterHistograms} className={classes.leftToolbarIcon}>
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
          {store.selectedVisitNos.length}
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

  // Header toolbar icons
  const headerIcons = useMemo(() => [
    { icon: IconArrowNarrowLeftDashed, label: 'Back', onClick: () => store.provenance?.undo(), disabled: !store.canUndo },
    { icon: IconArrowNarrowRightDashed, label: 'Forward', onClick: () => store.provenance?.redo(), disabled: !store.canRedo },
    { icon: IconDeviceFloppy, label: 'Save', onClick: () => setSaveModalOpened(true) },
    { icon: IconCamera, label: 'Camera' },
    { icon: IconUser, label: 'User' },
  ], [store.provenance, store.canUndo, store.canRedo]);

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
          <Group gap="sm" pr="md" wrap="nowrap">
            {headerIcons.map(({ icon: Icon, label, onClick, disabled }) => {
              // --- Hover Menu for Camera to show screenshots ---
              if (label === 'Camera') {
                return (
                  <ScreenshotMenu key="screenshot-menu" activeTab={activeTab} />
                );
              }
              // --- User menu ---
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
                  <ActionIcon
                    aria-label={label}
                    onClick={onClick}
                    disabled={disabled}
                    className={label === 'Back' || label === 'Forward' ? classes.headerIcon : undefined}
                  >
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

      {/** Save State Modal */}
      <Modal
        opened={saveModalOpened}
        onClose={() => setSaveModalOpened(false)}
        title="Save Current State"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="State Name"
            placeholder="Enter a name for this state"
            value={stateName}
            onChange={(event) => setStateName(event.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setSaveModalOpened(false)}>Cancel</Button>
            <Button onClick={handleSaveState}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/** Restore State Modal */}
      <Modal
        opened={restoreModalOpened}
        onClose={() => setRestoreModalOpened(false)}
        title="Restore State?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to restore this state? Unsaved changes will be lost.
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRestoreModalOpened(false)}>Cancel</Button>
            <Button color="red" onClick={handleRestoreState}>Restore</Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
});
