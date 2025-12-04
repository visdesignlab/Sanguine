import { useRef, useState, useContext } from 'react';
import {
    Menu, ActionIcon, Tooltip, Box, Text, Checkbox, Modal, Button, Stack, Group, Badge,
    Title, Image, ScrollArea,
} from '@mantine/core';
import {
    IconFolder, IconFolderDown, IconFolderSearch, IconEdit, IconTrash, IconSquareCheck,
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
    const confirmDeleteSelected = () => {
        if (selectedStateIds.size === 0) return;
        selectedStateIds.forEach(id => store.provenanceStore.removeState(id));
        clearSelections();
        setIsMultiSelecting(false);
        // Reset preview if deleted
        if (previewStateId && selectedStateIds.has(previewStateId)) {
            setPreviewStateId(null);
        }
    };

    const handleDeleteSingle = (id: string) => {
        store.provenanceStore.removeState(id);
        if (previewStateId === id) {
            setPreviewStateId(null);
        }
    };

    const handleSaveCurrentState = async () => {
        // Capture screenshot before opening save modal
        const screenshot = await captureScreenshot(null, { pixelRatio: 1 });
        onSave(screenshot);
    };

    // Get preview image for the right side of the modal
    const activePreviewState = previewStateId
        ? sortedStates.find(s => s.id === previewStateId)
        : null;

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

            {/* Manage States Modal */}
            <Modal
                opened={manageModalOpened}
                onClose={() => { setManageModalOpened(false); clearSelections(); setIsMultiSelecting(false); }}
                title={(
                    <Group justify="space-between" style={{ width: '100%' }} pr="md">
                        <Title order={3}>Saved States</Title>
                        <Group gap="xs">
                            <ActionIcon
                                variant={isMultiSelecting ? "filled" : "subtle"}
                                onClick={() => {
                                    setIsMultiSelecting(!isMultiSelecting);
                                    if (isMultiSelecting) clearSelections();
                                }}
                                title="Toggle Multi-select"
                            >
                                <IconSquareCheck size={18} />
                            </ActionIcon>
                            {isMultiSelecting && selectedStateIds.size > 0 && (
                                <Button
                                    color="red"
                                    size="xs"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={confirmDeleteSelected}
                                >
                                    Delete ({selectedStateIds.size})
                                </Button>
                            )}
                        </Group>
                    </Group>
                )}
                size="xl"
                centered
            >
                <Group align="flex-start" style={{ height: 500 }}>
                    {/* Left Column: List of States */}
                    <Stack style={{ flex: 1, height: '100%' }} gap="xs">
                        {isMultiSelecting && (
                            <Group justify="flex-end" px="xs">
                                <Checkbox
                                    checked={selectedStateIds.size === sortedStates.length && sortedStates.length > 0}
                                    indeterminate={selectedStateIds.size > 0 && selectedStateIds.size < sortedStates.length}
                                    onChange={toggleSelectAll}
                                    label="Select All"
                                    size="xs"
                                />
                            </Group>
                        )}

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
                                                backgroundColor: (previewStateId === state.id || selectedStateIds.has(state.id)) ? 'var(--mantine-color-gray-1)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                border: previewStateId === state.id ? '1px solid var(--mantine-color-blue-2)' : '1px solid transparent'
                                            }}
                                            onClick={() => {
                                                if (isMultiSelecting) {
                                                    toggleSelectionFor(state.id);
                                                } else {
                                                    setPreviewStateId(state.id);
                                                }
                                            }}
                                        >
                                            <Group gap="sm">
                                                {isMultiSelecting && (
                                                    <Checkbox
                                                        checked={selectedStateIds.has(state.id)}
                                                        onChange={() => toggleSelectionFor(state.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                                <Stack gap={0}>
                                                    <Text size="sm" fw={500}>{state.name}</Text>
                                                    <Text size="xs" c="dimmed">{new Date(state.timestamp).toLocaleString()}</Text>
                                                </Stack>
                                            </Group>

                                            <Group gap={4}>
                                                <ActionIcon size="sm" variant="subtle" onClick={(e) => { e.stopPropagation(); /* Implement rename */ }}>
                                                    <IconEdit size={14} />
                                                </ActionIcon>
                                                <ActionIcon size="sm" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); handleDeleteSingle(state.id); }}>
                                                    <IconTrash size={14} />
                                                </ActionIcon>
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
                                            style={{
                                                border: '1px solid var(--mantine-color-gray-3)',
                                                maxHeight: '100%',
                                                maxWidth: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <Text c="dimmed">No screenshot available</Text>
                                    )}
                                </Box>
                                <Group justify="space-between" align="center" mt="md">
                                    <Stack gap={0}>
                                        <Text fw={600} size="lg">{activePreviewState.name}</Text>
                                        <Text c="dimmed" size="sm">{new Date(activePreviewState.timestamp).toLocaleString()}</Text>
                                    </Stack>
                                    <Button
                                        onClick={() => {
                                            onRestore(activePreviewState.id);
                                            setManageModalOpened(false);
                                        }}
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
            </Modal>
        </>
    );
});
