import { useState, useContext, useMemo } from 'react';
import {
  Menu,
  ActionIcon,
  Tooltip,
  Box,
  Text,
  Checkbox,
  Modal,
  Button,
  Stack,
  Group,
  Title,
  Image,
  ScrollArea,
  CloseButton,
  TextInput,
  Accordion,
} from '@mantine/core';
import {
  IconFolder,
  IconFolderPlus,
  IconFolderSearch,
  IconEdit,
  IconTrash,
  IconSquareCheck,
  IconCheck,
  IconX,
  IconChartBar,
  IconFilter,
  IconClick,
  IconSettings,
  IconChartScatter,
  IconShare,
  IconRestore,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { captureScreenshot } from '../../Utils/screenshotUtils';
import { useThemeConstants } from '../../Theme/mantineTheme';
import { getReadableName, formatValue } from '../../Utils/humanReadableColsVals';
import { formatTimestamp } from '../../Utils/dates';
import classes from '../../Shell/Shell.module.css';
import { Store, ApplicationState } from '../../Store/Store';
import {

  AGGREGATION_OPTIONS,
  DashboardChartConfig,
  ExploreChartConfig,
  Cost,
  DEFAULT_UNIT_COSTS,
} from '../../Types/application';

// Saved State Interface -----
interface SavedState {
  id: string;
  name?: string;
  screenshot?: string;
  timestamp: number;
}

// region Zoomed State Image
/**
 * Helper component for Zoomed State Image Modal (Large Image Preview)
 */
function ZoomedStateModal({
  opened, onClose, state, onPrev, onNext, hasPrev, hasNext,
}: {
  opened: boolean;
  onClose: () => void;
  state: SavedState | undefined;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  if (!state) return null;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90%"
      centered
      zIndex={2000}
      withCloseButton
      styles={{
        body: {
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, backgroundColor: 'transparent', position: 'relative',
        },
        content: { backgroundColor: 'transparent', boxShadow: 'none' },
        header: {
          backgroundColor: 'transparent', color: 'white', position: 'absolute', top: 0, right: 0, zIndex: 2001,
        },
      }}
    >
      <Stack
        align="center"
        justify="center"
        gap="xl"
        style={{ width: '100%', height: '100%', padding: '40px 0' }}
      >
        {/** Zoomed State Image Preview */}
        <Image
          src={state.screenshot}
          fit="contain"
          style={{
            maxHeight: '75vh', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', borderRadius: 8,
          }}
        />
        <Group gap="xl" align="center">
          {/** Previous Image Button */}
          <ActionIcon
            variant="filled"
            color="dark"
            size="xl"
            radius="xl"
            disabled={!hasPrev}
            style={{ opacity: hasPrev ? 1 : 0, cursor: hasPrev ? 'pointer' : 'default' }}
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <IconChevronLeft size={24} />
          </ActionIcon>
          {/** State Name and Timestamp */}
          <Stack gap={0} align="center">
            <Title order={3} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {state.name}
            </Title>
            <Text c="dimmed" size="sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {formatTimestamp(state.timestamp)}
            </Text>
          </Stack>
          {/** Next Image Button */}
          <ActionIcon
            variant="filled"
            color="dark"
            size="xl"
            radius="xl"
            disabled={!hasNext}
            style={{ opacity: hasNext ? 1 : 0, cursor: hasNext ? 'pointer' : 'default' }}
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <IconChevronRight size={24} />
          </ActionIcon>
        </Group>
      </Stack>
    </Modal>
  );
}

// endregion

// region State Details Display
/**
 * Retrieve and display the details of a saved state (filters, selections, dashboard, explore, settings)
 */
function StateDetails({ state }: { state: ApplicationState }) {
  const store = useContext(Store);
  const {
    filterValues, selections, dashboard, explore, settings,
  } = state;

  // Find State's Dashboard Charts
  const dashboardCharts = useMemo(() => {
    const items: string[] = [];
    if (dashboard?.chartConfigs) {
      dashboard.chartConfigs.forEach((config: DashboardChartConfig) => {
        const yLabel = getReadableName(config.yAxisVar);
        const xLabel = getReadableName(config.xAxisVar);
        const agg = AGGREGATION_OPTIONS[config.aggregation]?.label || config.aggregation;
        items.push(`Chart: ${agg} ${yLabel} by ${xLabel}`);
      });
    }
    if (dashboard?.statConfigs) {
      dashboard.statConfigs.forEach((config) => {
        items.push(`Stat: ${config.title}`);
      });
    }
    return items;
  }, [dashboard]);

  // Find State's Explore View Charts
  const exploreCharts = useMemo(() => {
    const items: string[] = [];
    if (explore?.chartConfigs) {
      explore.chartConfigs.forEach((config: ExploreChartConfig) => {
        const xLabel = getReadableName(config.xAxisVar);
        const yLabel = getReadableName(config.yAxisVar);
        items.push(`Chart: ${yLabel} vs ${xLabel}`);
      });
    }
    return items;
  }, [explore]);

  // Find State's Settings
  const activeSettings = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (settings?.unitCosts) {
      Object.entries(settings.unitCosts).forEach(([key, value]) => {
        const costKey = key as Cost;
        if (value !== DEFAULT_UNIT_COSTS[costKey]) {
          items.push({
            label: getReadableName(key),
            value: `$${value}`,
          });
        }
      });
    }
    return items;
  }, [settings]);

  // Find State's Filters
  const activeFilters = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (filterValues) {
      const initialValues = store.initialFilterValues;

      Object.entries(filterValues).forEach(([key, value]) => {
        if (value === null) return;

        // Check against initial values
        const initialValue = initialValues[key as keyof typeof initialValues];

        // Deep comparison for arrays (ranges)
        if (Array.isArray(value) && Array.isArray(initialValue)) {
          if (
            value.length === initialValue.length
            && value.every((v, i) => v === initialValue[i])
          ) {
            return; // Skip if matches initial
          }
        } else if (value instanceof Date && initialValue instanceof Date) {
          if (value.getTime() === initialValue.getTime()) {
            return; // Skip if matches initial
          }
        } else if (value === initialValue) {
          // Primitive comparison
          return; // Skip if matches initial
        }

        // Special case for date strings
        if (typeof value === 'string' && initialValue instanceof Date) {
          const dateVal = new Date(value);
          if (
            !Number.isNaN(dateVal.getTime())
            && dateVal.getTime() === initialValue.getTime()
          ) {
            return;
          }
        }

        items.push({
          label: getReadableName(key),
          value: formatValue(value),
        });
      });
    }
    return items;
  }, [filterValues, store.initialFilterValues]);

  // Find State's Selections
  const selectedItems = useMemo(
    () => selections?.selectedTimePeriods || [],
    [selections],
  );

  // Combine all sections into a config to allow iteration
  const sections = [
    {
      id: 'dashboard', content: dashboardCharts, icon: IconChartBar, color: 'blue', label: 'Dashboard',
    },
    {
      id: 'explore', content: exploreCharts, icon: IconChartScatter, color: 'grape', label: 'Explore View',
    },
    {
      id: 'filters', content: activeFilters, icon: IconFilter, color: 'orange', label: 'Filters', type: 'key-value',
    },
    {
      id: 'selections', content: selectedItems, icon: IconClick, color: 'green', label: 'Selections',
    },
    {
      id: 'settings', content: activeSettings, icon: IconSettings, color: 'gray', label: 'Settings', type: 'key-value',
    },
  ].filter((s) => s.content.length > 0);

  if (sections.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        No specific state details (default view).
      </Text>
    );
  }

  return (
    <Stack gap="xs" w="100%">
      {/** Accordion of state details (Dashboard, Explore, Filters, Selections, Settings) */}
      <Accordion variant="contained" radius="md" defaultValue={[]} multiple>
        {sections.map((section) => (
          <Accordion.Item value={section.id} key={section.id}>
            {/** Section Label */}
            <Accordion.Control icon={<section.icon size={16} color={`var(--mantine-color-${section.color}-6)`} />}>
              <Text size="sm" fw={500}>
                {section.label}
                {' '}
                (
                {section.content.length}
                )
              </Text>
            </Accordion.Control>
            {/** Section Content */}
            <Accordion.Panel>
              <ScrollArea.Autosize mah={150}>
                <Stack gap={4}>
                  {/** Key-Value Pairs of state details */}
                  {section.type === 'key-value' ? (
                    (section.content as { label: string, value: string }[]).map((item, i) => (
                      <Group key={i} justify="space-between" wrap="nowrap" align="flex-start">
                        <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                          {item.label}
                          :
                        </Text>
                        <Text size="xs" fw={500} style={{ flex: 1, textAlign: 'right' }}>
                          {item.value}
                        </Text>
                      </Group>
                    ))
                  ) : (
                    (section.content as string[]).map((item, i) => (
                      <Text key={i} size="xs" c="dimmed">
                        •
                        {item}
                      </Text>
                    ))
                  )}
                </Stack>
              </ScrollArea.Autosize>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}

// region Main - Saved States Menu

/**
 * SavedStatesMenu - Menu for saving, restoring, and deleting application states.
 */
export const SavedStatesMenu = observer(
  ({
    onSave: _onSave,
    onRestore: _onRestore,
    onReset,
  }: {
    onSave?: (screenshot?: string) => void;
    onRestore?: (id: string) => void;
    onReset?: () => void;
  }) => {
    const store = useContext(Store);
    const { iconStroke } = useThemeConstants();
    const { savedStates } = store;

    // Menu Opened -------
    const [menuOpened, setMenuOpened] = useState(false);

    // Save a State Modal -------
    const [saveModalOpened, setSaveModalOpened] = useState(false);
    const [stateName, setStateName] = useState('');

    // Manage Saved States Modal -------
    const [manageModalOpened, setManageModalOpened] = useState(false);
    const [isMultiSelecting, setIsMultiSelecting] = useState(false);
    const [selectedStateIds, setSelectedStateIds] = useState<Set<string>>(new Set());
    // Sort states by timestamp descending (newest first)
    const sortedStates = useMemo(() => [...savedStates].sort(
      (a, b) => b.timestamp - a.timestamp,
    ), [savedStates]);

    // Saved States Preview and Visualize States
    const [previewStateId, setPreviewStateId] = useState<string | null>(null);
    const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
    const [zoomedStateId, setZoomedStateId] = useState<string | null>(null);
    const [isPreviewHovered, setIsPreviewHovered] = useState(false);

    // Saved States Operations (Restore/Reset/Edit/Delete)
    const [restoreModalOpened, setRestoreModalOpened] = useState(false);
    const [stateToRestore, setStateToRestore] = useState<string | null>(null);
    const [resetModalOpened, setResetModalOpened] = useState(false);
    const [editingStateId, setEditingStateId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
      isOpen: boolean;
      type: 'single' | 'multi';
      id?: string;
      name?: string;
    }>({ isOpen: false, type: 'single' });

    // Save State Handlers -------
    const handleSaveState = async () => {
      if (stateName.trim()) {
        setSaveModalOpened(false);
        // Wait for modal transition
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
        // Capture screenshot
        const screenshot = await captureScreenshot(null, { pixelRatio: 1 });
        store.saveState(stateName, screenshot);
        setStateName('');
      }
    };

    // Restore State & Reset To Default Handlers -------
    const handleRestoreState = () => {
      if (stateToRestore) {
        store.restoreState(stateToRestore);
        setRestoreModalOpened(false);
        setManageModalOpened(false);
        setStateToRestore(null);
      }
    };

    const confirmRestore = (id: string) => {
      setStateToRestore(id);
      setRestoreModalOpened(true);
    };

    // Select States Handlers -------
    const toggleSelectionFor = (id: string) => {
      setSelectedStateIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const clearSelections = () => setSelectedStateIds(new Set());

    const toggleSelectAll = () => {
      if (sortedStates.length === 0) return;
      if (selectedStateIds.size === sortedStates.length) {
        clearSelections();
      } else {
        setSelectedStateIds(new Set(sortedStates.map((s) => s.id)));
      }
    };

    // Modal & Image Preview Handlers -------
    // Auto-select most recent state when modal opens
    const handleOpenModal = () => {
      setManageModalOpened(true);
      if (sortedStates.length > 0) {
        setPreviewStateId(sortedStates[0].id);
      }
    };

    // Get preview image for the right side of the modal
    const activePreviewState = (hoveredStateId
      ? sortedStates.find((s) => s.id === hoveredStateId)
      : null)
      || (previewStateId
        ? sortedStates.find((s) => s.id === previewStateId)
        : null);

    // Retrieve full state for details
    const activeFullState = activePreviewState
      ? store.provenance?.getState(activePreviewState.id)
      : null;

    // Delete States Handlers -------
    const requestDeleteSelected = () => {
      if (selectedStateIds.size === 0) return;
      setDeleteConfirmation({
        isOpen: true,
        type: 'multi',
      });
    };

    const requestDeleteSingle = (id: string, name: string) => {
      setDeleteConfirmation({
        isOpen: true,
        type: 'single',
        id,
        name,
      });
    };

    const confirmDelete = () => {
      if (deleteConfirmation.type === 'multi') {
        selectedStateIds.forEach((id) => store.removeState(id));
        clearSelections();
        setIsMultiSelecting(false);
        // Reset preview if deleted
        if (previewStateId && selectedStateIds.has(previewStateId)) {
          setPreviewStateId(null);
        }
      } else if (
        deleteConfirmation.type === 'single'
        && deleteConfirmation.id
      ) {
        store.removeState(deleteConfirmation.id);
        if (previewStateId === deleteConfirmation.id) {
          setPreviewStateId(null);
        }
      }
      setDeleteConfirmation({ isOpen: false, type: 'single' });
    };

    // Rename State Handlers -------
    const startEditingStateName = (id: string, currentName: string) => {
      setEditingStateId(id);
      setTempName(currentName);
    };

    const saveRename = () => {
      if (editingStateId && tempName.trim()) {
        store.renameState(editingStateId, tempName.trim());
        setEditingStateId(null);
        setTempName('');
      }
    };

    const cancelEditing = () => {
      setEditingStateId(null);
      setTempName('');
    };

    // Share Handler -------
    const handleShareState = async (id: string) => {
      const url = store.getShareUrl(id);
      if (url) {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Intelvia Link',
              text: 'Here is what we found in Intelvia',
              url,
            });
          } catch (err) {
            console.error('Error sharing:', err);
          }
        } else {
          navigator.clipboard.writeText(url);
          // alert('State URL copied to clipboard!');
        }
      } else {
        // alert('Could not generate share URL.');
      }
    };
    return (
      <>
        {/* Save State Menu */}
        <Menu
          shadow="md"
          width={220}
          trigger="click"
          closeDelay={200}
          offset={12}
          opened={menuOpened}
          onChange={setMenuOpened}
        >
          <Menu.Target>
            <Tooltip label="Save State" disabled={menuOpened}>
              <ActionIcon aria-label="Save State Menu">
                <IconFolder stroke={iconStroke} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFolderPlus size={16} />}
              onClick={() => setSaveModalOpened(true)}
            >
              Save Current State
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFolderSearch size={16} />}
              onClick={handleOpenModal}
            >
              Show Saved States
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label c="red">Danger Zone</Menu.Label>
            <Menu.Item
              leftSection={<IconRestore size={16} />}
              onClick={() => setResetModalOpened(true)}
              color="red"
            >
              Restore Default State
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        {/* Saved States Modal */}
        <Modal
          opened={manageModalOpened}
          onClose={() => {
            setManageModalOpened(false);
            clearSelections();
            setIsMultiSelecting(false);
          }}
          withCloseButton={false}
          size="xl"
          centered
        >
          <Stack gap="md" h={600}>
            <Group align="center">
              <Box style={{ flex: 1 }}>
                <Group justify="space-between">
                  {/** Title and Select All */}
                  <Group gap="xs">
                    {isMultiSelecting && sortedStates.length > 0 && (
                      <Checkbox
                        checked={
                          selectedStateIds.size === sortedStates.length
                          && sortedStates.length > 0
                        }
                        indeterminate={
                          selectedStateIds.size > 0
                          && selectedStateIds.size < sortedStates.length
                        }
                        onChange={toggleSelectAll}
                        size="sm"
                        ml={12.5}
                        mr={2}
                      />
                    )}
                    <Title order={3}>Saved States</Title>
                  </Group>
                  <Group gap="xs">
                    {/* Delete Multiple Button */}
                    {isMultiSelecting && selectedStateIds.size > 0 && (
                      <Button
                        color="red"
                        size="xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={requestDeleteSelected}
                      >
                        {selectedStateIds.size}
                      </Button>
                    )}
                    {/* Multi-select toggle */}
                    {sortedStates.length > 0 && (
                      <ActionIcon
                        variant={isMultiSelecting ? 'filled' : 'subtle'}
                        color={isMultiSelecting ? 'blue' : 'gray'}
                        onClick={() => {
                          setIsMultiSelecting(!isMultiSelecting);
                          if (isMultiSelecting) clearSelections();
                        }}
                        title="Toggle Multi-select"
                        size={22}
                        mr={4}
                      >
                        <IconSquareCheck size={18} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
              </Box>
              <Box
                style={{
                  flex: 1.5,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <CloseButton
                  onClick={() => {
                    setManageModalOpened(false);
                    clearSelections();
                    setIsMultiSelecting(false);
                  }}
                />
              </Box>
            </Group>
            <Group align="flex-start" style={{ flex: 1, overflow: 'hidden' }}>
              {/* Left Column: List of States */}
              <Stack style={{ flex: 1, height: '100%' }} gap="xs">
                <ScrollArea style={{ flex: 1 }} type="auto">
                  {sortedStates.length === 0 ? (
                    <Text c="dimmed" ta="center" mt="xl">
                      No saved states found.
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {sortedStates.map((state) => (
                        <Box
                          key={state.id}
                          className={classes.savedStateItem}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            backgroundColor:
                              previewStateId === state.id
                                || selectedStateIds.has(state.id)
                                || hoveredStateId === state.id
                                ? 'var(--mantine-color-gray-1)'
                                : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border:
                              previewStateId === state.id
                                ? '1px solid var(--mantine-color-blue-2)'
                                : '1px solid transparent',
                          }}
                          onMouseEnter={() => setHoveredStateId(state.id)}
                          onMouseLeave={() => setHoveredStateId(null)}
                          onClick={() => {
                            if (isMultiSelecting) {
                              toggleSelectionFor(state.id);
                            }
                            setPreviewStateId(state.id);
                          }}
                        >
                          <Group
                            gap="sm"
                            style={{ flex: 1, minWidth: 0 }}
                            wrap="nowrap"
                          >
                            {/** State gets checkbox if in multi-select mode */}
                            {isMultiSelecting && (
                              <Checkbox
                                checked={selectedStateIds.has(state.id)}
                                onChange={() => toggleSelectionFor(state.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ flexShrink: 0 }}
                              />
                            )}
                            {/** State gets text input if in edit mode */}
                            {editingStateId === state.id ? (
                              <TextInput
                                value={tempName}
                                onChange={(e) => setTempName(e.currentTarget.value)}
                                onClick={(e) => e.stopPropagation()}
                                size="sm"
                                autoFocus
                                styles={{
                                  input: {
                                    fontWeight: 500,
                                    width: `${Math.max(tempName.length + 2, 10)}ch`,
                                    borderColor: 'var(--mantine-color-blue-2)',
                                  },
                                  root: { width: 'auto' },
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename();
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                            ) : (
                              // Normal state display
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text
                                  size="sm"
                                  fw={500}
                                  style={{
                                    wordBreak: 'break-word',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {state.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {formatTimestamp(state.timestamp)}
                                </Text>
                              </Stack>
                            )}
                          </Group>
                          <Group gap={4}>
                            {/** Edit, delete, share buttons */}
                            {editingStateId === state.id ? (
                              <Group gap={4}>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="green"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveRename();
                                  }}
                                >
                                  <IconCheck size={14} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="gray"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEditing();
                                  }}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            ) : (
                              <Group gap={4}>
                                <Tooltip label="Share State URL">
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareState(state.id);
                                    }}
                                  >
                                    <IconShare size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingStateName(state.id, state.name || '');
                                  }}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeleteSingle(
                                      state.id,
                                      state.name || 'State',
                                    );
                                  }}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Group>
                            )}
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </ScrollArea>
              </Stack>
              {/* Right Column: Screenshot Preview and Details */}
              <Box
                style={{
                  flex: 1.5,
                  height: '100%',
                  borderLeft: '1px solid var(--mantine-color-gray-3)',
                  paddingLeft: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden', // Ensure scroll area works
                }}
              >
                {/** Preview state details */}
                {activePreviewState ? (
                  <Stack h="100%" gap="md">
                    <Box
                      style={{
                        flex: '0 0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        maxHeight: '300px',
                      }}
                    >
                      {activePreviewState.screenshot ? (
                        <Image
                          src={activePreviewState.screenshot}
                          radius="md"
                          className={classes.clickableScreenshot}
                          onClick={() => setZoomedStateId(activePreviewState.id)}
                          onMouseEnter={() => setIsPreviewHovered(true)}
                          onMouseLeave={() => setIsPreviewHovered(false)}
                          style={{
                            maxHeight: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            border: isPreviewHovered
                              ? '2px solid var(--mantine-color-blue-5)'
                              : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'border 0.2s ease',
                          }}
                        />
                      ) : (
                        <Text c="dimmed">No screenshot available</Text>
                      )}
                    </Box>
                    {/* State Details Scroll Area */}
                    <ScrollArea style={{ flex: 1 }} type="auto">
                      {activeFullState && (
                        <StateDetails state={activeFullState} />
                      )}
                    </ScrollArea>
                    {/** State Name and Timestamp */}
                    <Group
                      justify="space-between"
                      align="center"
                      wrap="nowrap"
                      style={{ flex: '0 0 auto', paddingTop: 0 }}
                    >
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          fw={600}
                          size="lg"
                          style={{ wordBreak: 'break-word', lineHeight: 1.2 }}
                        >
                          {activePreviewState.name}
                        </Text>
                        <Text c="dimmed" size="sm">
                          {formatTimestamp(activePreviewState.timestamp)}
                        </Text>
                      </Stack>
                      <Button
                        onClick={() => {
                          if (activePreviewState) confirmRestore(activePreviewState.id);
                        }}
                        style={{ flexShrink: 0 }}
                      >
                        Restore State
                      </Button>
                    </Group>
                  </Stack>
                ) : (
                  <Box
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <Text c="dimmed">Select a state to preview</Text>
                  </Box>
                )}
              </Box>
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
              <Button
                variant="default"
                onClick={() => setSaveModalOpened(false)}
              >
                Cancel
              </Button>
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
              Are you sure you want to restore this state? Unsaved changes will
              be lost.
            </Text>
            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                onClick={() => setRestoreModalOpened(false)}
              >
                Cancel
              </Button>
              <Button color="red" onClick={handleRestoreState}>
                Restore
              </Button>
            </Group>
          </Stack>
        </Modal>
        {/* Zoomed Screenshot Modal */}
        <ZoomedStateModal
          opened={!!zoomedStateId}
          onClose={() => setZoomedStateId(null)}
          state={sortedStates.find((s) => s.id === zoomedStateId)}
          onPrev={() => {
            const idx = sortedStates.findIndex((s) => s.id === zoomedStateId);
            if (idx > 0) setZoomedStateId(sortedStates[idx - 1].id);
          }}
          onNext={() => {
            const idx = sortedStates.findIndex((s) => s.id === zoomedStateId);
            if (idx < sortedStates.length - 1) setZoomedStateId(sortedStates[idx + 1].id);
          }}
          hasPrev={sortedStates.findIndex((s) => s.id === zoomedStateId) > 0}
          hasNext={sortedStates.findIndex((s) => s.id === zoomedStateId) < sortedStates.length - 1}
        />
        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
          title="Confirm Deletion"
          centered
          size="sm"
          zIndex={2100}
        >
          <Text size="sm" mb="lg">
            {deleteConfirmation.type === 'multi'
              ? `Are you sure you want to delete ${selectedStateIds.size} saved states?`
              : `Are you sure you want to delete state "${deleteConfirmation.name}"?`}
          </Text>
          {/** Cancel and Delete buttons */}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
            >
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Modal>
        {/** Reset State Modal */}
        <Modal
          opened={resetModalOpened}
          onClose={() => setResetModalOpened(false)}
          title="Restore Default State?"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to restore Intelvia to the default state? Unsaved changes will
              be lost.
            </Text>
            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                onClick={() => setResetModalOpened(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={() => {
                  if (onReset) onReset();
                  setResetModalOpened(false);
                }}
              >
                Restore
              </Button>
            </Group>
          </Stack>
        </Modal>
      </>
    );
  },
);
