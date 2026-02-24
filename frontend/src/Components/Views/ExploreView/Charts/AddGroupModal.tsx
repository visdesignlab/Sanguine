import {
  Modal, Button, TextInput, ColorInput, Stack, Select, Group, ActionIcon, NumberInput, Text, Badge, Divider,
  Title,
} from '@mantine/core';
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react';
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
export const CONDITION_FIELDS_FLAT = CONDITION_GROUPS.flatMap((g) => g.items);

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
  // Stateless Form Props
  name: string;
  onNameChange: (val: string) => void;
  color: string;
  onColorChange: (val: string) => void;
  conditions: GroupCondition[];
  onConditionsChange: (conditions: GroupCondition[]) => void;

  existingGroups: GroupDefinition[];
  editingGroupId: string | null;

  // Actions
  onRemoveGroup: (id: string) => void;
  onEditGroup: (group: GroupDefinition) => void;
  onResetForm: () => void;
  onSave: () => void;

  isFormValid: boolean;
}

export function AddGroupModal({
  opened, onClose,
  name, onNameChange,
  color, onColorChange,
  conditions, onConditionsChange,
  existingGroups, editingGroupId,
  onRemoveGroup, onEditGroup, onResetForm, onSave, isFormValid
}: AddGroupModalProps) {

  const handleAddCondition = () => {
    onConditionsChange([...conditions, { field: '', operator: '>', value: 0 }]);
  };

  const handleRemoveCondition = (index: number) => {
    const newConds = conditions.filter((_, i) => i !== index);
    onConditionsChange(newConds);
  };

  const updateCondition = (index: number, key: keyof GroupCondition, val: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: val };

    if (key === 'field') {
      const fieldDef = CONDITION_FIELDS_FLAT.find(f => f.value === val);
      if (fieldDef?.type === 'boolean') {
        newConditions[index].value = 'true';
        newConditions[index].operator = '=';
      } else {
        newConditions[index].value = 0;
      }
    }

    onConditionsChange(newConditions);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" align="center" style={{ flex: 1 }}>
          <Title order={3}>Groups</Title>
          <ActionIcon size="md" variant="outline" color={"blue"} onClick={onResetForm} aria-label="Add New Group">
            <IconPlus size={18} />
          </ActionIcon>
        </Group>
      }
      size="lg"
      styles={{
        header: { paddingRight: 16 },
        title: { width: '100%', paddingRight: 10 }
      }}
    >
      <Stack gap="md">
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
                  onClick={() => onEditGroup(g)}
                  rightSection={
                    <ActionIcon
                      size="xs"
                      color={g.color}
                      variant="transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveGroup(g.id);
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
            onChange={(e) => onNameChange(e.currentTarget.value)}
          />
          <ColorInput
            label="Color"
            placeholder="Color"
            c="dimmed"
            value={color}
            onChange={onColorChange}
          />
        </Group>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Conditions</Text>
            <ActionIcon size={24} mr={6.5} variant="outline" color={"blue"} onClick={handleAddCondition} aria-label="Add Condition">
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
          {conditions.map((condition, index) => {
            const fieldDef = CONDITION_FIELDS_FLAT.find(f => f.value === condition.field);
            const isBoolean = fieldDef?.type === 'boolean';
            const units = fieldDef?.units || '';

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
          <Button onClick={onSave} disabled={!isFormValid}>
            {editingGroupId ? "Save Group" : "Add Group"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
