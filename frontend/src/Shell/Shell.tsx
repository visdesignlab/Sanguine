import { ReactNode, useMemo, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, Tabs, ActionIcon, Title, Flex,
  Container,
  Menu,
  Box,
  Text,
} from '@mantine/core';
import {
  IconDatabase, IconSettings, IconFilter, IconBook, IconTrash, IconArrowNarrowLeftDashed, IconArrowNarrowRightDashed, IconDeviceFloppy, IconCamera, IconLogout, IconDotsVertical,
  IconMenu,
  IconRestore,
} from '@tabler/icons-react';
import { ExploreView } from '../Components/Views/ExploreView/ExploreView';
import { ProvidersView } from '../Components/Views/ProvidersView/ProvidersView';
import { PBMDashboard } from '../Components/Views/PBMDashboard/PBMDashboard';

import classes from './Shell.module.css';

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export function Shell() {
  // View tabs names
  const DASHBOARD_TAB = 'Dashboard';
  const PROVIDERS_TAB = 'Providers';
  const EXPLORE_TAB = 'Explore';

  // Active tab in the view tabs
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  // Open and close the left toolbar, burger toggle visible on hover.
  const [leftToolbarOpened, { toggle: toggleLeftToolbar }] = useDisclosure(true);

  // Width of the header toolbar & left toolbar
  const TOOLBARS_WIDTH = 60;

  // Left toolbar icons
  const leftToolbarIcons: { icon: React.ComponentType<{ size?: string | number }>; label: string, content: ReactNode }[] = [
    { icon: IconFilter, label: 'Filter Panel', content: <Text>Filter panel content</Text> },
    { icon: IconSettings, label: 'Settings', content: <Text>Settings content</Text> },
    { icon: IconDatabase, label: 'Database', content: <Text>Database content</Text> },
    { icon: IconBook, label: 'Book', content: <Text>Book content</Text> },
  ];
  const [active, setActive] = useState<number | null>(null);
  const navbarWidth = useMemo(() => (active === null ? TOOLBARS_WIDTH : 6 * TOOLBARS_WIDTH), [active]);

  // Header toolbar icons
  const headerIcons: { icon: React.ComponentType<{ size?: string | number }>; label: string }[] = [
    { icon: IconTrash, label: 'Delete' },
    { icon: IconArrowNarrowLeftDashed, label: 'Back' },
    { icon: IconArrowNarrowRightDashed, label: 'Forward' },
    { icon: IconDeviceFloppy, label: 'Save' },
    { icon: IconCamera, label: 'Camera' },
  ];

  return (
    <AppShell
      header={{ height: TOOLBARS_WIDTH }}
      navbar={{
        width: navbarWidth,
        breakpoint: 0,
        collapsed: { desktop: !leftToolbarOpened },
      }}
      padding="md"
    >
      {/** Header Toolbar */}
      <AppShell.Header>
        <Group justify="space-between">
          <Group>
            {/** Left Toolbar Toggle Burger Icon */}
            <Flex justify="center" w={TOOLBARS_WIDTH}>
              <ActionIcon variant="subtle" color="grey" aria-label="Toggle Left Toolbar" size="lg">
                <IconMenu onClick={toggleLeftToolbar} />
              </ActionIcon>
            </Flex>
            {/** Intelvia Title */}
            <Title order={1}>Intelvia</Title>
            {/** View Tabs */}
            <Tabs
              variant="outline"
              value={activeTab}
              onChange={(value) => {
                if (value) setActiveTab(value);
              }}
              radius="md"
              defaultValue={DASHBOARD_TAB}
              styles={{
                tabLabel: {
                  marginTop: -4,
                },
              }}
              pl="lg"
            >
              <Tabs.List
                h={TOOLBARS_WIDTH}
                style={{
                  paddingTop: 10,
                }}
              >
                <Tabs.Tab value={DASHBOARD_TAB}>Dashboard</Tabs.Tab>
                <Tabs.Tab value={PROVIDERS_TAB}>Providers</Tabs.Tab>
                <Tabs.Tab value={EXPLORE_TAB}>Explore</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
          {/** Header Icons, right-aligned */}
          <Group gap="sm" pr="md">
            {headerIcons.map(({ icon: Icon, label }) => (
              <ActionIcon key={label} variant="subtle" color="grey" aria-label={label} size="lg">
                <Icon />
              </ActionIcon>
            ))}

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="grey" aria-label="more" size="lg">
                  <IconDotsVertical />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Application</Menu.Label>
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
          <Box h="100%" style={{ borderRight: active !== null ? '1px solid var(--mantine-color-gray-3)' : 'none' }}>
            <Group
              justify="center"
              w={TOOLBARS_WIDTH}
              pt="md"
            >
              {leftToolbarIcons.map(({ icon: Icon, label, content }, index) => (
                <ActionIcon
                  key={label}
                  variant="subtle"
                  color="grey"
                  aria-label={label}
                  size="lg"
                  onClick={() => (index === active ? setActive(null) : setActive(index))}
                  data-active={index === active}
                  className={classes.leftToolbarIcon}
                >
                  <Icon />
                </ActionIcon>
              ))}
            </Group>
          </Box>

          {/** Left Toolbar Content */}
          {active !== null && (
            <Box style={{ flexGrow: 1 }} p="md">
              <Title order={3}>
                {leftToolbarIcons[active].label}
              </Title>
              <Box>
                {leftToolbarIcons[active].content}
              </Box>
            </Box>
          )}
        </Flex>
      </AppShell.Navbar>
      {/** Main Area */}
      <AppShell.Main>
        <Container fluid>
          {activeTab === DASHBOARD_TAB && <PBMDashboard />}
          {activeTab === PROVIDERS_TAB && <ProvidersView />}
          {activeTab === EXPLORE_TAB && <ExploreView />}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
