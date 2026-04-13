import { useCallback, useContext, useState } from 'react';
import {
  Card, Group, Box, Text, Stack, TextInput, ScrollArea,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';

export function DepartmentViewQuestions() {
  const store = useContext(Store);

  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  const {
    cardIconSize,
    cardIconStroke,
    toolbarWidth,
  } = useThemeConstants();

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = store.departmentViewQuestionsWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      store.setDepartmentViewQuestionsWidth(startWidth - (moveEvent.clientX - startX));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [store]);

  const handlePresetClick = (groupIdx: number, cardIdx: number) => {
    const { chartConfigs, chartLayouts, question } = presetStateCards[groupIdx].options[cardIdx];
    store.loadExplorePreset([...chartConfigs], {
      main: [...chartLayouts.main],
    }, question);
  };

  return useObserver(() => (
    <Box
      style={{
        width: store.departmentViewQuestionsWidth,
        flexShrink: 0,
        position: 'relative',
        borderLeft: '1px solid var(--mantine-color-gray-3)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box
        onMouseDown={startResizing}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      />
      <Box pt={0} pb={0} px="lg">
        <TextInput
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          mb="md"
        />
      </Box>
      <ScrollArea style={{ flex: 1 }} p="md" pt={0} pl="lg">
        {presetStateCards.map(({ groupLabel, options }, groupIdx) => {
          const filteredOptions = options.map((opt, cardIdx) => ({ opt, cardIdx }))
            .filter(({ opt }) => opt.question.toLowerCase().includes(searchQuery.toLowerCase()));
          if (filteredOptions.length === 0) return null;

          const isGroupActive = options.some((opt) => opt.question === store.activeDepartmentViewQuestion);

          return (
            <Box key={groupLabel} mb="xl">
              <Text
                mb="md"
                className={`${classes.variableTitle} ${
                  (hoveredIdx && hoveredIdx.group === groupIdx) || isGroupActive
                    ? classes.active
                    : ''
                }`.trim()}
              >
                {groupLabel}
              </Text>
              <Stack>
                {filteredOptions.map(({ opt: { question, Icon }, cardIdx }) => (
                  <Card
                    key={question}
                    withBorder
                    style={{ minHeight: toolbarWidth, cursor: 'pointer' }}
                    className={`${cardStyles.presetStateCard} ${classes.gridItem} ${store.activeDepartmentViewQuestion === question ? cardStyles.active : ''}`.trim()}
                    onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => handlePresetClick(groupIdx, cardIdx)}
                  >
                    <Group className={cardStyles.presetStateContent}>
                      <Group className={cardStyles.question} wrap="nowrap">
                        <Box className={cardStyles.iconContainer} style={{ flexShrink: 0 }}>
                          <Icon size={cardIconSize} stroke={cardIconStroke} />
                        </Box>
                        <Text size="sm">{question}</Text>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Box>
          );
        })}
      </ScrollArea>
    </Box>
  ));
}
