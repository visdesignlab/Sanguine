import {
    Modal, Button, TextInput, ColorInput, Stack, Select, Group, ActionIcon, NumberInput, Text, Badge, Divider,
    Title,
} from '@mantine/core';
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { chartColors, BLOOD_COMPONENT_OPTIONS, OUTCOME_OPTIONS, PROPHYL_MED_OPTIONS, GUIDELINE_ADHERENT_OPTIONS, COST_OPTIONS, OVERALL_BLOOD_PRODUCT_COST, CASE_MIX_INDEX } from '../../../../Types/application';

// Types for Group Definition
export type Operator = '>' | '>=' | '<' | '<=' | '=' | '!=';
export type GroupCondition = {
    field: string;
    operator: Operator;
    value: number | string | boolean;
};
export type GroupDefinition = {
    id: string;
    name: string;
    color: string;
    conditions: GroupCondition[];
};

// Available fields for conditions, grouped
const CONDITION_GROUPS = [
    {
        group: 'Blood components used',
        items: BLOOD_COMPONENT_OPTIONS.map(o => ({ value: o.value, label: o.label.base, type: 'number', units: o.units.sum }))
    },
    {
        group: 'Outcomes',
        items: OUTCOME_OPTIONS.map(o => ({
            value: o.value,
            label: o.label.base,
            type: o.value === 'los' ? 'number' : 'boolean', // Explicitly make LOS numeric
            units: o.units.sum
        }))
    },
    {
        group: 'Prophylactic meds used',
        items: PROPHYL_MED_OPTIONS.map(o => ({ value: o.value, label: o.label.base, type: 'boolean', units: o.units.sum }))
    },
    {
        group: 'Guideline adherence',
        items: GUIDELINE_ADHERENT_OPTIONS.map(o => ({ value: o.value, label: o.label.base, type: 'boolean', units: o.units.sum }))
    },
    {
        group: 'General',
        items: [
            { value: 'total_blood_product_cost', label: 'Total Blood Product Cost', type: 'number', units: '$' },
            { value: 'case_mix_index', label: 'Case Mix Index', type: 'number', units: '' },
        ]
    }
];

// Flattened list for easy lookup
const CONDITION_FIELDS_FLAT = CONDITION_GROUPS.flatMap(g => g.items);

const OPERATOR_OPTIONS = [
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
];

const BOOLEAN_OPTIONS = [
    { value: 'true', label: 'True' },
    { value: 'false', label: 'False' },
];

export interface AddGroupModalProps {
    opened: boolean;
    onClose: () => void;
    onAddGroup: (group: GroupDefinition) => void;
    onUpdateGroup: (group: GroupDefinition) => void;
    existingGroups: GroupDefinition[];
    onRemoveGroup: (id: string) => void;
}

export function AddGroupModal({ opened, onClose, onAddGroup, onUpdateGroup, existingGroups, onRemoveGroup }: AddGroupModalProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [isNameDirty, setIsNameDirty] = useState(false);
    const [conditions, setConditions] = useState<GroupCondition[]>([{ field: '', operator: '>', value: 0 }]);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

    // Auto-populate color on open
    const getNextColor = () => {
        const usedColors = new Set(existingGroups.map(g => g.color));
        return chartColors.find(c => !usedColors.has(c)) || chartColors[existingGroups.length % chartColors.length];
    };

    // Effect to set initial color or reset
    if (opened && !color && !editingGroupId) {
        setColor(getNextColor());
    }

    const resetForm = () => {
        setName('');
        setColor(getNextColor());
        setConditions([{ field: '', operator: '>', value: 0 }]);
        setIsNameDirty(false);
        setEditingGroupId(null);
    };

    const handleEditGroup = (group: GroupDefinition) => {
        setEditingGroupId(group.id);
        setName(group.name);
        setColor(group.color);
        setConditions(group.conditions);
        setIsNameDirty(true); // Treat existing name as dirty so it doesn't auto-overwrite
    };

    const handleAddCondition = () => {
        setConditions([...conditions, { field: '', operator: '>', value: 0 }]);
    };

    const handleRemoveCondition = (index: number) => {
        const newConds = conditions.filter((_, i) => i !== index);
        setConditions(newConds);
        if (!isNameDirty) updateInferredName(newConds);
    };

    const updateInferredName = (conds: GroupCondition[]) => {
        if (editingGroupId) return; // Don't infer name if editing

        if (conds.length === 0 || !conds[0].field) {
            setName('');
            return;
        }
        const c = conds[0];
        const fieldLabel = CONDITION_FIELDS_FLAT.find(f => f.value === c.field)?.label || c.field;
        let inferred = '';
        if (c.operator === '=' && c.value === 'true') inferred = fieldLabel;
        else if (c.operator === '=' && c.value === 'false') inferred = `Not ${fieldLabel}`;
        else inferred = `${fieldLabel} ${c.operator} ${c.value}`;

        setName(inferred);
    };

    const updateCondition = (index: number, key: keyof GroupCondition, val: any) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], [key]: val };

        // Reset value if field changes to boolean
        if (key === 'field') {
            const fieldDef = CONDITION_FIELDS_FLAT.find(f => f.value === val);
            if (fieldDef?.type === 'boolean') {
                newConditions[index].value = 'true';
                newConditions[index].operator = '=';
            } else {
                newConditions[index].value = 0;
            }
        }

        setConditions(newConditions);
        if (!isNameDirty) updateInferredName(newConditions);
    };

    const handleSave = () => {
        const finalName = name || `Group ${existingGroups.length + 1}`;

        if (editingGroupId) {
            const updatedGroup: GroupDefinition = {
                id: editingGroupId,
                name: finalName,
                color: color,
                conditions: conditions.map(c => ({
                    ...c,
                    value: c.value === 'true' ? true : c.value === 'false' ? false : c.value,
                })),
            };
            onUpdateGroup(updatedGroup);
        } else {
            const newGroup: GroupDefinition = {
                id: Date.now().toString(),
                name: finalName,
                color: color,
                conditions: conditions.map(c => ({
                    ...c,
                    value: c.value === 'true' ? true : c.value === 'false' ? false : c.value,
                })),
            };
            onAddGroup(newGroup);
            resetForm(); // Only reset on Add. If editing, maybe keep it? Requirement says "Add group shouldn't close modal".
            // If we add, we probably want to clear to allow adding another? Yes.
        }
    };

    const isFormValid = conditions.some(c => c.field !== '');

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group justify="space-between" align="center" style={{ flex: 1 }}>
                    <Title order={3}>Groups</Title>
                    <ActionIcon size="md" variant="outline" color={"blue"} onClick={resetForm} aria-label="Add New Group">
                        <IconPlus size={18} />
                    </ActionIcon>
                </Group>
            }
            size="lg"
            styles={{
                header: { paddingRight: 16 }, // Standard padding for right side to let Close button sit naturally
                title: { width: '100%', paddingRight: 10 } // Ensure title block fills available space to push Close btn, but keep some gap
            }}
        >
            <Stack gap="md">

                {/** Summary of Existing Groups */}
                {existingGroups.length > 0 && (
                    <Stack gap="xs">
                        <Group gap="xs" wrap="wrap">
                            {existingGroups.map(g => (
                                <Badge
                                    key={g.id}
                                    color={g.color}
                                    variant={editingGroupId === g.id ? "filled" : "light"}
                                    size="lg"
                                    pr={3}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleEditGroup(g)}
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color={g.color}
                                            variant="transparent"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveGroup(g.id);
                                                if (editingGroupId === g.id) resetForm();
                                            }}
                                        >
                                            <IconX size={14} />
                                        </ActionIcon>
                                    }
                                >
                                    {g.name}
                                </Badge>
                            ))}
                        </Group>
                        <Divider my="xs" />
                    </Stack>
                )}

                <Text fw={500}>{editingGroupId ? "Edit Group" : "Add New Group"}</Text>
                <Group grow>
                    <TextInput
                        label="Group Name (Optional)"
                        placeholder="e.g. High Cost"
                        value={name}
                        c="dimmed"
                        onChange={(e) => {
                            setName(e.currentTarget.value);
                            setIsNameDirty(true);
                        }}
                    />
                    <ColorInput
                        label="Color"
                        placeholder="Color"
                        c="dimmed"
                        value={color}
                        onChange={setColor}
                    />
                </Group>

                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="sm" fw={500}>Conditions</Text>
                        <ActionIcon size={24} mr={6.5} variant="outline" color={"blue"} onClick={handleAddCondition} aria-label="Add New Group">
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Group>
                    {conditions.map((condition, index) => {
                        const fieldDef = CONDITION_FIELDS_FLAT.find(f => f.value === condition.field);
                        const isBoolean = fieldDef?.type === 'boolean';
                        const units = fieldDef?.units || '';

                        // Parse unit for basic prefix/suffix logic
                        // Simple heuristic: if unit is '$', use prefix. Else suffix.
                        const isPrefix = units === '$';
                        const prefix = isPrefix ? units : undefined;
                        const suffix = !isPrefix && units ? ' ' + units : undefined;

                        return (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                    <Select
                                        aria-label="Field"
                                        placeholder="Field"
                                        data={CONDITION_GROUPS}
                                        value={condition.field}
                                        onChange={(val) => updateCondition(index, 'field', val)}
                                        searchable
                                    />
                                </div>
                                <div style={{ width: 80 }}>
                                    <Select
                                        aria-label="Operator"
                                        placeholder="Op"
                                        data={isBoolean ? [{ value: '=', label: '=' }, { value: '!=', label: '!=' }] : OPERATOR_OPTIONS}
                                        value={condition.operator}
                                        onChange={(val) => updateCondition(index, 'operator', val)}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    {isBoolean ? (
                                        <Select
                                            aria-label="Value"
                                            data={BOOLEAN_OPTIONS}
                                            value={String(condition.value)}
                                            onChange={(val) => updateCondition(index, 'value', val)}
                                        />
                                    ) : (
                                        <NumberInput
                                            aria-label="Value"
                                            placeholder="Value"
                                            value={Number(condition.value)}
                                            onChange={(val) => updateCondition(index, 'value', val)}
                                            prefix={prefix}
                                            suffix={suffix}
                                        />
                                    )}
                                </div>

                                <ActionIcon
                                    color="red"
                                    variant="subtle"
                                    onClick={() => handleRemoveCondition(index)}
                                    disabled={conditions.length === 1}
                                    size={37}
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </div>
                        )
                    })}
                </Stack>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Close</Button>
                    <Button onClick={handleSave} disabled={!isFormValid}>
                        {editingGroupId ? "Save Group" : "Add Group"}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
