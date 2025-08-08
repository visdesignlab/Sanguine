import { ReactNode, useMemo, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, Tabs, ActionIcon, Title, Flex, Container, Menu, Box, Text, Tooltip,
} from '@mantine/core';
import {
  IconDatabase, IconSettings, IconFilter, IconBook,
  IconTrash, IconArrowNarrowLeftDashed,
  IconArrowNarrowRightDashed, IconDeviceFloppy,
  IconCamera, IconLogout, IconUser, IconMenu,
  IconRestore, type IconProps,
} from '@tabler/icons-react';
import { useThemeConstants } from '../Theme/mantineTheme';
import { ExploreView } from '../Components/Views/ExploreView/ExploreView';
import { ProvidersView } from '../Components/Views/ProvidersView/ProvidersView';
import { Dashboard } from '../Components/Views/Dashboard/Dashboard';
import classes from './Shell.module.css';

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export function Shell() {
  // View tabs -----------------
  const TABS = [
    {
      key: 'Dashboard',
      content: <Dashboard />,
    },
    {
      key: 'Providers',
      content: <ProvidersView />,
    },
    {
      key: 'Explore',
      content: <ExploreView />,
    },
  ];
  // Default tab shown initial load
  const defaultTab = TABS[0].key;

  // Active tab in the view tabs
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

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
  const leftToolbarIcons: { icon: React.ComponentType<IconProps>; label: string, content: ReactNode }[] = [
    { icon: IconFilter, label: 'Filter Panel', content: <Text>Filter panel content</Text> },
    { icon: IconSettings, label: 'Settings', content: <Text>Settings content</Text> },
    { icon: IconDatabase, label: 'Database', content: <Text>Database content</Text> },
    { icon: IconBook, label: 'Learn', content: <Text>Learning content</Text> },
  ];

  // Header toolbar icons
  const headerIcons: { icon: React.ComponentType<IconProps>; label: string }[] = [
    { icon: IconTrash, label: 'Delete' },
    { icon: IconArrowNarrowLeftDashed, label: 'Back' },
    { icon: IconArrowNarrowRightDashed, label: 'Forward' },
    { icon: IconDeviceFloppy, label: 'Save' },
    { icon: IconCamera, label: 'Camera' },
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
      <AppShell.Header>
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
              styles={{
                tabLabel: {
                  marginTop: -4,
                },
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
          {/** Header Icons, right-aligned */}
          <Group gap="sm" pr="md">
            {headerIcons.map(({ icon: Icon, label }) => (
              <Tooltip
                key={label}
                label={label}
              >
                <ActionIcon aria-label={label}>
                  <Icon stroke={iconStroke} />
                </ActionIcon>
              </Tooltip>
            ))}
            {/** Header Icon - User Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Tooltip
                  key="User"
                  label="User"
                >
                  <ActionIcon aria-label="User">
                    <IconUser stroke={iconStroke} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>User</Menu.Label>
                <Menu.Item
                  leftSection={<IconRestore size={14} />}
                >
                  Reset to defaults
                </Menu.Item>
                <Menu.Item leftSection={<IconLogout size={14} />}>
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
          <Box h="100%" style={{ borderRight: activeLeftPanel !== null ? '1px solid var(--mantine-color-gray-3)' : 'none' }}>
            <Group
              justify="center"
              w={toolbarWidth}
              pt="md"
            >
              {leftToolbarIcons.map(({ icon: Icon, label }, index) => (
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
              <Title order={3}>
                {leftToolbarIcons[activeLeftPanel].label}
              </Title>
              <Box>
                {leftToolbarIcons[activeLeftPanel].content}
              </Box>
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
    </AppShell>
  );
}
