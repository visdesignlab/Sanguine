import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, ScrollArea, Tabs, ActionIcon, Title, Flex,
  Container,
} from '@mantine/core';
import {
  IconDatabase, IconSettings, IconFilter, IconBook, IconTrash, IconArrowNarrowLeftDashed, IconArrowNarrowRightDashed, IconDeviceFloppy, IconCamera, IconLogout, IconDotsVertical,
  IconMenu,
} from '@tabler/icons-react';
import { ExploreView } from './Components/Views/ExploreView/ExploreView';
import { ProvidersView } from './Components/Views/ProvidersView/ProvidersView';
import { PBMDashboard } from './Components/Views/PBMDashboard/PBMDashboard';

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

  // Size of icons
  const ICON_SIZE = 24;

  // Left toolbar icons
  const leftToolbarIcons: { icon: React.ComponentType<{ size?: string | number }>; label: string }[] = [
    { icon: IconFilter, label: 'Filter' },
    { icon: IconSettings, label: 'Settings' },
    { icon: IconDatabase, label: 'Database' },
    { icon: IconBook, label: 'Book' },
  ];

  // Header toolbar icons
  const headerIcons: { icon: React.ComponentType<{ size?: string | number }>; label: string }[] = [
    { icon: IconTrash, label: 'Delete' },
    { icon: IconArrowNarrowLeftDashed, label: 'Back' },
    { icon: IconArrowNarrowRightDashed, label: 'Forward' },
    { icon: IconDeviceFloppy, label: 'Save' },
    { icon: IconCamera, label: 'Camera' },
    { icon: IconLogout, label: 'Logout' },
    { icon: IconDotsVertical, label: 'Info' },
  ];

  return (
    <AppShell
      header={{ height: TOOLBARS_WIDTH }}
      navbar={{
        width: TOOLBARS_WIDTH,
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
              <ActionIcon variant="subtle" color="grey" aria-label="Toggle Left Toolbar" size="xl">
                <IconMenu size={ICON_SIZE} onClick={toggleLeftToolbar} />
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
          </Group>
        </Group>
      </AppShell.Header>
      {/** Left Toolbar */}
      <AppShell.Navbar>
        {/** Left Toolbar Icons */}
        <Group justify="center" pt="md" w="100%">
          {leftToolbarIcons.map(({ icon: Icon, label }) => (
            <ActionIcon key={label} variant="subtle" color="grey" aria-label={label} size="lg">
              <Icon />
            </ActionIcon>
          ))}
        </Group>
      </AppShell.Navbar>
      {/** Main Area */}
      <AppShell.Main>
        <ScrollArea>
          <Container fluid>
            {activeTab === DASHBOARD_TAB && <PBMDashboard />}
            {activeTab === PROVIDERS_TAB && <ProvidersView />}
            {activeTab === EXPLORE_TAB && <ExploreView />}
          </Container>
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}
