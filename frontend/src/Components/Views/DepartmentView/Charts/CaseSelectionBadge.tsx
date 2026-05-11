import { useEffect, useState } from 'react';
import {
  Flex, Text, Tooltip, ActionIcon, useMantineTheme,
} from '@mantine/core';
import { IconFocusCentered, IconX } from '@tabler/icons-react';
import { caseSelection } from '../../../../Store/CaseSelection';

/**
 * Compact badge showing the count of selected surgery cases with focus-mode and clear controls.
 *
 * - Hover the badge → temporarily dim non-selected cases in all charts
 * - Click the badge → lock focus-dimming until clicked again
 * - Click × → clear all selections and exit focus mode
 *
 * Renders nothing when no cases are selected.
 */
export function CaseSelectionBadge() {
  const theme = useMantineTheme();
  const [count, setCount] = useState(caseSelection.selectedCaseIds.size);
  const [focused, setFocused] = useState(caseSelection.isFocusModeActive);

  useEffect(() => caseSelection.subscribe(() => {
    setCount(caseSelection.selectedCaseIds.size);
    setFocused(caseSelection.isFocusModeActive);
  }), []);

  const handleToggleFocus = () => {
    caseSelection.setFocusModeActive(!caseSelection.isFocusModeActive);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    caseSelection.clearSelected();
  };

  if (count === 0) return null;

  return (
    <Tooltip
      label={focused ? 'Click to unlock focus mode' : 'Click to lock focus mode (dims other cases)'}
      openDelay={400}
      withinPortal
    >
      <Flex
        align="center"
        gap={4}
        px={8}
        style={{
          height: 26,
          borderRadius: 13,
          border: `1px solid ${focused ? theme.colors.orange[5] : theme.colors.gray[4]}`,
          background: focused ? theme.colors.orange[0] : theme.colors.gray[0],
          cursor: 'pointer',
          userSelect: 'none',
          flexShrink: 0,
          transition: 'background 120ms, border-color 120ms',
        }}
        onMouseEnter={() => caseSelection.setHoveringBadge(true)}
        onMouseLeave={() => caseSelection.setHoveringBadge(false)}
        onClick={handleToggleFocus}
      >
        <IconFocusCentered
          size={13}
          style={{
            color: focused ? theme.colors.orange[6] : theme.colors.gray[6],
            flexShrink: 0,
          }}
        />
        <Text
          size="xs"
          fw={500}
          style={{
            color: focused ? theme.colors.orange[7] : theme.colors.gray[7],
            lineHeight: 1,
          }}
        >
          {count}
          {' '}
          Selected
        </Text>
        <ActionIcon
          size={16}
          variant="transparent"
          color={focused ? 'orange' : 'gray'}
          onClick={handleClear}
          style={{ marginLeft: 2 }}
          aria-label="Clear selection"
        >
          <IconX size={10} />
        </ActionIcon>
      </Flex>
    </Tooltip>
  );
}
