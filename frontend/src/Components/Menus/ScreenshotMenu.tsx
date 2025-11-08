import { useRef, useState } from 'react';
import {
  Menu, ActionIcon, Tooltip, Box, Text, Checkbox, Modal, Button, Stack, Group, Badge,
  Title,
} from '@mantine/core';
import {
  IconCamera, IconMail, IconMenu4, IconTrash, IconDownload,
} from '@tabler/icons-react';
import * as htmlToImage from 'html-to-image';
import { useThemeConstants } from '../../Theme/mantineTheme';
import classes from '../../Shell/Shell.module.css';

/**
 * ScreenshotMenu - Menu for capturing, viewing, sharing,
 * downloading and deleting screenshots.
 */
export function ScreenshotMenu({ activeTab }: { activeTab: string }) {
  const { iconStroke } = useThemeConstants();

  const [screenshotsMenuOpened, setScreenshotsMenuOpened] = useState(false);
  const [screenshots, setScreenshots] = useState<{ id: string; dataUrl: string; tab: string; ts: string; filename: string }[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<Set<string>>(new Set());
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [hoveredPreview, setHoveredPreview] = useState<{ id: string; src: string; top: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectAll = useRef<HTMLInputElement | null>(null);

  const buildScreenshotFilename = (tab?: string) => {
    const tabName = tab || activeTab || 'dashboard';
    const ts = new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');
    return `intelvia-${tabName}-view-${ts}.png`;
  };

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
  const toggleSelectAll = () => {
    if (screenshots.length === 0) return;
    if (selectedScreenshotIds.size === screenshots.length) {
      clearSelections();
    } else {
      setSelectedScreenshotIds(new Set(screenshots.map((s) => s.id)));
    }
  };

  const captureScreenshot = async () => {
    const htmlEl = document.documentElement;
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
      const blobs = await Promise.all(items.map(async (it) => {
        const res = await fetch(it.dataUrl);
        if (!res.ok) throw new Error('Failed to convert screenshot URL to blob');
        const blob = await res.blob();
        return {
          blob,
          filename: it.filename || buildScreenshotFilename(),
        };
      }));

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

  const emailSelectedScreenshots = async () => {
    const toEmail = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    if (toEmail.length === 0) return;
    await emailScreenshot(toEmail.map((s) => ({ dataUrl: s.dataUrl, filename: s.filename })));
  };

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const openDeleteModalForSelected = () => {
    if (selectedScreenshotIds.size === 0) return;
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
    setSelectionMode(false);
    setDeleteTargetIds([]);
    setDeleteModalOpened(false);
  };

  const downloadSelectedScreenshots = () => {
    const toDownload = screenshots.filter((s) => selectedScreenshotIds.has(s.id));
    toDownload.forEach((s) => downloadScreenshot(s.dataUrl, s.filename));
  };

  return (
    <>
      <Menu
        shadow="md"
        width={280}
        trigger="hover"
        closeDelay={200}
        offset={12}
        opened={screenshotsMenuOpened}
        onOpen={() => setScreenshotsMenuOpened(true)}
        onClose={() => {
          if (sharingInProgress) return;
          setScreenshotsMenuOpened(false);
        }}
      >
        <Menu.Target>
          <Tooltip label="Screenshot" position="left">
            <ActionIcon aria-label="Camera" onClick={captureScreenshot}>
              <IconCamera stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown hide-menu-from-screenshot="true">
          <Box style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px',
          }}
          >
            <Box className={classes.menuLabelNoMargin}>Screenshots</Box>
            <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

          <Box
            ref={dropdownRef}
            style={{ position: 'relative', overflow: 'visible' }}
            onMouseLeave={() => setHoveredPreview(null)}
          >
            <Box style={{ maxHeight: 240, overflow: 'auto' }}>
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
                    <Text size="xs">{new Date(s.ts).toLocaleString()}</Text>
                  </Box>
                </Menu.Item>
              ))}
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

      {/* Delete Confirmation Modal */}
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
    </>
  );
}
