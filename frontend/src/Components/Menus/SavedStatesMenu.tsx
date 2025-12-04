import { useRef, useState, useContext } from 'react';
import {
    Menu, ActionIcon, Tooltip, Box, Text, Checkbox, Modal, Button, Stack, Group, Badge,
    Title, Image, ScrollArea, CloseButton, TextInput,
} from '@mantine/core';
import {
    IconFolder, IconFolderDown, IconFolderSearch, IconEdit, IconTrash, IconSquareCheck, IconCheck, IconX, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react';
import { useThemeConstants } from '../../Theme/mantineTheme';
import classes from '../../Shell/Shell.module.css';
import { Store } from '../../Store/Store';
import { observer } from 'mobx-react-lite';
import { captureScreenshot } from '../../Utils/screenshotUtils';

/**
 * SavedStatesMenu - Menu for saving, restoring, and deleting application states.
 */
export const SavedStatesMenu = observer(({
    onSave,
    onRestore,
    onReset
}: {
    onSave: (screenshot?: string) => void;
    onRestore: (id: string) => void;
    onReset: () => void;
}) => {
    const store = useContext(Store);
    const { iconStroke } = useThemeConstants();

    const [manageModalOpened, setManageModalOpened] = useState(false);
    const [isMultiSelecting, setIsMultiSelecting] = useState(false);
    const [selectedStateIds, setSelectedStateIds] = useState<Set<string>>(new Set());
    const [previewStateId, setPreviewStateId] = useState<string | null>(null);
    const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
    const [zoomedStateId, setZoomedStateId] = useState<string | null>(null);

    // Editing State
    const [editingStateId, setEditingStateId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'single' | 'multi';
        id?: string;
        name?: string;
    }>({ isOpen: false, type: 'single' });

    const savedStates = store.provenanceStore.savedStates;

    // Sort states by timestamp descending (newest first)
    const sortedStates = [...savedStates].sort((a, b) => b.timestamp - a.timestamp);

    // Auto-select most recent state when modal opens
    const handleOpenModal = () => {
        setManageModalOpened(true);
        if (sortedStates.length > 0) {
            setPreviewStateId(sortedStates[0].id);
        }
    };

    // Select multiple states
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
        if (sortedStates.length === 0) {
            return;
        }
        if (selectedStateIds.size === sortedStates.length) {
            clearSelections();
        } else {
            setSelectedStateIds(new Set(sortedStates.map((s) => s.id)));
        }
    };

    // Delete States Logic
    const requestDeleteSelected = () => {
        if (selectedStateIds.size === 0) return;
        setDeleteConfirmation({
            isOpen: true,
            type: 'multi'
        });
    };

    const requestDeleteSingle = (id: string, name: string) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'single',
            id,
            name
        });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.type === 'multi') {
            selectedStateIds.forEach(id => store.provenanceStore.removeState(id));
            clearSelections();
            setIsMultiSelecting(false);
            // Reset preview if deleted
            if (previewStateId && selectedStateIds.has(previewStateId)) {
                setPreviewStateId(null);
            }
        } else if (deleteConfirmation.type === 'single' && deleteConfirmation.id) {
            store.provenanceStore.removeState(deleteConfirmation.id);
            if (previewStateId === deleteConfirmation.id) {
                setPreviewStateId(null);
            }
        }
        setDeleteConfirmation({ isOpen: false, type: 'single' });
    };

    // Rename Logic
    const startEditing = (id: string, currentName: string) => {
        setEditingStateId(id);
        setTempName(currentName);
    };

    const saveRename = () => {
        if (editingStateId && tempName.trim()) {
            store.provenanceStore.renameState(editingStateId, tempName.trim());
            setEditingStateId(null);
            setTempName("");
        }
    };

    const cancelEditing = () => {
        setEditingStateId(null);
        setTempName("");
    };

    const handleSaveCurrentState = async () => {
        // Capture screenshot before opening save modal
        const screenshot = await captureScreenshot(null, { pixelRatio: 1 });
        onSave(screenshot);
    };

    // Get preview image for the right side of the modal
    const activePreviewState = (hoveredStateId ? sortedStates.find(s => s.id === hoveredStateId) : null) ||
        (previewStateId ? sortedStates.find(s => s.id === previewStateId) : null);

    return (
        <>
            <Menu shadow="md" width={200} trigger="click" closeDelay={200} offset={12}>
                <Menu.Target>
                    <Tooltip label="Save State">
                        <ActionIcon aria-label="Save State Menu">
                            <IconFolder stroke={iconStroke} />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<IconFolderDown size={14} />}
                        onClick={handleSaveCurrentState}
                    >
                        Save Current State
                    </Menu.Item>
                    <Menu.Item
                        leftSection={<IconFolderSearch size={14} />}
                        onClick={handleOpenModal}
                    >
                        Show Saved States
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>

            <Modal
                opened={manageModalOpened}
                onClose={() => { setManageModalOpened(false); clearSelections(); setIsMultiSelecting(false); }}
                withCloseButton={false}
                size="xl"
                centered
            >
                <Stack gap="md">
                    <Group align="center">
                        <Box style={{ flex: 1 }}>
                            <Group justify="space-between">
                                <Group gap="xs">
                                    {isMultiSelecting && (
                                        <Checkbox
                                            checked={selectedStateIds.size === sortedStates.length && sortedStates.length > 0}
                                            indeterminate={selectedStateIds.size > 0 && selectedStateIds.size < sortedStates.length}
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
                                    <ActionIcon
                                        variant={isMultiSelecting ? "filled" : "subtle"}
                                        color={isMultiSelecting ? "blue" : "gray"}
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
                                </Group>
                            </Group>
                        </Box>
                        <Box style={{ flex: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <CloseButton onClick={() => { setManageModalOpened(false); clearSelections(); setIsMultiSelecting(false); }} />
                        </Box>
                    </Group>

                    <Group align="flex-start" style={{ height: 500 }}>
                        {/* Left Column: List of States */}
                        <Stack style={{ flex: 1, height: '100%' }} gap="xs">

                            <ScrollArea style={{ flex: 1 }} type="auto">
                                {sortedStates.length === 0 ? (
                                    <Text c="dimmed" ta="center" mt="xl">No saved states found.</Text>
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
                                                    backgroundColor: (previewStateId === state.id || selectedStateIds.has(state.id) || hoveredStateId === state.id) ? 'var(--mantine-color-gray-1)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    border: previewStateId === state.id ? '1px solid var(--mantine-color-blue-2)' : '1px solid transparent'
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
                                                <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                                                    {isMultiSelecting && (
                                                        <Checkbox
                                                            checked={selectedStateIds.has(state.id)}
                                                            onChange={() => toggleSelectionFor(state.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ flexShrink: 0 }}
                                                        />
                                                    )}
                                                    {editingStateId === state.id ? (
                                                        <TextInput
                                                            value={tempName}
                                                            onChange={(e) => setTempName(e.currentTarget.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            size="xs"
                                                            autoFocus
                                                            style={{ flex: 1 }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveRename();
                                                                if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                        />
                                                    ) : (
                                                        <Stack gap={0} style={{ minWidth: 0 }}>
                                                            <Text size="sm" fw={500} style={{ wordBreak: 'break-word', lineHeight: 1.2 }}>
                                                                {state.name}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {new Date(state.timestamp).toLocaleString()}
                                                            </Text>
                                                        </Stack>
                                                    )}
                                                </Group>

                                                <Group gap={4}>
                                                    {editingStateId === state.id ? (
                                                        <Group gap={4}>
                                                            <ActionIcon size="sm" variant="subtle" color="green" onClick={(e) => { e.stopPropagation(); saveRename(); }}>
                                                                <IconCheck size={14} />
                                                            </ActionIcon>
                                                            <ActionIcon size="sm" variant="subtle" color="gray" onClick={(e) => { e.stopPropagation(); cancelEditing(); }}>
                                                                <IconX size={14} />
                                                            </ActionIcon>
                                                        </Group>
                                                    ) : (
                                                        <Group gap={4}>
                                                            <ActionIcon size="sm" variant="subtle" onClick={(e) => { e.stopPropagation(); startEditing(state.id, state.name || ""); }}>
                                                                <IconEdit size={14} />
                                                            </ActionIcon>
                                                            <ActionIcon size="sm" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); requestDeleteSingle(state.id, state.name || "State"); }}>
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

                        {/* Right Column: Screenshot Preview */}
                        <Box style={{
                            flex: 1.5,
                            height: '100%',
                            borderLeft: '1px solid var(--mantine-color-gray-3)',
                            paddingLeft: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}>
                            {activePreviewState ? (
                                <>
                                    <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {activePreviewState.screenshot ? (
                                            <Image
                                                src={activePreviewState.screenshot}
                                                radius="md"
                                                className={classes.clickableScreenshot}
                                                onClick={() => setZoomedStateId(activePreviewState.id)}
                                                style={{
                                                    maxHeight: '100%',
                                                    maxWidth: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : (
                                            <Text c="dimmed">No screenshot available</Text>
                                        )}
                                    </Box>
                                    <Group justify="space-between" align="center" mt="md" wrap="nowrap">
                                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                            <Text fw={600} size="lg" style={{ wordBreak: 'break-word', lineHeight: 1.2 }}>
                                                {activePreviewState.name}
                                            </Text>
                                            <Text c="dimmed" size="sm">
                                                {new Date(activePreviewState.timestamp).toLocaleString()}
                                            </Text>
                                        </Stack>
                                        <Button
                                            onClick={() => {
                                                onRestore(activePreviewState.id);
                                                setManageModalOpened(false);
                                            }}
                                            style={{ flexShrink: 0 }}
                                        >
                                            Restore State
                                        </Button>
                                    </Group>
                                </>
                            ) : (
                                <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Text c="dimmed">Select a state to preview</Text>
                                </Box>
                            )}
                        </Box>
                    </Group>
                </Stack>
            </Modal>

            {/* Zoomed Screenshot Modal */}
            <Modal
                opened={!!zoomedStateId}
                onClose={() => setZoomedStateId(null)}
                size="90%"
                centered
                zIndex={2000}
                withCloseButton={true}
                styles={{
                    body: {
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 0,
                        backgroundColor: 'transparent',
                        position: 'relative'
                    },
                    content: {
                        backgroundColor: 'transparent',
                        boxShadow: 'none'
                    },
                    header: {
                        backgroundColor: 'transparent',
                        color: 'white',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 2001
                    }
                }}
            >
                {zoomedStateId && (() => {
                    const zoomedState = sortedStates.find(s => s.id === zoomedStateId);
                    const currentIndex = sortedStates.findIndex(s => s.id === zoomedStateId);
                    const hasPrev = currentIndex > 0;
                    const hasNext = currentIndex < sortedStates.length - 1;

                    const handlePrev = () => {
                        if (hasPrev) setZoomedStateId(sortedStates[currentIndex - 1].id);
                    };

                    const handleNext = () => {
                        if (hasNext) setZoomedStateId(sortedStates[currentIndex + 1].id);
                    };

                    return (
                        <Stack align="center" justify="center" gap="xl" style={{ width: '100%', height: '100%', padding: '40px 0' }}>
                            {zoomedState && (
                                <>
                                    <Image
                                        src={zoomedState.screenshot}
                                        fit="contain"
                                        style={{
                                            maxHeight: '75vh',
                                            maxWidth: '100%',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                            borderRadius: 8
                                        }}
                                    />

                                    <Group gap="xl" align="center">
                                        <ActionIcon
                                            variant="filled"
                                            color="dark"
                                            size="xl"
                                            radius="xl"
                                            disabled={!hasPrev}
                                            style={{ opacity: hasPrev ? 1 : 0, cursor: hasPrev ? 'pointer' : 'default' }}
                                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        >
                                            <IconChevronLeft size={24} />
                                        </ActionIcon>

                                        <Stack gap={0} align="center">
                                            <Title order={3} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                {zoomedState.name}
                                            </Title>
                                            <Text c="dimmed" size="sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                {new Date(zoomedState.timestamp).toLocaleString()}
                                            </Text>
                                        </Stack>

                                        <ActionIcon
                                            variant="filled"
                                            color="dark"
                                            size="xl"
                                            radius="xl"
                                            disabled={!hasNext}
                                            style={{ opacity: hasNext ? 1 : 0, cursor: hasNext ? 'pointer' : 'default' }}
                                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        >
                                            <IconChevronRight size={24} />
                                        </ActionIcon>
                                    </Group>
                                </>
                            )}
                        </Stack>
                    );
                })()}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                opened={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                title="Confirm Deletion"
                centered
                size="sm"
                zIndex={2100} // Higher than manage modal
            >
                <Text size="sm" mb="lg">
                    {deleteConfirmation.type === 'multi'
                        ? `Are you sure you want to delete ${selectedStateIds.size} saved states?`
                        : `Are you sure you want to delete state "${deleteConfirmation.name}"?`
                    }
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={confirmDelete}>
                        Delete
                    </Button>
                </Group>
            </Modal>
        </>
    );
});
