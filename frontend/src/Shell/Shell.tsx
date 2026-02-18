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
  Anchor,
} from '@mantine/core';
import {
  IconDatabase, IconBook,
  IconArrowNarrowLeftDashed,
  IconArrowNarrowRightDashed, IconDeviceFloppy,
  IconCamera, IconLogout, IconMenu,
  IconRestore, type IconProps,
  IconChartBar,
  IconClipboardList,
  IconBug,
  IconMenu2,
  IconAt,
  IconFilter,
  IconSubtask,
  IconInfoSquareRounded,
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
import { SavedStatesMenu } from '../Components/Menus/ManageStatesMenu';
import { apiPath } from '../Utils/api';

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
  const setActiveTab = (tab: string) => {
    store.actions.setUiState({ activeTab: tab });
  };

  // About modal ----------------------
  const [aboutModalOpened, setAboutModalOpened] = useState(false);

  // Toolbar & Left Panel states ----------------------
  // Width of the header toolbar & left toolbar
  const { toolbarWidth, iconStroke } = useThemeConstants();

  // Width of the navbar when left toolbar is open
  const LEFT_PANEL_WIDTH = 6 * toolbarWidth;

  // Open and close the left toolbar, burger toggle visible on hover.
  // Open and close the left toolbar, burger toggle visible on hover.
  const toggleLeftToolbar = () => {
    store.actions.setUiState({ leftToolbarOpened: !store.state.ui.leftToolbarOpened });
  };

  const setActiveLeftPanel = (index: number | null) => {
    store.actions.setUiState({ activeLeftPanel: index });
  };
  const navbarWidth = useMemo(() => (store.state.ui.activeLeftPanel === null ? toolbarWidth : LEFT_PANEL_WIDTH), [store.state.ui.activeLeftPanel, LEFT_PANEL_WIDTH, toolbarWidth]);

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
    {
      icon: IconArrowNarrowLeftDashed,
      label: 'Back',
      onClick: () => store.provenance?.undo(),
      disabled: !store.canUndo,
    },
    {
      icon: IconArrowNarrowRightDashed,
      label: 'Forward',
      onClick: () => store.provenance?.redo(),
      disabled: !store.canRedo,
    },
    { icon: IconDeviceFloppy, label: 'Save State' },
    { icon: IconCamera, label: 'Camera' },
  ], [store.provenance, store.canUndo, store.canRedo]);

  return (
    <AppShell
      header={{ height: toolbarWidth }}
      navbar={{
        width: navbarWidth,
        breakpoint: 0,
        collapsed: { desktop: !store.state.ui.leftToolbarOpened },
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
              value={store.state.ui.activeTab}
              onChange={(value) => {
                if (value) setActiveTab(value);
              }}
              radius="md"
              defaultValue={defaultTab}
              classNames={{
                tab: store.state.ui.activeLeftPanel !== null ? classes.tabOutlineActive : undefined,
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
            {headerIcons.map(({
              icon: Icon, label, onClick, disabled,
            }) => {
              // --- Hover Menu for Camera to show screenshots ---
              if (label === 'Camera') {
                return (
                  <ScreenshotMenu key="screenshot-menu" activeTab={store.state.ui.activeTab} />
                );
              }
              // --- Save State Menu ---
              if (label === 'Save State') {
                return (
                  <SavedStatesMenu
                    key="saved-states-menu"
                    onReset={() => store.restoreToInitialState()}
                  />
                );
              }
              // Default header icon button
              return (
                <Tooltip key={label} label={label}>
                  <ActionIcon
                    aria-label={label}
                    onClick={onClick}
                    disabled={disabled}
                    className={label === 'Back' || label === 'Forward' ? classes.forwardBackArrowIcon : undefined}
                  >
                    <Icon stroke={iconStroke} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
            <Menu position="bottom-end" offset={12} trigger="click-hover">
              <Menu.Target>
                <ActionIcon aria-label="Additional Options">
                  <IconMenu2 stroke={iconStroke} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Actions</Menu.Label>
                <Menu.Item
                  leftSection={<IconFilter size={14} />}
                  onClick={() => {
                    store.resetAllFilters();
                  }}
                >
                  Reset all filters
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconClipboardList size={14} />}
                  onClick={() => {
                    store.resetSelections();
                  }}
                >
                  Clear selected visits
                </Menu.Item>

                <Menu.Label>Session</Menu.Label>
                <Menu.Item
                  leftSection={<IconSubtask size={14} />}
                  disabled
                >
                  Manage Sessions
                </Menu.Item>

                <Menu.Label>Help & Feedback</Menu.Label>
                <Menu.Item
                  leftSection={<IconInfoSquareRounded size={14} />}
                  onClick={() => { setAboutModalOpened(true); }}
                >
                  About Intelvia
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBook size={14} />}
                  onClick={() => { window.open('https://docs.intelvia.app/', '_blank'); }}
                  disabled
                >
                  Documentation
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconAt size={14} />}
                  // Copy email to clipboard
                  onClick={() => { navigator.clipboard.writeText('support@intelvia.io'); }}
                >
                  Copy Support Email
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBug size={14} />}
                  onClick={() => { window.open('https://github.com/visdesignlab/Sanguine/issues/', '_blank'); }}
                >
                  Report a Bug
                </Menu.Item>

                <Menu.Label>Account</Menu.Label>
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={async () => {
                    await fetch(apiPath('accounts/logout'), { credentials: 'include' });
                  }}
                  disabled
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>
      {/** Left Toolbar */}
      <AppShell.Navbar>
        {/** Left Toolbar Icons */}
        <Flex direction="row" h="100%" w={navbarWidth}>
          <Box h="100%" style={{ borderRight: store.state.ui.activeLeftPanel !== null ? '1px solid var(--mantine-color-gray-3)' : 'none' }}>
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
                    onClick={() => (index === store.state.ui.activeLeftPanel ? setActiveLeftPanel(null) : setActiveLeftPanel(index))}
                    data-active={index === store.state.ui.activeLeftPanel}
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
          {store.state.ui.activeLeftPanel !== null && (
            <Box style={{ flexGrow: 1 }} p="md">
              {leftToolbarIcons[store.state.ui.activeLeftPanel].content}
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
              style={{ display: store.state.ui.activeTab === tab.key ? 'block' : 'none' }}
            >
              {tab.content}
            </Box>
          ))}
        </Container>
      </AppShell.Main>

      <Modal
        opened={aboutModalOpened}
        onClose={() => setAboutModalOpened(false)}
        title="About Intelvia"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Intelvia is a visual analytics platform designed to help healthcare professionals explore and analyze transfusion data effectively. Our original research prototype, Sanguine, was developed at the University of Utah&apos;s Visualization Design Lab.
          </Text>
          <Text size="sm">
            For more information, check out the
            {' '}
            <Anchor href="https://docs.intelvia.app/" target="_blank" rel="noopener noreferrer">documentation</Anchor>
            .
          </Text>
          <Text size="sm">
            Version:
            {' '}
            <Text component="span" ff="monospace">
              {import.meta.env.VITE_VERSION || 'vX.YY.ZZ-alpha.AA'}
            </Text>
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setAboutModalOpened(false)}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
});
