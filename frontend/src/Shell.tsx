import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, ScrollArea, Tabs, ActionIcon, Title,
} from '@mantine/core';
import { PiBookOpenLight } from 'react-icons/pi';
import {
  CiFilter, CiSettings, CiDatabase, CiMenuBurger,
} from 'react-icons/ci';
import { useState } from 'react';

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export function Shell() {
  // Open and close the left toolbar, burger toggle visible on hover.
  const [leftToolbarOpened, { toggle: toggleLeftToolbar }] = useDisclosure(true);
  const [burgerHovered, setBurgerHovered] = useState(false);
  const [leftToolbarHovered, setleftToolbarHovered] = useState(false);
  const showBurger = burgerHovered || leftToolbarHovered;

  // Width of the header toolbar & left toolbar
  const TOOLBARS_WIDTH = 60;

  // Size of icons
  const ICON_SIZE_NUM = 24;

  // X offset of the left toolbar icons
  const LEFT_ICON_X_OFFSET = TOOLBARS_WIDTH / 2 - (ICON_SIZE_NUM / 2);

  // Left toolbar icons
  const leftToolbarIcons: { icon: any; label: string }[] = [
    { icon: CiDatabase, label: 'Database' },
    { icon: CiSettings, label: 'Settings' },
    { icon: CiFilter, label: 'Filter' },
    { icon: PiBookOpenLight, label: 'Book' },
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
        <Group h="100%" gap={LEFT_ICON_X_OFFSET} px={LEFT_ICON_X_OFFSET}>
          <div
            onMouseEnter={() => setBurgerHovered(true)}
            onMouseLeave={() => setBurgerHovered(false)}
            style={{
              transition: 'opacity 0.2s',
              opacity: showBurger ? 1 : 0,
              display: 'flex',
            }}
          >
            <ActionIcon variant="subtle" color="grey" aria-label="Toggle Left Toolbar" size={ICON_SIZE_NUM}>
              <CiMenuBurger size={ICON_SIZE_NUM} onClick={toggleLeftToolbar} />
            </ActionIcon>
          </div>
          <Title order={1} fs="italic">Intelvia</Title>
        </Group>
      </AppShell.Header>
      {/** Left Toolbar */}
      <AppShell.Navbar
        p="lg"
        onMouseEnter={() => setleftToolbarHovered(true)}
        onMouseLeave={() => setleftToolbarHovered(false)}
      >
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
        {/** View Tabs */}
        <Tabs variant="outline" defaultValue="PBM Dashboard">
          <Tabs.List>
            <Tabs.Tab value="PBM Dashboard">PBM Dashboard</Tabs.Tab>
            <Tabs.Tab value="Providers">Providers</Tabs.Tab>
            <Tabs.Tab value="Explore">Explore</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="PBM Dashboard">
            <ScrollArea h={400}>
              Main Dashboard Content
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="Providers">
            <ScrollArea h={400}>
              Providers content
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="Explore">
            <ScrollArea h={400}>
              Default States
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
}
