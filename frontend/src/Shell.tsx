import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, ScrollArea, Tabs, ActionIcon, Title,
} from '@mantine/core';
import { PiBookOpenLight, PiDotsThreeOutlineVerticalThin } from 'react-icons/pi';
import {
  CiFilter, CiSettings, CiDatabase, CiMenuBurger, CiTrash, CiLogout, CiCamera, CiSaveDown2,
} from 'react-icons/ci';
import { IoIosArrowRoundBack, IoIosArrowRoundForward } from 'react-icons/io';
import { ExploreView } from './Components/Views/ExploreView';
import { ProvidersView } from './Components/Views/ProvidersView';
import { PBMDashboard } from './Components/Views/PBMDashboard';

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
  const [burgerHovered, setBurgerHovered] = useState(false);
  const [leftToolbarHovered, setleftToolbarHovered] = useState(false);
  const showBurger = burgerHovered || leftToolbarHovered;

  // Width of the header toolbar & left toolbar
  const TOOLBARS_WIDTH = 60;

  // Size of icons
  const ICON_SIZE_NUM = 24;

  // Left toolbar icons
  const leftToolbarIcons: { icon: any; label: string }[] = [
    { icon: CiDatabase, label: 'Database' },
    { icon: CiSettings, label: 'Settings' },
    { icon: CiFilter, label: 'Filter' },
    { icon: PiBookOpenLight, label: 'Book' },
  ];

  // Header toolbar icons
  const headerIcons: { icon: any; label: string }[] = [
    { icon: CiTrash, label: 'Delete' },
    { icon: IoIosArrowRoundBack, label: 'Back' },
    { icon: IoIosArrowRoundForward, label: 'Forward' },
    { icon: CiSaveDown2, label: 'Save' },
    { icon: CiCamera, label: 'Camera' },
    { icon: CiLogout, label: 'Logout' },
    { icon: PiDotsThreeOutlineVerticalThin, label: 'Info' },
  ];

  return (
    <AppShell
      header={{ height: TOOLBARS_WIDTH }}
      navbar={{
        width: TOOLBARS_WIDTH,
        breakpoint: 'sm',
        collapsed: { desktop: !leftToolbarOpened },
      }}
    >
      {/** Header Toolbar */}
      <AppShell.Header>
        <Group h="100%" justify="space-between" style={{ width: '100%' }}>
          {/** Left Toolbar Toggle Burger Icon */}
          <div
            onMouseEnter={() => setBurgerHovered(true)}
            onMouseLeave={() => setBurgerHovered(false)}
            style={{
              width: TOOLBARS_WIDTH,
              transition: 'opacity 0.2s',
              opacity: showBurger ? 1 : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActionIcon variant="subtle" color="grey" aria-label="Toggle Left Toolbar" size={ICON_SIZE_NUM}>
              <CiMenuBurger size={ICON_SIZE_NUM - 5} onClick={toggleLeftToolbar} />
            </ActionIcon>
          </div>
          {/** Intelvia Title */}
          <Title order={1} fs="italic">Intelvia</Title>
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
                position: 'relative',
                top: '-4px',
              },
            }}
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
          {/** Header Icons, right-aligned */}
          <Group gap="lg" ml="auto">
            {headerIcons.map(({ icon: Icon, label }) => (
              <ActionIcon key={label} variant="subtle" color="grey" aria-label={label} size={ICON_SIZE_NUM}>
                <Icon size={ICON_SIZE_NUM} />
              </ActionIcon>
            ))}
          </Group>
        </Group>
      </AppShell.Header>
      {/** Left Toolbar */}
      <AppShell.Navbar
        p="lg"
        onMouseEnter={() => setleftToolbarHovered(true)}
        onMouseLeave={() => setleftToolbarHovered(false)}
      >
        {/** Left Toolbar Icons */}
        <Group
          justify="center"
        >
          {leftToolbarIcons.map(({ icon: Icon, label }) => (
            <ActionIcon key={label} variant="subtle" color="grey" aria-label={label} size={ICON_SIZE_NUM}>
              <Icon size={ICON_SIZE_NUM} />
            </ActionIcon>
          ))}
        </Group>
      </AppShell.Navbar>
      {/** Main Area */}
      <AppShell.Main>
        <ScrollArea>
          {activeTab === DASHBOARD_TAB && <PBMDashboard />}
          {activeTab === PROVIDERS_TAB && <ProvidersView />}
          {activeTab === EXPLORE_TAB && <ExploreView />}
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}
