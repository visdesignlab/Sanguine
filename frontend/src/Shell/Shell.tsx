import {
  ReactNode, useContext, useMemo, useState, useRef,
} from 'react';
import { useDisclosure } from '@mantine/hooks';
import {
  AppShell, Group, Tabs, ActionIcon, Title, Flex, Container, Menu, Box, Text, Tooltip,
  Modal,
  Button,
  Stack,
  Badge,
  Checkbox,
} from '@mantine/core';
import {
  IconDatabase, IconBook,
  IconArrowNarrowLeftDashed,
  IconArrowNarrowRightDashed, IconDeviceFloppy,
  IconCamera, IconLogout, IconUser, IconMenu,
  IconRestore, type IconProps,
  IconChartBar,
  IconClipboardList,
  IconDownload, IconMail, IconMenu4, IconTrash,
} from '@tabler/icons-react';
import * as htmlToImage from 'html-to-image';
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

/** *
 * Shell component that provides the main layout for the application.
 * Includes a header toolbar (Intelvia), left toolbar, and main content area.
 */
export function Shell() {
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
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Reset to defaults modal ----------------------
  const [resetModalOpened, setResetModalOpened] = useState(false);
  // Delete confirmation modal state
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const handleConfirmReset = () => {
    // Reset filters (add other reset logic as needed)
    store.filtersStore.resetAllFilters();
    setResetModalOpened(false);
  };

  // Screenshots ----------------------
  const [screenshotsMenuOpened, setScreenshotsMenuOpened] = useState(false);
  const [screenshots, setScreenshots] = useState<{ id: string; dataUrl: string; tab: string; ts: string; filename: string }[]>([]);

  // Selection mode - select multiple screenshots
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<Set<string>>(new Set());

  // Toggle select a screenshot
  const toggleSelectionFor = (id: string) => {
    setSelectedScreenshotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelections = () => setSelectedScreenshotIds(new Set());
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) clearSelections();
      return next;
    });
  };

  // Select all screenshots checkbox
  const selectAll = useRef<HTMLInputElement | null>(null);
  const toggleSelectAll = () => {
    if (screenshots.length === 0) return;
    if (selectedScreenshotIds.size === screenshots.length) {
      clearSelections();
    } else {
      setSelectedScreenshotIds(new Set(screenshots.map((s) => s.id)));
    }
  };
  // Sharing in progress flag to keep menu open
  const [sharingInProgress, setSharingInProgress] = useState(false);

  // Preview images
  const [hoveredPreview, setHoveredPreview] = useState<{ id: string; src: string; top: number } | null>(null);

  // Floating preview state + refs for dropdown
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Screenshot filename
  const buildScreenshotFilename = (tab?: string) => {
    const tabName = tab || activeTab || 'dashboard';
    const ts = new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');
    return `intelvia-${tabName}-view-${ts}.png`;
  };

  // Capture screenshot of webpage
  const captureScreenshot = async () => {
    const htmlEl = document.documentElement;
    // Exclude unwanted elements from screenshot
    const filter = (node: Node) => {
      try {
        if (!(node instanceof Element)) return true;
        if (node.closest('[hide-menu-from-screenshot]')) return false;
        return true;
      } catch {
        return true;
      }
    };
    try {
      // Create png
      const dataUrl = await htmlToImage.toPng(
        htmlEl,
        {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          filter,
          width: htmlEl.scrollWidth,
          height: htmlEl.scrollHeight,
        },
      );
      // Store screenshot
      const item = {
        id: new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-'),
        dataUrl,
        tab: activeTab,
        ts: new Date().toISOString(),
        filename: buildScreenshotFilename(activeTab),
      };
      setScreenshots((prev) => [item, ...prev]);
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  const downloadScreenshot = (dataUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || buildScreenshotFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const emailScreenshot = async (
    items: { dataUrl: string; filename?: string }[],
  ) => {
    setSharingInProgress(true);
    try {
      if (!items || items.length === 0) return;
      // Convert all data URLs to blobs in parallel
      const blobs = await Promise.all(items.map(async (it) => {
        const res = await fetch(it.dataUrl);
        if (!res.ok) throw new Error('Failed to convert screenshot URL to blob');
        const blob = await res.blob();
        return {
          blob,
          filename: it.filename || buildScreenshotFilename(),
        };
      }));

      // Share using Web Share API
      const files = blobs.map(({ blob, filename: fname }) => new File([blob], fname, { type: blob.type || 'image/png' }));
      const nav = navigator as Navigator;
      if (nav.share) {
        await nav.share({
          files,
          text: 'Screenshots from Intelvia - Patient Blood Management Analytics:\n\n',
        });
      } else {
        console.warn('Web Share API not available or cannot share files');
      }
    } catch (err) {
      console.warn('emailScreenshot failed or unsupported', err);
    } finally {
      setSharingInProgress(false);
    }
  };

  // Email currently selected screenshots
  const emailSelectedScreenshots = async () => {
    const toEmail = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    if (toEmail.length === 0) return;
    await emailScreenshot(toEmail.map((s) => ({ dataUrl: s.dataUrl, filename: s.filename })));
  };

  // Open delete confirmation modal for currently selected screenshots
  const openDeleteModalForSelected = () => {
    if (selectedScreenshotIds.size === 0) return;
    setDeleteTargetIds(Array.from(selectedScreenshotIds));
    setDeleteModalOpened(true);
  };

  // Perform deletion after user confirms
  const confirmDeleteSelected = () => {
    if (deleteTargetIds.length === 0) {
      setDeleteModalOpened(false);
      return;
    }
    setScreenshots((prev) => prev.filter((s) => !deleteTargetIds.includes(s.id)));
    clearSelections();
    setSelectionMode(false);
    setDeleteTargetIds([]);
    setDeleteModalOpened(false);
  };

  // Download selected screenshots
  const downloadSelectedScreenshots = () => {
    const toDownload = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    toDownload.forEach((s) => downloadScreenshot(s.dataUrl, s.filename));
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

  // Header toolbar icons
  const headerIcons: { icon: React.ComponentType<IconProps>; label: string; onClick?: () => void }[] = [
    { icon: IconArrowNarrowLeftDashed, label: 'Back' },
    { icon: IconArrowNarrowRightDashed, label: 'Forward' },
    { icon: IconDeviceFloppy, label: 'Save' },
    { icon: IconCamera, label: 'Camera', onClick: captureScreenshot },
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
          <Group gap="sm" pr="md" wrap="nowrap">
            {headerIcons.map(({ icon: Icon, label, onClick }) => {
              // --- Hover Menu for Camera to show screenshots ---
              if (label === 'Camera') {
                return (
                  <Menu
                    key={label}
                    shadow="md"
                    width={280}
                    trigger="hover"
                    closeDelay={200}
                    offset={12}
                    opened={screenshotsMenuOpened}
                    onOpen={() => setScreenshotsMenuOpened(true)}
                    onClose={() => {
                      // prevent closing the menu when a native share sheet is in progress
                      if (sharingInProgress) return;
                      setScreenshotsMenuOpened(false);
                    }}
                  >
                    {/** Screenshot Capture Button */}
                    <Menu.Target>
                      <Tooltip label="Screenshot" position="left">
                        <ActionIcon aria-label={label} onClick={onClick}>
                          <Icon stroke={iconStroke} />
                        </ActionIcon>
                      </Tooltip>
                    </Menu.Target>
                    {/** Screenshots Menu */}
                    <Menu.Dropdown hide-menu-from-screenshot="true">
                      {/** Screenshots Menu Header */}
                      <Box style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px',
                      }}
                      >
                        <Menu.Label className={classes.menuLabelNoMargin}>Screenshots</Menu.Label>
                        <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {/** Delete, Download, Email Buttons */}
                          {selectionMode && selectedScreenshotIds.size !== 0 && (
                          <>
                            <ActionIcon
                              size="xs"
                              variant="transparent"
                              className={classes.leftToolbarIcon}
                              onClick={(e) => { e.stopPropagation(); openDeleteModalForSelected(); }}
                              aria-label="Delete selected screenshots"
                            >
                              <IconTrash stroke={iconStroke} size={18} />
                            </ActionIcon>
                            <ActionIcon
                              size="xs"
                              variant="transparent"
                              className={classes.leftToolbarIcon}
                              onClick={(e) => { e.stopPropagation(); downloadSelectedScreenshots(); }}
                              aria-label="Download selected screenshots"
                            >
                              <IconDownload stroke={iconStroke} size={18} />
                            </ActionIcon>
                            <ActionIcon
                              size="xs"
                              variant="transparent"
                              className={classes.leftToolbarIcon}
                              onClick={(e) => { e.stopPropagation(); emailSelectedScreenshots(); }}
                              aria-label="Email selected screenshots"
                            >
                              <IconMail stroke={iconStroke} size={18} />
                            </ActionIcon>
                          </>
                          )}
                          { /* Selection mode toggle (Select multiple screenshots) */}
                          <ActionIcon
                            size="xs"
                            variant="transparent"
                            className={`${classes.leftToolbarIcon} ${selectionMode ? classes.selected : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectionMode();
                              (e.currentTarget as HTMLElement).blur();
                            }}
                            aria-label="Toggle selection mode"
                            data-active={selectionMode ? 'true' : 'false'}
                            disabled={screenshots.length === 0}
                          >
                            <IconMenu4 stroke={iconStroke} size={18} />
                          </ActionIcon>
                        </Box>
                      </Box>
                      {/* Dropdown list of screenshots */}
                      <Box
                        ref={dropdownRef}
                        style={{ position: 'relative', overflow: 'visible' }}
                        onMouseLeave={() => setHoveredPreview(null)}
                      >
                        {/** Scrollable */}
                        <Box
                          style={{ maxHeight: 240, overflow: 'auto' }}
                        >
                          {/* 'Select All' Screenshots */}
                          {selectionMode && screenshots.length > 1 && (
                          <Box
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSelectAll();
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--mantine-color-gray-2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: 'pointer',
                            }}
                            aria-label="Select all screenshots"
                          >
                            <Checkbox
                              ref={selectAll}
                              checked={selectedScreenshotIds.size === screenshots.length && screenshots.length > 0}
                              onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                              onClick={(e) => e.stopPropagation()}
                              aria-hidden={false}
                              aria-label="Select all screenshots checkbox"
                              size="xs"
                            />
                            {' '}
                            <Text size="sm">All</Text>
                          </Box>
                          )}
                          { /* List of screenshots */}
                          {screenshots.length === 0 ? (
                            <Menu.Item disabled>No screenshots</Menu.Item>
                          ) : screenshots.map((s) => (
                            <Menu.Item
                              key={s.id}
                              closeMenuOnClick={false}
                              onClick={(e) => {
                                if (selectionMode) { e.stopPropagation(); toggleSelectionFor(s.id); } else { downloadScreenshot(s.dataUrl, s.filename); }
                              }}
                              onMouseEnter={(e) => {
                                // Find screenshot elements
                                const itemEl = e.currentTarget as HTMLElement;
                                const dropdownEl = dropdownRef.current;
                                const itemRect = itemEl.getBoundingClientRect();
                                if (!dropdownEl) {
                                  const centerTopFallback = itemRect.height / 2;
                                  setHoveredPreview({ id: s.id, src: s.dataUrl, top: centerTopFallback });
                                  return;
                                }
                                const dropdownRect = dropdownEl.getBoundingClientRect();
                                const centerTop = (itemRect.top - dropdownRect.top) + (itemRect.height / 2);
                                setHoveredPreview({ id: s.id, src: s.dataUrl, top: centerTop });
                              }}
                              onMouseLeave={() => {
                                setHoveredPreview(null);
                              }}
                              style={{ display: 'block', padding: '8px 12px' }}
                            >
                              <Box style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <Box style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                }}
                                >
                                  <Box style={{
                                    display: 'flex', gap: 8, alignItems: 'center', flex: 1,
                                  }}
                                  >
                                    {selectionMode && (
                                    <Checkbox
                                      checked={selectedScreenshotIds.has(s.id)}
                                      onChange={(ev) => { ev.stopPropagation(); toggleSelectionFor(s.id); }}
                                      onClick={(ev) => ev.stopPropagation()}
                                      aria-label={`Select screenshot ${s.id}`}
                                      size="xs"
                                    />
                                    )}
                                    <Text size="sm" style={{ textAlign: 'left' }}>
                                      {s.tab}
                                      {' '}
                                      View
                                    </Text>
                                  </Box>
                                  <Box style={{ display: 'flex', gap: 6 }}>
                                    {!selectionMode && (
                                    <ActionIcon
                                      size="xs"
                                      variant="transparent"
                                      className={`${classes.leftToolbarIcon} ${selectionMode ? classes.selected : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        (e.currentTarget as HTMLElement).blur();
                                        if (selectionMode) {
                                          toggleSelectionFor(s.id);
                                          return;
                                        }
                                        emailScreenshot([{ dataUrl: s.dataUrl, filename: s.filename }]);
                                      }}
                                      aria-label="Email screenshot"
                                      data-active={selectionMode ? 'true' : 'false'}
                                      aria-pressed={selectionMode}
                                    >
                                      <IconMail stroke={iconStroke} size={18} />
                                    </ActionIcon>
                                    )}
                                  </Box>
                                </Box>
                                <Text size="xs" color="dimmed">{new Date(s.ts).toLocaleString()}</Text>
                              </Box>
                            </Menu.Item>
                          ))}
                          {/* Screenshot preview */}
                          {hoveredPreview && (
                          <Box
                            className={classes.screenshotPreview}
                            hide-menu-from-screenshot="true"
                            style={{
                              position: 'absolute',
                              right: 'calc(100% + 8px)',
                              top: hoveredPreview.top,
                              transform: 'translateY(-50%)',
                              width: 220,
                            }}
                          >
                            <img src={hoveredPreview.src} alt="screenshot preview" />
                          </Box>
                          )}
                        </Box>
                      </Box>
                    </Menu.Dropdown>
                  </Menu>
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
      {/** Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => { setDeleteModalOpened(false); setDeleteTargetIds([]); }}
        title={(
          <Group align="center">
            <Title order={3}>Confirm Screenshot Deletion</Title>
            <Badge size="sm" variant="light" color="black">{deleteTargetIds.length}</Badge>
          </Group>
       )}
        centered
        styles={{
          body: { padding: '8px 12px' },
        }}
      >
        <Stack gap="md">
          { /* List of screenshots to be deleted */ }
          <Box style={{ maxHeight: 200, overflow: 'auto' }}>
            {deleteTargetIds.map((id) => {
              const s = screenshots.find((ss) => ss.id === id);
              return (
                <Box
                  key={id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '8px 6px',
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {s ? `${s.tab} View` : id}
                  </Text>
                  {s && <Text size="xs">{new Date(s.ts).toLocaleString()}</Text>}
                </Box>
              );
            })}
          </Box>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => { setDeleteModalOpened(false); setDeleteTargetIds([]); }}>Cancel</Button>
            <Button color="red" onClick={confirmDeleteSelected}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
