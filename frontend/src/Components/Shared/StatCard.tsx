import { ReactNode, useState } from 'react';
import {
  Card, Flex, Group, LoadingOverlay, Text, Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useThemeConstants } from '../../Theme/mantineTheme';
import { getIconForVar } from '../../Utils/icons';
import gridItemStyles from '../Views/GridLayoutItem.module.css';
import statCardStyles from './StatCard.module.css';

type StatIcon = ReturnType<typeof getIconForVar>;

interface StatCardProps {
  title: string;
  value: string;
  icon: StatIcon;
  loading?: boolean;
  onRemove?: () => void;
  sparkline?: ReactNode;
  comparison?: ReactNode;
}

export function StatCard({
  title, value, icon: Icon, loading, onRemove, sparkline, comparison,
}: StatCardProps) {
  const { cardIconSize, cardIconStroke } = useThemeConstants();
  const [isHovered, setIsHovered] = useState(false);

  const showTrash = isHovered && !!onRemove;
  const CardIcon = showTrash ? IconTrash : Icon;

  return (
    <Card
      className={gridItemStyles.gridItem}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <LoadingOverlay visible={!!loading} zIndex={1} overlayProps={{ radius: 'sm', blur: 2 }} />
      <Group justify="space-between" align="center">
        <Text
          className={`${gridItemStyles.variableTitle} ${isHovered ? gridItemStyles.active : ''} ${statCardStyles.titleEllipsis}`.trim()}
          title={title}
        >
          {title}
        </Text>
        <Group gap={4} align="center" style={{ justifyContent: 'flex-end' }}>
          <CardIcon
            className={`${statCardStyles.icon} ${showTrash ? statCardStyles.deleteIcon : ''}`.trim()}
            size={cardIconSize}
            stroke={cardIconStroke}
            onClick={showTrash ? onRemove : undefined}
            style={{ cursor: showTrash ? 'pointer' : 'default' }}
          />
        </Group>
      </Group>
      <Flex align="center" gap={8} mt="sm" className={statCardStyles.valueRow}>
        <Title order={2} className={statCardStyles.metricValue}>
          {value}
        </Title>
        {sparkline && (
          <div className={statCardStyles.sparklineWrap}>
            {sparkline}
          </div>
        )}
      </Flex>
      {comparison && (
        <Group
          align="center"
          mt="sm"
          gap={2}
          className={`${statCardStyles.comparisonText} ${isHovered ? statCardStyles.comparisonTextHovered : ''}`.trim()}
        >
          {comparison}
        </Group>
      )}
    </Card>
  );
}
