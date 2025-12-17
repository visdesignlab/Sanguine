import { useRef, useState } from 'react';
import {
  Menu, ActionIcon, Tooltip, Box, Text, Checkbox, Modal, Button, Stack, Group, Badge,
  Title,
} from '@mantine/core';
import {
  IconCamera, IconMail, IconSquareCheck, IconTrash, IconDownload,
} from '@tabler/icons-react';
import {
  buildScreenshotFilename,
  captureScreenshot as utilCaptureScreenshot,
  downloadDataUrl,
  dataUrlToFile,
  shareFiles,
  type ScreenshotItem,
} from '../../Utils/screenshotUtils';
import { useThemeConstants } from '../../Theme/mantineTheme';
import classes from '../../Shell/Shell.module.css';

/**
 * ScreenshotMenu - Menu for capturing, viewing, sharing,
 * downloading and deleting screenshots.
 * Props:
 * - activeTab: string - name of currently active tab/view, for filename purposes.
 */
export function ScreenshotMenu({ activeTab }: { activeTab: string }) {
  const { iconStroke } = useThemeConstants();

  const [screenshotsMenuOpened, setScreenshotsMenuOpened] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<Set<string>>(new Set());
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [hoveredPreview, setHoveredPreview] = useState<{ id: string; src: string; top: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectAll = useRef<HTMLInputElement | null>(null);

  const screenshotID = () => new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');

  // Create Screenshot ---
  const captureScreenshot = async () => {
    try {
      const dataUrl = await utilCaptureScreenshot(document.documentElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        hideSelector: '[hide-menu-from-screenshot]',
      });
      const item: ScreenshotItem = {
        id: screenshotID(),
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

  // Select multiple screenshots
  const toggleSelectionFor = (id: string) => {
    setSelectedScreenshotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const clearSelections = () => setSelectedScreenshotIds(new Set());
  const toggleSelectAll = () => {
    if (screenshots.length === 0) {
      return;
    }
    if (selectedScreenshotIds.size === screenshots.length) {
      clearSelections();
    } else {
      setSelectedScreenshotIds(new Set(screenshots.map((s) => s.id)));
    }
  };

  // Download / Email Individual Screenshots ---
  const downloadScreenshot = (dataUrl: string, filename?: string) => {
    downloadDataUrl(dataUrl, filename || buildScreenshotFilename(activeTab));
  };

  const emailScreenshot = async (
    items: { dataUrl: string; filename?: string }[],
  ) => {
    setSharingInProgress(true);
    try {
      if (!items || items.length === 0) {
        return;
      }
      const files = await Promise.all(items.map(async (it) => dataUrlToFile(it.dataUrl, it.filename || buildScreenshotFilename(activeTab))));
      await shareFiles(files, 'Screenshots from Intelvia - Patient Blood Management Analytics:\n\n');
    } catch (err) {
      console.warn('emailScreenshot failed or unsupported', err);
    } finally {
      setSharingInProgress(false);
    }
  };

  // Download / Email Selected Screenshots ---
  const emailSelectedScreenshots = async () => {
    const toEmail = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    if (toEmail.length === 0) {
      return;
    }
    await emailScreenshot(toEmail.map((s) => ({ dataUrl: s.dataUrl, filename: s.filename })));
  };

  const downloadSelectedScreenshots = () => {
    const toDownload = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    toDownload.forEach((s) => downloadScreenshot(s.dataUrl, s.filename));
  };

  // Delete Screenshots Modal ---
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const openDeleteModalForSelected = () => {
    if (selectedScreenshotIds.size === 0) {
      return;
    }
    setDeleteTargetIds(Array.from(selectedScreenshotIds));
    setDeleteModalOpened(true);
  };
  const confirmDeleteSelected = () => {
    if (deleteTargetIds.length === 0) {
      setDeleteModalOpened(false);
      return;
    }
    setScreenshots((prev) => prev.filter((s) => !deleteTargetIds.includes(s.id)));
    clearSelections();
    setIsMultiSelecting(false);
    setDeleteTargetIds([]);
    setDeleteModalOpened(false);
  };

  return (
    <>
      <Menu
        shadow="md"
        width={280}
        trigger="hover"
        offset={12}
        opened={screenshotsMenuOpened}
        onOpen={() => setScreenshotsMenuOpened(true)}
        onClose={() => {
          if (sharingInProgress) {
            return;
          }
          setScreenshotsMenuOpened(false);
        }}
      >
        {/* Camera Icon: Capture Screenshot Button */}
        <Menu.Target>
          <Tooltip label="Screenshot" position="left">
            <ActionIcon aria-label="Camera" onClick={captureScreenshot}>
              <IconCamera stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        {/* Screenshot Menu */}
        <Menu.Dropdown hide-menu-from-screenshot="true">
          <Box style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px',
          }}
          >
            <Group gap={8} align="center">
              {/* Select All Checkbox - only visible in multi-select mode */}
              {isMultiSelecting && screenshots.length > 1 && (
                <Checkbox
                  ref={selectAll}
                  checked={selectedScreenshotIds.size === screenshots.length && screenshots.length > 0}
                  onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select all screenshots checkbox"
                  size="xs"
                  mr={16}
                  indeterminate={selectedScreenshotIds.size > 0 && selectedScreenshotIds.size < screenshots.length}
                />
              )}
              <Menu.Label className={classes.menuLabelNoMargin} onClick={(e) => { e.stopPropagation(); }}>Screenshots</Menu.Label>
            </Group>
            {' '}
            <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Delete / Download / Email Selected Screenshots */}
              {isMultiSelecting && selectedScreenshotIds.size !== 0 && (
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
              {/* Toggle to Select Multiple Screenshots */}
              <ActionIcon
                size="xs"
                variant="transparent"
                className={`${classes.leftToolbarIcon} ${isMultiSelecting ? classes.selected : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMultiSelecting((prev) => {
                    const next = !prev;
                    if (!next) clearSelections();
                    return next;
                  });
                  (e.currentTarget as HTMLElement).blur();
                }}
                aria-label="Toggle multi-selection of images"
                data-active={isMultiSelecting ? 'true' : 'false'}
                disabled={screenshots.length === 0}
              >
                <IconSquareCheck stroke={iconStroke} size={18} />
              </ActionIcon>
            </Box>
          </Box>
          {/* Screenshot Items List */}
          <Box
            ref={dropdownRef}
            style={{ position: 'relative', overflow: 'visible' }}
            onMouseLeave={() => setHoveredPreview(null)}
          >
            <Box style={{ maxHeight: 240, overflow: 'auto' }}>
              {/* Screenshot Items */}
              {screenshots.length === 0 ? (
                <Menu.Item disabled>No screenshots</Menu.Item>
              ) : screenshots.map((s) => {
                const ts = new Date(s.ts).toLocaleString();

                const handleScreenshotClick = (e: React.MouseEvent) => {
                  if (isMultiSelecting) {
                    e.stopPropagation();
                    toggleSelectionFor(s.id);
                  } else {
                    downloadScreenshot(s.dataUrl, s.filename);
                  }
                };

                const handleSetPreview = (e: React.MouseEvent) => {
                  const itemEl = e.currentTarget as HTMLElement;
                  const dropdownEl = dropdownRef.current;
                  if (!dropdownEl) {
                    return;
                  }
                  const itemRect = itemEl.getBoundingClientRect();
                  const dropdownRect = dropdownEl.getBoundingClientRect();
                  const centerTop = (itemRect.top - dropdownRect.top) + (itemRect.height / 2);
                  setHoveredPreview({ id: s.id, src: s.dataUrl, top: centerTop });
                };

                return (
                  <Menu.Item
                    key={s.id}
                    closeMenuOnClick={false}
                    onClick={handleScreenshotClick}
                    onMouseEnter={handleSetPreview}
                    onMouseLeave={() => setHoveredPreview(null)}
                    style={{ display: 'block', padding: '12px 12px' }}
                  >
                    <Group align="center" style={{ width: '100%' }}>
                      <Group align="center" style={{ flex: 1, minHeight: 36 }}>
                        {/** Add checkbox in multi-select mode */}
                        {isMultiSelecting && (
                          <Checkbox
                            checked={selectedScreenshotIds.has(s.id)}
                            onChange={(ev) => { ev.stopPropagation(); toggleSelectionFor(s.id); }}
                            onClick={(ev) => ev.stopPropagation()}
                            aria-label={`Select screenshot ${s.id}`}
                            size="xs"
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text size="sm" style={{ lineHeight: 1.2 }}>
                            {s.tab}
                            {' '}
                            View
                          </Text>
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>{ts}</Text>
                        </Stack>
                      </Group>
                      {/** Add share icon when not multi-selecting */}
                      {!isMultiSelecting && (
                        <ActionIcon
                          size="xs"
                          variant="transparent"
                          className={`${classes.leftToolbarIcon} ${isMultiSelecting ? classes.selected : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            (e.currentTarget as HTMLElement).blur();
                            emailScreenshot([{ dataUrl: s.dataUrl, filename: s.filename }]);
                          }}
                          aria-label="Email screenshot"
                          style={{ marginTop: 2 }}
                        >
                          <IconMail stroke={iconStroke} size={18} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Menu.Item>
                );
              })}
              {/** Screenshot Preview */}
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
                    border: selectedScreenshotIds.has(hoveredPreview.id)
                      ? '3px solid var(--mantine-color-blue-6)'
                      : '1px solid var(--mantine-color-gray-2)',
                  }}
                >
                  <img src={hoveredPreview.src} alt="screenshot preview" />
                </Box>
              )}
            </Box>
          </Box>
        </Menu.Dropdown>
      </Menu >

      {/* Delete Confirmation Modal */}
      < Modal
        opened={deleteModalOpened}
        onClose={() => { setDeleteModalOpened(false); setDeleteTargetIds([]); }
        }
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
          {/** List of screenshots to be deleted */}
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
                  {s && <Text size="xs" c="dimmed">{new Date(s.ts).toLocaleString()}</Text>}
                </Box>
              );
            })}
          </Box>
          {/** Cancel or Delete */}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => { setDeleteModalOpened(false); setDeleteTargetIds([]); }}>Cancel</Button>
            <Button color="red" onClick={confirmDeleteSelected}>Delete</Button>
          </Group>
        </Stack>
      </Modal >
    </>
  );
}
