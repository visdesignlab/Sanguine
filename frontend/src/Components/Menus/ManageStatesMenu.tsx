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
  Loader,
} from '@mantine/core';
import {
  IconFolder,
  IconFolderSearch,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconChartBar,
  IconFilter,
  IconClick,
  IconSettings,
  IconChartScatter,
  IconShare,
  IconRestore,
} from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { captureScreenshot } from '../../Utils/screenshotUtils';
import { useThemeConstants } from '../../Theme/mantineTheme';
import { formatStateDetailName, formatStateDetailValue } from '../../Utils/humanReadableColsVals';
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
import { ZoomedStateModal } from '../Modals/ZoomedStateModal';

// region Zoomed State Image
/**
 * Helper component for Zoomed State Image Modal (Large Image Preview)
 */

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
        const yLabel = formatStateDetailName(config.yAxisVar);
        const xLabel = formatStateDetailName(config.xAxisVar);
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
        const xLabel = formatStateDetailName(config.xAxisVar);
        const yLabel = formatStateDetailName(config.yAxisVar);
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
            label: formatStateDetailName(key),
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
          label: formatStateDetailName(key),
          value: formatStateDetailValue(value, key),
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

  // Combine all state details into a config for display
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

    // Manage Saved States Modal -------
    const [manageModalOpened, setManageModalOpened] = useState(false);
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
    const [justSavedId, setJustSavedId] = useState<string | null>(null); // To show "Saved" text

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

    // Snapshot Loading State
    const [isSnapshotting, setIsSnapshotting] = useState(false);

    // Get preview image for the right side of the modal
    const activeStateId = hoveredStateId ?? previewStateId;
    const activePreviewState = activeStateId
      ? sortedStates.find((s) => s.uniqueId === activeStateId)
      : null;

    // Retrieve full state for details
    const activeFullState = activePreviewState
      ? store.provenance?.getState(activePreviewState.id)
      : null;

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
        setSelectedStateIds(new Set(sortedStates.map((s) => s.uniqueId)));
      }
    };

    // Modal & Image Preview Handlers -------
    const handleManageStates = async () => {
      // If our current state matches the initial saved state, we skip saving a new "Current State"
      const initialStateNode = store.savedStates.length > 0
        ? store.savedStates.reduce(
          (earliest, s) => (s.timestamp < earliest.timestamp ? s : earliest),
          store.savedStates[0],
        )
        : undefined;
      const isInitial = initialStateNode && store.provenance
        ? store.areStatesEqual(store.currentState, store.provenance.getState(initialStateNode.id))
        : false;

      if (!isInitial) {
        // Show loading modal
        setIsSnapshotting(true);

        // Wait for the modal to render before capturing the screenshot
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      }

      try {
        if (!isInitial) {
          // 1. Capture screenshot of current view
          const screenshot = await captureScreenshot(null, {
            pixelRatio: 1,
            hideSelector: '.hide-from-screenshot',
          });

          // 2. Add or update "Current State".
          store.saveTempCurrentState(screenshot);
        }

        // 3. Open the modal
        setManageModalOpened(true);

        // 4. Sort states again by timestamp descending (newest first)
        if (store.savedStates.length > 0) {
          const resortedStates = [...store.savedStates].sort((a, b) => b.timestamp - a.timestamp);
          setPreviewStateId(resortedStates[0].uniqueId);
        }
      } finally {
        setIsSnapshotting(false);
      }
    };

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
        selectedStateIds.forEach((uniqueId) => {
          const state = store.savedStates.find((s) => s.uniqueId === uniqueId);
          if (state) {
            store.removeState(state.id, state.name);
          }
        });
        clearSelections();
        // Reset preview if deleted
        if (previewStateId && selectedStateIds.has(previewStateId)) {
          setPreviewStateId(null);
        }
      } else if (
        deleteConfirmation.type === 'single'
        && deleteConfirmation.id
        && deleteConfirmation.name
      ) {
        store.removeState(deleteConfirmation.id, deleteConfirmation.name);
        const deletedUniqueId = store.getUniqueStateId(deleteConfirmation.id, deleteConfirmation.name);
        if (previewStateId === deletedUniqueId) {
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
        const state = store.savedStates.find((s) => s.uniqueId === editingStateId);
        if (state) {
          store.renameState(state.id, state.name, tempName.trim());

          // Calculate new unique ID to keep selection valid
          const newUniqueId = store.getUniqueStateId(state.id, tempName.trim());
          setPreviewStateId(newUniqueId);

          // If this was the "just saved" state, update that reference so the "Saved" text persists
          if (justSavedId === editingStateId) {
            setJustSavedId(newUniqueId);
          }
        }
        setEditingStateId(null);
        setTempName('');
      }
    };

    const cancelEditing = () => {
      setEditingStateId(null);
      setTempName('');
    };

    // Used for the Green 'Save As ...' button behavior (renaming 'Current State' -> 'State N')
    const handleSaveCurrentState = () => {
      if (activePreviewState && activePreviewState.name === 'Current State') {
        const newName = store.saveCurrentStateAsNew(activePreviewState.id);
        const newUniqueId = store.getUniqueStateId(activePreviewState.id, newName);
        // Set the new state as the just saved state
        setJustSavedId(newUniqueId);
        // Set the new state as the preview state
        setPreviewStateId(newUniqueId);
        // Start editing the new state's name
        startEditingStateName(newUniqueId, newName);
      }
    };

    // Share State Handler -------
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
        }
      }
    };
    return (
      <>
        {/* Intelvia States Menu */}
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
            <Tooltip label="Manage Intelvia States" disabled={menuOpened}>
              <ActionIcon aria-label="Manage Intelvia States">
                <IconFolder stroke={iconStroke} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFolderSearch size={16} />}
              onClick={handleManageStates}
            >
              Manage Intelvia States
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
        {/* Loading Modal for Screenshot */}
        <Modal
          opened={isSnapshotting}
          onClose={() => { }}
          withCloseButton={false}
          centered
          className="hide-from-screenshot"
          overlayProps={{ className: 'hide-from-screenshot' }}
          closeOnClickOutside={false}
          closeOnEscape={false}
          size="sm"
          transitionProps={{ duration: 0 }}
        >
          <Stack align="center" gap="md" py="lg">
            <Loader size="lg" />
            <Text fw={500}>Updating current state...</Text>
          </Stack>
        </Modal>
        {/* Saved States Modal */}
        <Modal
          opened={manageModalOpened}
          onClose={() => {
            setManageModalOpened(false);
            clearSelections();
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
                    {sortedStates.length > 0 && (
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
                        ml={16}
                        mr={5}
                      />
                    )}
                    <Title order={3}>Intelvia States</Title>
                  </Group>
                  <Group gap="xs">
                    {/* Delete Multiple Button */}
                    {selectedStateIds.size > 0 && (
                      <Button
                        color="red"
                        size="xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={requestDeleteSelected}
                      >
                        {selectedStateIds.size}
                      </Button>
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
                      {sortedStates.map((state) => {
                        const isCheckboxSelected = selectedStateIds.has(state.uniqueId);
                        const isHovered = hoveredStateId === state.uniqueId;
                        const isActive = previewStateId === state.uniqueId;

                        return (
                          <Box
                            key={state.uniqueId}
                            onMouseEnter={() => setHoveredStateId(state.uniqueId)}
                            onMouseLeave={() => setHoveredStateId(null)}
                            onClick={() => setPreviewStateId(state.uniqueId)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              backgroundColor: isActive
                                ? 'var(--mantine-color-blue-0)'
                                : isHovered
                                  ? 'var(--mantine-color-gray-0)'
                                  : 'transparent',
                              borderLeft: isActive
                                ? '4px solid var(--mantine-color-blue-6)'
                                : '4px solid transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <Group wrap="nowrap" align="center">
                              <Checkbox
                                checked={isCheckboxSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelectionFor(state.uniqueId);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Group justify="space-between" align="center" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                                <Box style={{ minWidth: 0, flex: 1 }}>
                                  {editingStateId === state.uniqueId ? (
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
                                </Box>

                                <Group gap={4} style={{ flexShrink: 0 }}>
                                  {/** Edit, delete, share buttons */}
                                  {editingStateId === state.uniqueId ? (
                                    <Group gap={4}>
                                      <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        color="green"
                                        aria-label="Confirm Rename"
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
                                        aria-label="Cancel Rename"
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
                                          aria-label="Share State URL"
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
                                        aria-label="Rename State"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingStateName(state.uniqueId, state.name || '');
                                        }}
                                      >
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                      <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        color="red"
                                        aria-label="Delete State"
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
                              </Group>
                            </Group>
                          </Box>
                        );
                      })}
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
                        minHeight: '200px',
                        width: '100%',
                        backgroundColor: 'var(--mantine-color-gray-1)',
                        borderRadius: 'var(--mantine-radius-md)',
                      }}
                    >
                      {activePreviewState.screenshot ? (
                        <Image
                          src={activePreviewState.screenshot}
                          radius="md"
                          onClick={() => setZoomedStateId(activePreviewState.uniqueId)}
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
                      <Group gap="xs">
                        {/* Logic:
                            1. Name is 'Current State' AND it's the MOST RECENT state -> Show green 'Save Current State' button
                            2. Equal to store.currentState -> Show text "Same as current"
                            3. Else -> Show 'Restore State' button
                        */}
                        {(activePreviewState.name === 'Current State' && sortedStates[0]?.uniqueId === activePreviewState.uniqueId) ? (
                          <Button
                            color="green"
                            onClick={handleSaveCurrentState}
                            style={{ flexShrink: 0 }}
                          >
                            Save As ...
                          </Button>
                        ) : (
                          // Check equality
                          (activeFullState && store.areStatesEqual(activeFullState, store.currentState)) ? (
                            <Stack gap={0} align="flex-end">
                              {justSavedId === activePreviewState.uniqueId && (
                                <Group gap={4} align="center">
                                  <Text size="xs" c="dimmed">Saved</Text>
                                  <IconCheck size={12} color="var(--mantine-color-dimmed)" />
                                </Group>
                              )}
                              <Text c="dimmed" fs="italic" size="sm">Same as current</Text>
                            </Stack>
                          ) : (
                            <Button
                              onClick={() => {
                                if (activePreviewState) confirmRestore(activePreviewState.id);
                              }}
                              style={{ flexShrink: 0 }}
                            >
                              Restore State
                            </Button>
                          )
                        )}
                      </Group>
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
