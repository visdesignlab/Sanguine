import {
  Accordion, ActionIcon, Badge, Flex, Title, Tooltip, Box,
} from '@mantine/core';
import { useContext } from 'react';
import { IconRestore } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import { FilterCountKey } from '../../../Types/application';

export function FilterHeader({
  countName, title, tooltipLabel, resetFunc, countOverride, disabled, disabledTooltip,
}: {
  countName: FilterCountKey,
  title: string,
  tooltipLabel: string,
  resetFunc: () => void,
  countOverride?: number,
  disabled?: boolean,
  disabledTooltip?: string
}) {
  const store = useContext(Store);

  return useObserver(() => {
    const count = countOverride !== undefined ? countOverride : (store[countName] as number);

    const content = (
      <Flex align="center">
        <Accordion.Control px={2} disabled={disabled} style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
          <Flex align="center" wrap="nowrap">
            <Tooltip label={tooltipLabel} disabled={disabled}>
              <Title order={4} c={count ? 'blue.6' : undefined} style={{ whiteSpace: 'nowrap' }}>{title}</Title>
            </Tooltip>

            <Flex align="center" gap={4} ml="auto">
              {count > 0 && (
                <>
                  <Badge color="blue" radius="sm" variant="light">
                    {count}
                  </Badge>
                  <Tooltip label={`Reset ${title}`}>
                    <ActionIcon
                      size="xs"
                      aria-label={`Reset ${title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        resetFunc();
                      }}
                    >
                      <IconRestore stroke={1} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </Flex>
          </Flex>
        </Accordion.Control>
      </Flex>
    );

    if (disabled && disabledTooltip) {
      return (
        <Tooltip label={disabledTooltip} position="left" withinPortal>
          <Box style={{ cursor: 'not-allowed' }}>
            {content}
          </Box>
        </Tooltip>
      );
    }

    return content;
  });
}
