import { useRef, useState, useContext } from 'react';
import {
    Menu, ActionIcon, Tooltip, Box, Text, Checkbox, Modal, Button, Stack, Group, Badge,
    Title,
} from '@mantine/core';
import {
    IconDeviceFloppy, IconTrash, IconSquareCheck, IconRestore,
} from '@tabler/icons-react';
import { useThemeConstants } from '../../Theme/mantineTheme';
import classes from '../../Shell/Shell.module.css';
import { Store } from '../../Store/Store';
import { observer } from 'mobx-react-lite';

/**
 * SavedStatesMenu - Menu for saving, restoring, and deleting application states.
 */
export const SavedStatesMenu = observer(({
    onSave,
    onRestore,
    onReset
}: {
    onSave: () => void;
    onRestore: (id: string) => void;
    onReset: () => void;
}) => {
    const store = useContext(Store);
    const { iconStroke } = useThemeConstants();

    const [menuOpened, setMenuOpened] = useState(false);
    const [isMultiSelecting, setIsMultiSelecting] = useState(false);
    const [selectedStateIds, setSelectedStateIds] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const selectAll = useRef<HTMLInputElement | null>(null);

    const savedStates = store.provenanceStore.savedStates;

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
        if (savedStates.length === 0) {
            return;
        }
        if (selectedStateIds.size === savedStates.length) {
            clearSelections();
        } else {
            setSelectedStateIds(new Set(savedStates.map((s) => s.id)));
        }
    };

    // Delete States Modal ---
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);
    const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
    const openDeleteModalForSelected = () => {
        if (selectedStateIds.size === 0) {
            return;
        }
        setDeleteTargetIds(Array.from(selectedStateIds));
        setDeleteModalOpened(true);
    };
    const confirmDeleteSelected = () => {
        if (deleteTargetIds.length === 0) {
            setDeleteModalOpened(false);
            return;
        }
        deleteTargetIds.forEach(id => store.provenanceStore.removeState(id));

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
                closeDelay={200}
                offset={12}
                opened={menuOpened}
                onOpen={() => setMenuOpened(true)}
                onClose={() => setMenuOpened(false)}
            >
                {/* Save Icon: Save State Button */}
                <Menu.Target>
                    <ActionIcon aria-label="Save" onClick={onSave}>
                        <IconDeviceFloppy stroke={iconStroke} />
                    </ActionIcon>
                </Menu.Target>

                {/* Saved States Menu */}
                <Menu.Dropdown>
                    <Box style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px',
                    }}
                    >
                        <Group gap={8} align="center">
                            {/* Select All Checkbox - only visible in multi-select mode */}
                            {isMultiSelecting && savedStates.length > 1 && (
                                <Checkbox
                                    ref={selectAll}
                                    checked={selectedStateIds.size === savedStates.length && savedStates.length > 0}
                                    onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label="Select all states checkbox"
                                    size="xs"
                                    mr={16}
                                    indeterminate={selectedStateIds.size > 0 && selectedStateIds.size < savedStates.length}
                                />
                            )}
                            <Menu.Label className={classes.menuLabelNoMargin} onClick={(e) => { e.stopPropagation(); }}>Saved States</Menu.Label>
                        </Group>
                        {' '}
                        <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* Delete Selected States */}
                            {isMultiSelecting && selectedStateIds.size !== 0 && (
                                <ActionIcon
                                    size="xs"
                                    variant="transparent"
                                    className={classes.leftToolbarIcon}
                                    onClick={(e) => { e.stopPropagation(); openDeleteModalForSelected(); }}
                                    aria-label="Delete selected states"
                                >
                                    <IconTrash stroke={iconStroke} size={18} />
                                </ActionIcon>
                            )}

                            {/* Toggle to Select Multiple States */}
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
                                aria-label="Toggle multi-selection of states"
                                data-active={isMultiSelecting ? 'true' : 'false'}
                                disabled={savedStates.length === 0}
                            >
                                <IconSquareCheck stroke={iconStroke} size={18} />
                            </ActionIcon>

                            {/* Reset to Defaults - Always visible */}
                            <Tooltip label="Reset to defaults">
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); onReset(); }}
                                >
                                    <IconRestore size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Box>
                    </Box>
                    {/* Saved States List */}
                    <Box
                        ref={dropdownRef}
                        style={{ position: 'relative', overflow: 'visible' }}
                    >
                        <Box style={{ maxHeight: 240, overflow: 'auto' }}>
                            {/* State Items */}
                            {savedStates.length === 0 ? (
                                <Menu.Item disabled>No saved states</Menu.Item>
                            ) : savedStates.map((s) => {
                                const ts = new Date(s.timestamp).toLocaleString();

                                const handleStateClick = (e: React.MouseEvent) => {
                                    if (isMultiSelecting) {
                                        e.stopPropagation();
                                        toggleSelectionFor(s.id);
                                    } else {
                                        onRestore(s.id);
                                    }
                                };

                                return (
                                    <Menu.Item
                                        key={s.id}
                                        closeMenuOnClick={false}
                                        onClick={handleStateClick}
                                        style={{ display: 'block', padding: '12px 12px' }}
                                    >
                                        <Group align="center" style={{ width: '100%' }}>
                                            <Group align="center" style={{ flex: 1, minHeight: 36 }}>
                                                {/** Add checkbox in multi-select mode */}
                                                {isMultiSelecting && (
                                                    <Checkbox
                                                        checked={selectedStateIds.has(s.id)}
                                                        onChange={(ev) => { ev.stopPropagation(); toggleSelectionFor(s.id); }}
                                                        onClick={(ev) => ev.stopPropagation()}
                                                        aria-label={`Select state ${s.name}`}
                                                        size="xs"
                                                        style={{ marginRight: 8 }}
                                                    />
                                                )}
                                                <Stack gap={4} style={{ flex: 1 }}>
                                                    <Text size="sm" style={{ lineHeight: 1.2 }}>
                                                        {s.name}
                                                    </Text>
                                                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>{ts}</Text>
                                                </Stack>
                                            </Group>
                                        </Group>
                                    </Menu.Item>
                                );
                            })}
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
                        <Title order={3}>Confirm State Deletion</Title>
                        <Badge size="sm" variant="light" color="black">{deleteTargetIds.length}</Badge>
                    </Group>
                )}
                centered
                styles={{
                    body: { padding: '8px 12px' },
                }}
            >
                <Stack gap="md">
                    {/** List of states to be deleted */}
                    <Box style={{ maxHeight: 200, overflow: 'auto' }}>
                        {deleteTargetIds.map((id) => {
                            const s = savedStates.find((ss) => ss.id === id);
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
                                        {s ? s.name : id}
                                    </Text>
                                    {s && <Text size="xs" c="dimmed">{new Date(s.timestamp).toLocaleString()}</Text>}
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
});
