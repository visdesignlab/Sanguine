import {
  useMemo, useState, useContext, memo, useCallback, useEffect, useRef, useId,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  Box, CloseButton, Title, Flex, useMantineTheme,
  Tooltip, MantineTheme, Select, Button, Text, SegmentedControl,
} from '@mantine/core';
import {
  IconGripVertical,
  IconArrowUp,
  IconArrowsVertical,
  IconArrowRightDashed,
} from '@tabler/icons-react';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { Store } from '../../../../Store/Store';
import {
  DumbbellCase, DumbbellChartConfig, DumbbellData,
  LAB_RESULTS, DUMBBELL_X_AXIS_OPTIONS, DUMBBELL_MARGIN,
  DUMBBELL_CHAR_WIDTH_CASE, DUMBBELL_DOT_RADIUS,
  DUMBBELL_DRAG_LIMIT, DumbbellLabConfig as LabConfig,
} from '../../../../Types/application';
import { smallHoverColor } from '../../../../Theme/mantineTheme';
import { getProcessedDumbbellData, calculateDumbbellLayout } from './DumbbellUtils';

interface DumbbellChartSVGProps {
  totalWidth: number;
  height: number;
  yScale: ScaleLinear<number, number>;
  processedData: {
    id: string;
    label: string;
    cases: DumbbellCase[];
    nestedBins: {
      id: string;
      label: string;
      cases: DumbbellCase[];
      minPre: number;
      minPost: number;
    }[];
    avgPre: number | null;
    avgPost: number | null;
  }[];
  collapsedBinGroups: Set<string>;
  collapsedNestedBins: Set<string>;
  hoveredCollapse: string | null;
  theme: MantineTheme;
  onToggleBinGroupCollapse: (e: React.MouseEvent, id: string) => void;
  onToggleNestedBinCollapse: (e: React.MouseEvent, id: string) => void;
  setHoveredCollapse: (id: string | null) => void;
  labConfig: LabConfig;
  selectedX: string;
  showPre: boolean;
  showPost: boolean;
  targets: { preMin: number; postMin: number; postMax: number };
  visibleRange: [number, number];
}

// #region Y-Axis

// Separate Y-Axis
const DumbbellYAxis = memo(({
  height,
  hasNestedBins,
  yScale,
  theme,
  labConfig,
  targets,
  setTargets,
  hoveredTarget,
  setHoveredTarget,
}: {
  height: number;
  yScale: ScaleLinear<number, number>;
  theme: MantineTheme;
  labConfig: LabConfig;
  targets: { preMin: number; postMin: number; postMax: number };
  setTargets: React.Dispatch<React.SetStateAction<{ preMin: number; postMin: number; postMax: number }>>;
  hoveredTarget: string | null;
  setHoveredTarget: (t: string | null) => void;
  hasNestedBins: boolean;
}) => {
  const bottomMargin = hasNestedBins ? 50 : 25;
  const innerHeight = Math.max(0, height - DUMBBELL_MARGIN.top - bottomMargin);
  const [dragging, setDragging] = useState<'preMin' | 'postMin' | 'postMax' | null>(null);

  const handleDragStart = (type: 'preMin' | 'postMin' | 'postMax') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const pixelRange = innerHeight;
      const valueRange = labConfig.max - labConfig.min;
      const valuePerPixel = valueRange / pixelRange;
      const deltaValue = e.movementY * valuePerPixel;

      setTargets((prev: { preMin: number; postMin: number; postMax: number }) => {
        const val = prev[dragging as keyof typeof prev];
        let newVal = val - deltaValue;

        // Apply constraints
        let baseVal = 0;
        if (dragging === 'preMin') baseVal = labConfig.defaultTargets.preMin;
        if (dragging === 'postMin') baseVal = labConfig.defaultTargets.postMin;
        if (dragging === 'postMax') baseVal = labConfig.defaultTargets.postMax;

        // Clamp to +/- DUMBBELL_DRAG_LIMIT
        if (newVal > baseVal + DUMBBELL_DRAG_LIMIT) newVal = baseVal + DUMBBELL_DRAG_LIMIT;
        if (newVal < baseVal - DUMBBELL_DRAG_LIMIT) newVal = baseVal - DUMBBELL_DRAG_LIMIT;

        return { ...prev, [dragging!]: newVal };
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, yScale, targets, setTargets, innerHeight, labConfig.min, labConfig.max, labConfig.defaultTargets.preMin, labConfig.defaultTargets.postMin, labConfig.defaultTargets.postMax]);

  return (
    <svg width={DUMBBELL_MARGIN.left} height={height} style={{ display: 'block', flexShrink: 0 }}>

      {/* White background */}
      <rect width={DUMBBELL_MARGIN.left} height={height} fill="white" />

      {/* Y Axis Ticks */}
      {yScale.ticks(5).map((tick) => (
        <g key={tick} transform={`translate(${DUMBBELL_MARGIN.left}, ${yScale(tick) + DUMBBELL_MARGIN.top})`}>
          <text x={-10} y={4} textAnchor="end" fontSize={12} fill={theme.colors.gray[6]}>{tick}</text>
        </g>
      ))}

      {/* Y Axis Label */}
      <text
        transform={`translate(15, ${DUMBBELL_MARGIN.top + innerHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={12}
        fontWeight={500}
        fill={theme.colors.gray[8]}
      >
        {labConfig.label}
        {' '}
        (
        {labConfig.unit}
        )
      </text>

      {/* Target Handles */}
      <g>
        {/* Pre Min Handle */}
        {(hoveredTarget === 'preMin' || dragging === 'preMin') && (
          <Tooltip label={`Min Pre-op Target: ${targets.preMin.toFixed(1)} ${labConfig.unit}`} position="right">
            <g
              transform={`translate(${DUMBBELL_MARGIN.left}, ${yScale(targets.preMin) + DUMBBELL_MARGIN.top})`}
              style={{ cursor: 'ns-resize' }}
              onMouseDown={handleDragStart('preMin')}
              onMouseEnter={() => setHoveredTarget('preMin')}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {/* Expanded Hit Area */}
              <rect x={-20} y={-10} width={40} height={20} fill="transparent" />
              <path d="M 0 0 L -8 -5 L -8 5 Z" fill={theme.colors.teal[6]} />
              <line x1={-8} x2={0} y1={0} y2={0} stroke={theme.colors.teal[6]} strokeWidth={2} />
            </g>
          </Tooltip>
        )}

        {/* Post Min Handle */}
        {(hoveredTarget === 'postMin' || dragging === 'postMin') && (
          <Tooltip label={`Min Post-op Target (Transfused): ${targets.postMin.toFixed(1)} ${labConfig.unit}`} position="right">
            <g
              transform={`translate(${DUMBBELL_MARGIN.left}, ${yScale(targets.postMin) + DUMBBELL_MARGIN.top})`}
              style={{ cursor: 'ns-resize' }}
              onMouseDown={handleDragStart('postMin')}
              onMouseEnter={() => setHoveredTarget('postMin')}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {/* Expanded Hit Area */}
              <rect x={-20} y={-10} width={40} height={20} fill="transparent" />
              <path d="M 0 0 L -8 -5 L -8 5 Z" fill={theme.colors.indigo[6]} />
            </g>
          </Tooltip>
        )}

        {/* Post Max Handle */}
        {(hoveredTarget === 'postMax' || dragging === 'postMax') && (
          <Tooltip label={`Max Post-op Target (Transfused): ${targets.postMax.toFixed(1)} ${labConfig.unit}`} position="right">
            <g
              transform={`translate(${DUMBBELL_MARGIN.left}, ${yScale(targets.postMax) + DUMBBELL_MARGIN.top})`}
              style={{ cursor: 'ns-resize' }}
              onMouseDown={handleDragStart('postMax')}
              onMouseEnter={() => setHoveredTarget('postMax')}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {/* Expanded Hit Area */}
              <rect x={-20} y={-10} width={40} height={20} fill="transparent" />
              <path d="M 0 0 L -8 -5 L -8 5 Z" fill={theme.colors.indigo[6]} />
            </g>
          </Tooltip>
        )}
      </g>
    </svg>
  );
});
// #endregion

// #region Target Overlay
const TargetOverlay = memo(({
  totalWidth,
  yScale,
  targets,
  theme,
  labConfig,
  setHoveredTarget,
}: {
  totalWidth: number;
  yScale: ScaleLinear<number, number>;
  targets: { preMin: number; postMin: number; postMax: number };
  theme: MantineTheme;
  labConfig: LabConfig;
  setHoveredTarget: (t: string | null) => void;
}) => {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [mouseX, setMouseX] = useState<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.nativeEvent.offsetX);
  }, []);

  return (
    <g transform={`translate(0, ${DUMBBELL_MARGIN.top})`}>
      {/* Pre-op Region (Green) */}
      <rect
        x={0}
        y={0} // Top of chart (max value)
        width={totalWidth}
        height={Math.max(0, yScale(targets.preMin))}
        fill={theme.colors.teal[0]}
        opacity={0.3}
        style={{ pointerEvents: 'none' }}
      />

      {/* Pre-op Tooltip Anchor */}
      <Tooltip
        label={`Min Pre-op Target: ${targets.preMin.toFixed(1)} ${labConfig.unit}`}
        position="top"
        offset={5}
        opened={hoveredLine === 'preMin'}
      >
        <rect
          x={mouseX}
          y={yScale(targets.preMin)}
          width={1}
          height={1}
          fill="transparent"
          style={{ pointerEvents: 'none' }}
        />
      </Tooltip>

      {/* Pre-op Line & Hit Area */}
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.preMin)}
        y2={yScale(targets.preMin)}
        stroke={theme.colors.teal[4]}
        strokeDasharray="5 5"
        strokeWidth={1}
      />
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.preMin)}
        y2={yScale(targets.preMin)}
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('preMin'); setHoveredLine('preMin'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />

      {/* Post-op Region (Blue) */}
      <rect
        x={0}
        y={yScale(targets.postMax)}
        width={totalWidth}
        height={Math.max(0, yScale(targets.postMin) - yScale(targets.postMax))}
        fill={theme.colors.indigo[0]}
        opacity={0.3}
        style={{ pointerEvents: 'none' }}
      />

      {/* Post-op Max Tooltip Anchor */}
      <Tooltip
        label={`Max Post-op Target (Transfused): ${targets.postMax.toFixed(1)} ${labConfig.unit}`}
        position="bottom"
        offset={5}
        opened={hoveredLine === 'postMax'}
      >
        <rect
          x={mouseX}
          y={yScale(targets.postMax)}
          width={1}
          height={1}
          fill="transparent"
          style={{ pointerEvents: 'none' }}
        />
      </Tooltip>

      {/* Post-op Max Line & Hit Area */}
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.postMax)}
        y2={yScale(targets.postMax)}
        stroke={theme.colors.indigo[3]}
        strokeDasharray="5 5"
        strokeWidth={1}
      />
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.postMax)}
        y2={yScale(targets.postMax)}
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('postMax'); setHoveredLine('postMax'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />

      {/* Post-op Min Tooltip Anchor */}
      <Tooltip
        label={`Min Post-op Target (Transfused): ${targets.postMin.toFixed(1)} ${labConfig.unit}`}
        position="top"
        offset={5}
        opened={hoveredLine === 'postMin'}
      >
        <rect
          x={mouseX}
          y={yScale(targets.postMin)}
          width={1}
          height={1}
          fill="transparent"
          style={{ pointerEvents: 'none' }}
        />
      </Tooltip>

      {/* Post-op Min Line & Hit Area */}
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.postMin)}
        y2={yScale(targets.postMin)}
        stroke={theme.colors.indigo[3]}
        strokeDasharray="5 5"
        strokeWidth={1}
      />
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.postMin)}
        y2={yScale(targets.postMin)}
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('postMin'); setHoveredLine('postMin'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />
    </g>
  );
});
// #endregion

// #region Average Line
const AverageLine = memo(({
  x1, x2, y, label, color,
}: {
  x1: number;
  x2: number;
  y: number;
  label: React.ReactNode;
  color: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const gradientId = useId();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.nativeEvent.offsetX);
  }, []);

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1={y} y2={y}>
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="5%" stopColor={color} stopOpacity={1} />
          <stop offset="95%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Tooltip label={label} opened={hovered} position="top" offset={5}>
        <rect
          x={mouseX}
          y={y}
          width={1}
          height={1}
          fill="transparent"
          style={{ pointerEvents: 'none' }}
        />
      </Tooltip>
      <line
        x1={x1}
        x2={x2}
        y1={y}
        y2={y}
        stroke={`url(#${gradientId})`}
        strokeWidth={1.5}
        strokeOpacity={0.6}
        style={{ pointerEvents: 'none' }}
      />
      {/* Hit Area */}
      <line
        x1={x1}
        x2={x2}
        y1={y}
        y2={y}
        stroke="transparent"
        strokeWidth={10}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      />
    </g>
  );
});

DumbbellYAxis.displayName = 'DumbbellYAxis';
TargetOverlay.displayName = 'TargetOverlay';
AverageLine.displayName = 'MedianLine';

const Dumbbell = memo(({
  caseX,
  yScale,
  d,
  labConfig,
  showPre,
  showPost,
  selected,
  theme,
}: {
  caseX: number;
  yScale: ScaleLinear<number, number>;
  d: DumbbellCase;
  labConfig: LabConfig;
  showPre: boolean;
  showPost: boolean;
  selected: boolean;
  theme: MantineTheme;
}) => {
  const [hovered, setHovered] = useState(false);

  const preVal = d[labConfig.preKey] as number | null;
  const postVal = d[labConfig.postKey] as number | null;

  const activeColor = hovered ? smallHoverColor : (selected ? theme.colors.orange[6] : null);
  const lineColor = hovered ? smallHoverColor : (selected ? theme.colors.orange[4] : theme.colors.gray[4]);

  const preCircle = preVal !== null ? (
    <circle
      cx={caseX}
      cy={yScale(preVal)}
      r={DUMBBELL_DOT_RADIUS}
      fill={activeColor || theme.colors.teal[6]}
      fillOpacity={0.8}
    />
  ) : null;

  const postCircle = postVal !== null ? (
    <circle
      cx={caseX}
      cy={yScale(postVal)}
      r={DUMBBELL_DOT_RADIUS}
      fill={activeColor || theme.colors.indigo[6]}
      fillOpacity={0.8}
    />
  ) : null;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showPre && showPost && preVal !== null && postVal !== null && (
        <line
          x1={caseX}
          x2={caseX}
          y1={yScale(preVal)}
          y2={yScale(postVal)}
          stroke={lineColor}
          strokeWidth={1}
          strokeOpacity={0.8}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {showPre && preVal !== null && (
        <Tooltip
          label={(
            <Box>
              <Text size="xs">
                Surgical Case:
                {' '}
                {d.case_id}
              </Text>
              <Text size="xs">
                Pre-op:
                {' '}
                <Text component="span" fw={700} size="xs">
                  {preVal.toFixed(1)}
                  {' '}
                  {labConfig.unit}
                </Text>
              </Text>
            </Box>
          )}
          position="top"
        >
          {preCircle}
        </Tooltip>
      )}
      {showPost && postVal !== null && (
        <Tooltip
          label={(
            <Box>
              <Text size="xs">
                Surgical Case:
                {' '}
                {d.case_id}
              </Text>
              <Text size="xs">
                Post-op:
                {' '}
                <Text component="span" fw={700} size="xs">
                  {postVal.toFixed(1)}
                  {' '}
                  {labConfig.unit}
                </Text>
              </Text>
            </Box>
          )}
          position="bottom"
        >
          {postCircle}
        </Tooltip>
      )}
    </g>
  );
});
Dumbbell.displayName = 'Dumbbell';
// #endregion

// #region Dumbbell Chart Content
export const DumbbellChartContent = memo(({
  totalWidth,
  height,
  yScale,
  processedData,
  collapsedBinGroups,
  collapsedNestedBins,
  hoveredCollapse,
  theme,
  labConfig,
  selectedX,
  showPre,
  showPost,
  onToggleBinGroupCollapse,
  onToggleNestedBinCollapse,
  setHoveredCollapse,
  hasNestedBins,
  binGroupLayout,
  nestedBinLayout,
  showMedian,
  targets,
  setHoveredTarget,
  showTargets,
  visibleRange,
}: DumbbellChartSVGProps & {
  hasNestedBins: boolean,
  showPre: boolean,
  showPost: boolean,
  binGroupLayout: Map<string, { x: number, width: number, label: string }>,
  nestedBinLayout: Map<string, { x: number, width: number }>,
  showMedian: boolean,
  showTargets: boolean,
  targets: { preMin: number; postMin: number; postMax: number },
  setHoveredTarget: (t: string | null) => void,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const bottomMargin = hasNestedBins ? 50 : 25;
  const innerHeight = Math.max(0, height - DUMBBELL_MARGIN.top - bottomMargin);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing'>('idle');
  const [selection, setSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  const initialSelection = useRef<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const dragStart = useRef<{ x: number, y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartTop = DUMBBELL_MARGIN.top;
    const chartBottom = height - bottomMargin;

    if (selection) {
      const minX = Math.min(selection.x1, selection.x2);
      const maxX = Math.max(selection.x1, selection.x2);
      const minY = Math.min(selection.y1, selection.y2);
      const maxY = Math.max(selection.y1, selection.y2);
      const tolerance = 10;

      let handle = null;
      if (Math.abs(x - minX) < tolerance && Math.abs(y - minY) < tolerance) handle = 'nw';
      else if (Math.abs(x - maxX) < tolerance && Math.abs(y - minY) < tolerance) handle = 'ne';
      else if (Math.abs(x - minX) < tolerance && Math.abs(y - maxY) < tolerance) handle = 'sw';
      else if (Math.abs(x - maxX) < tolerance && Math.abs(y - maxY) < tolerance) handle = 'se';
      else if (Math.abs(y - minY) < tolerance && x > minX && x < maxX) handle = 'n';
      else if (Math.abs(y - maxY) < tolerance && x > minX && x < maxX) handle = 's';
      else if (Math.abs(x - minX) < tolerance && y > minY && y < maxY) handle = 'w';
      else if (Math.abs(x - maxX) < tolerance && y > minY && y < maxY) handle = 'e';

      if (handle) {
        setInteractionMode('resizing');
        setResizeHandle(handle);
        initialSelection.current = { ...selection };
        return;
      }

      if (x > minX && x < maxX && y > minY && y < maxY) {
        setInteractionMode('moving');
        dragStart.current = { x, y };
        initialSelection.current = { ...selection };
        return;
      }
    }

    if (y < chartTop || y > chartBottom) {
      setAppliedSelection(null);
      setSelection(null);
      return;
    }

    setInteractionMode('selecting');
    setSelection({
      x1: x,
      y1: y,
      x2: x,
      y2: y,
    });
    setAppliedSelection(null);
    initialSelection.current = {
      x1: x,
      y1: y,
      x2: x,
      y2: y,
    };
  }, [selection, height, bottomMargin]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartTop = DUMBBELL_MARGIN.top;
    const chartBottom = height - bottomMargin;
    const clampedY = Math.max(chartTop, Math.min(y, chartBottom));

    if (interactionMode === 'idle' && selection) {
      const minX = Math.min(selection.x1, selection.x2);
      const maxX = Math.max(selection.x1, selection.x2);
      const minY = Math.min(selection.y1, selection.y2);
      const maxY = Math.max(selection.y1, selection.y2);
      const tolerance = 10;

      let cursor = 'default';
      if ((Math.abs(x - minX) < tolerance && Math.abs(y - minY) < tolerance) || (Math.abs(x - maxX) < tolerance && Math.abs(y - maxY) < tolerance)) cursor = 'nwse-resize';
      else if ((Math.abs(x - maxX) < tolerance && Math.abs(y - minY) < tolerance) || (Math.abs(x - minX) < tolerance && Math.abs(y - maxY) < tolerance)) cursor = 'nesw-resize';
      else if ((Math.abs(y - minY) < tolerance || Math.abs(y - maxY) < tolerance) && x > minX && x < maxX) cursor = 'ns-resize';
      else if ((Math.abs(x - minX) < tolerance || Math.abs(x - maxX) < tolerance) && y > minY && y < maxY) cursor = 'ew-resize';
      else if (x > minX && x < maxX && y > minY && y < maxY) cursor = 'move';

      chartRef.current.style.cursor = cursor;
    }

    if (interactionMode === 'selecting' && initialSelection.current) {
      setSelection({
        ...initialSelection.current,
        x2: x,
        y2: clampedY,
      });
    } else if (interactionMode === 'moving' && initialSelection.current && dragStart.current) {
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;
      const currentMinY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const currentMaxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);

      let clampedDy = dy;
      if (currentMinY + dy < chartTop) clampedDy = chartTop - currentMinY;
      if (currentMaxY + dy > chartBottom) clampedDy = chartBottom - currentMaxY;

      setSelection({
        x1: initialSelection.current.x1 + dx,
        y1: initialSelection.current.y1 + clampedDy,
        x2: initialSelection.current.x2 + dx,
        y2: initialSelection.current.y2 + clampedDy,
      });
    } else if (interactionMode === 'resizing' && initialSelection.current) {
      const minX = Math.min(initialSelection.current.x1, initialSelection.current.x2);
      const maxX = Math.max(initialSelection.current.x1, initialSelection.current.x2);
      const minY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const maxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);

      let newMinX = minX; let newMaxX = maxX; let newMinY = minY; let newMaxY = maxY;
      if (resizeHandle?.includes('w')) newMinX = x;
      if (resizeHandle?.includes('e')) newMaxX = x;
      if (resizeHandle?.includes('n')) newMinY = clampedY;
      if (resizeHandle?.includes('s')) newMaxY = clampedY;

      setSelection({
        x1: newMinX,
        y1: newMinY,
        x2: newMaxX,
        y2: newMaxY,
      });
    }
  }, [interactionMode, selection, height, resizeHandle, bottomMargin]);

  const handleMouseUp = useCallback(() => {
    setInteractionMode('idle');
    setResizeHandle(null);
    dragStart.current = null;
    initialSelection.current = null;
    if (selection) {
      if (Math.abs(selection.x2 - selection.x1) < 5 && Math.abs(selection.y2 - selection.y1) < 5) {
        setSelection(null);
        setAppliedSelection(null);
      } else {
        setAppliedSelection(selection);
      }
    }
  }, [selection]);

  const isSelected = useCallback((cx: number, cy: number) => {
    if (!appliedSelection) return false;
    const minX = Math.min(appliedSelection.x1, appliedSelection.x2);
    const maxX = Math.max(appliedSelection.x1, appliedSelection.x2);
    const minY = Math.min(appliedSelection.y1, appliedSelection.y2);
    const maxY = Math.max(appliedSelection.y1, appliedSelection.y2);
    return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
  }, [appliedSelection]);

  const chartBody = useMemo(() => (
    <g transform={`translate(0, ${DUMBBELL_MARGIN.top})`}>
      {/* Render Stripe backgrounds first */}
      {processedData.map((binGroup, i) => {
        const layout = binGroupLayout.get(binGroup.id);
        const binGroupX = layout ? layout.x : 0;
        const binGroupWidth = layout ? layout.width : 100;

        if (binGroupX > visibleRange[1] || binGroupX + binGroupWidth < visibleRange[0]) return null;

        const binGroupColor = i % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];
        return (
          <rect
            key={`bg-${binGroup.id}`}
            x={binGroupX}
            y={0}
            width={binGroupWidth}
            height={innerHeight}
            fill={binGroupColor}
            opacity={0.3}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
      {yScale.ticks(5).map((tick) => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x1={0} x2={totalWidth - DUMBBELL_MARGIN.right} y1={0} y2={0} stroke={theme.colors.gray[3]} strokeDasharray="4 4" />
        </g>
      ))}

      {processedData.map((binGroup, binGroupIdx) => {
        const isBinGroupCollapsed = collapsedBinGroups.has(binGroup.id);
        const layout = binGroupLayout.get(binGroup.id);
        const binGroupWidth = layout ? layout.width : 100;
        const binGroupX = layout ? layout.x : 0;

        if (binGroupX > visibleRange[1] || binGroupX + binGroupWidth < visibleRange[0]) return null;

        const binGroupLabel = layout ? layout.label : binGroup.id;
        const binGroupColor = binGroupIdx % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];

        const { avgPre, avgPost } = binGroup;

        return (
          <g key={binGroup.id}>
            <Tooltip
              label={(
                <Box>
                  <Text size="xs">
                    {(() => {
                      if (selectedX === 'surgeon') return `Surgical Cases for ${binGroup.label}`;
                      if (selectedX === 'anesthesiologist') return `Surgical Cases for ${binGroup.label}`;
                      if (selectedX === 'year_quarter') return `Surgical Cases in ${binGroup.label}`;
                      if (['rbc', 'platelet', 'cryo', 'ffp'].includes(selectedX)) {
                        return `Surgical Cases where ${binGroup.label} Transfused`;
                      }
                      if (selectedX === 'cell_salvage') return `Surgical Cases where ${binGroup.label} used`;
                      return binGroup.label;
                    })()}
                  </Text>
                </Box>
              )}
              openDelay={200}
            >
              <rect
                x={binGroupX}
                y={!hasNestedBins ? innerHeight : innerHeight + 25}
                width={binGroupWidth}
                height={25}
                fill={isBinGroupCollapsed ? theme.colors.gray[4] : binGroupColor}
                stroke={theme.colors.gray[5]}
                strokeWidth={1}
              />
            </Tooltip>

            <text
              x={binGroupX + binGroupWidth / 2}
              y={!hasNestedBins ? innerHeight + 17 : innerHeight + 42}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={(isBinGroupCollapsed || (!hasNestedBins && collapsedNestedBins.has(binGroup.nestedBins[0].id))) ? theme.colors.gray[6] : theme.colors.gray[9]}
              style={{ pointerEvents: 'none' }}
            >
              {(isBinGroupCollapsed || (!hasNestedBins && collapsedNestedBins.has(binGroup.nestedBins[0].id))) ? '...' : binGroupLabel}
            </text>

            {!isBinGroupCollapsed && hasNestedBins && (
              <>
                <rect
                  x={binGroupX + binGroupWidth - 15}
                  y={innerHeight + 25}
                  width={15}
                  height={25}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredCollapse(binGroup.id)}
                  onMouseLeave={() => setHoveredCollapse(null)}
                  onClick={(e) => onToggleBinGroupCollapse(e, binGroup.id)}
                />
                {hoveredCollapse === binGroup.id && (
                  <path
                    d={isBinGroupCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'}
                    transform={`translate(${binGroupX + binGroupWidth - 12}, ${innerHeight + 31}) scale(0.6)`}
                    fill="none"
                    stroke={theme.colors.gray[7]}
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </>
            )}

            {!isBinGroupCollapsed && (
              <g>
                {binGroup.nestedBins.map((nestedBin, nestedBinIdx) => {
                  const isNestedBinCollapsed = collapsedNestedBins.has(nestedBin.id);
                  const nbLayout = nestedBinLayout.get(nestedBin.id);
                  const nestedBinWidth = nbLayout ? nbLayout.width : 40;
                  const currentNestedBinX = nbLayout ? nbLayout.x : 0;

                  if (currentNestedBinX > visibleRange[1] || currentNestedBinX + nestedBinWidth < visibleRange[0]) return null;

                  const nestedBinColor = nestedBinIdx % 2 === 0 ? theme.colors.gray[2] : theme.colors.gray[0];
                  const bgShade = (hasNestedBins && nestedBinIdx % 2 === 0) ? theme.colors.gray[1] : 'transparent';

                  return (
                    <g key={nestedBin.id}>
                      <rect
                        x={currentNestedBinX}
                        y={0}
                        width={nestedBinWidth}
                        height={innerHeight}
                        fill={bgShade}
                        opacity={0.3}
                        style={{ pointerEvents: 'none' }}
                      />
                      {hasNestedBins && (
                        <Tooltip
                          label={(
                            <Box>
                              <Text size="xs">
                                Surgical Cases in
                                {' '}
                                {nestedBin.label}
                                {' '}
                                {binGroup.label}
                              </Text>
                            </Box>
                          )}
                          openDelay={200}
                        >
                          <rect
                            x={currentNestedBinX}
                            y={innerHeight}
                            width={nestedBinWidth}
                            height={25}
                            fill={isNestedBinCollapsed ? theme.colors.gray[4] : nestedBinColor}
                            stroke={theme.colors.gray[4]}
                            strokeWidth={1}
                          />
                        </Tooltip>
                      )}
                      {/* Nested Bin Label */}
                      {hasNestedBins && (
                        <text
                          x={currentNestedBinX + nestedBinWidth / 2}
                          y={innerHeight + 17}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={400}
                          fill={theme.colors.gray[6]}
                          style={{ pointerEvents: 'none' }}
                        >
                          {isNestedBinCollapsed ? '...' : nestedBin.label}
                        </text>
                      )}
                      <rect
                        x={currentNestedBinX + nestedBinWidth - 10}
                        y={innerHeight}
                        width={10}
                        height={25}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredCollapse(nestedBin.id)}
                        onMouseLeave={() => setHoveredCollapse(null)}
                        onClick={(e) => onToggleNestedBinCollapse(e, nestedBin.id)}
                      />
                      {(hoveredCollapse === nestedBin.id || isNestedBinCollapsed) && (
                        <path
                          d={isNestedBinCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'}
                          transform={`translate(${currentNestedBinX + nestedBinWidth - 8}, ${innerHeight + 6.5}) scale(0.5)`}
                          fill="none"
                          stroke={theme.colors.gray[7]}
                          strokeWidth={2}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* Cases */}
                      {(() => {
                        if (isNestedBinCollapsed) return null;

                        const startIdxRaw = Math.floor((visibleRange[0] - currentNestedBinX - (DUMBBELL_CHAR_WIDTH_CASE / 2)) / DUMBBELL_CHAR_WIDTH_CASE);
                        const endIdxRaw = Math.ceil((visibleRange[1] - currentNestedBinX - (DUMBBELL_CHAR_WIDTH_CASE / 2)) / DUMBBELL_CHAR_WIDTH_CASE);

                        const startIdx = Math.max(0, startIdxRaw);
                        const endIdx = Math.min(nestedBin.cases.length, endIdxRaw + 1);

                        if (startIdx >= nestedBin.cases.length || endIdx <= 0 || startIdx >= endIdx) return null;

                        return nestedBin.cases.slice(startIdx, endIdx).map((d, relativeIdx) => {
                          const vIdx = startIdx + relativeIdx;
                          const caseX = currentNestedBinX + vIdx * DUMBBELL_CHAR_WIDTH_CASE + DUMBBELL_CHAR_WIDTH_CASE / 2;

                          const preVal = d[labConfig.preKey] as number | null;
                          const postVal = d[labConfig.postKey] as number | null;

                          const cyPre = preVal !== null ? yScale(preVal) + DUMBBELL_MARGIN.top : null;
                          const cyPost = postVal !== null ? yScale(postVal) + DUMBBELL_MARGIN.top : null;

                          const selected = (cyPre !== null && isSelected(caseX, cyPre)) || (cyPost !== null && isSelected(caseX, cyPost));

                          return (
                            <Dumbbell
                              key={d.case_id}
                              caseX={caseX}
                              yScale={yScale}
                              d={d}
                              labConfig={labConfig}
                              showPre={showPre}
                              showPost={showPost}
                              selected={selected}
                              theme={theme}
                            />
                          );
                        });
                      })()}
                    </g>
                  );
                })}

                {/* Average Lines */}
                {showMedian && showPre && avgPre !== null && (
                  <AverageLine
                    x1={binGroupX}
                    x2={binGroupX + binGroupWidth}
                    y={yScale(avgPre)}
                    label={(
                      <Box>
                        <Text size="xs">
                          {DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}
                          :
                          {' '}
                          {binGroup.label}
                        </Text>
                        <Text size="xs">
                          <Text component="span" fw={700}>Median</Text>
                          {' '}
                          Pre-op
                          {' '}
                          {labConfig.label}
                          :
                          {' '}
                          <Text component="span" fw={700} size="xs">
                            {avgPre.toFixed(1)}
                            {' '}
                            {labConfig.unit}
                          </Text>
                        </Text>
                      </Box>
                    )}
                    color={theme.colors.teal[4]}
                  />
                )}
                {showMedian && showPost && avgPost !== null && (
                  <AverageLine
                    x1={binGroupX}
                    x2={binGroupX + binGroupWidth}
                    y={yScale(avgPost)}
                    label={(
                      <Box>
                        <Text size="xs">
                          {DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}
                          :
                          {' '}
                          {binGroup.label}
                        </Text>
                        <Text size="xs">
                          <Text component="span" fw={700}>Median</Text>
                          {' '}
                          Post-op
                          {' '}
                          {labConfig.label}
                          :
                          {' '}
                          <Text component="span" fw={700} size="xs">
                            {avgPost.toFixed(1)}
                            {' '}
                            {labConfig.unit}
                          </Text>
                        </Text>
                      </Box>
                    )}
                    color={theme.colors.indigo[4]}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  ), [processedData, collapsedBinGroups, collapsedNestedBins, hoveredCollapse, theme, labConfig, showPre, showPost, yScale, innerHeight, hasNestedBins, onToggleBinGroupCollapse, onToggleNestedBinCollapse, setHoveredCollapse, isSelected, totalWidth, showMedian, binGroupLayout, nestedBinLayout, selectedX, visibleRange]);

  return (
    <div
      ref={chartRef}
      style={{
        width: totalWidth,
        height,
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg width={totalWidth} height={height}>
        {showTargets && (
          <TargetOverlay
            totalWidth={totalWidth}
            yScale={yScale}
            targets={targets}
            theme={theme}
            labConfig={labConfig}
            setHoveredTarget={setHoveredTarget}
          />
        )}
        {chartBody}
        {selection && (
          <rect
            x={Math.min(selection.x1, selection.x2)}
            y={Math.min(selection.y1, selection.y2)}
            width={Math.abs(selection.x2 - selection.x1)}
            height={Math.abs(selection.y2 - selection.y1)}
            fill={theme.colors.orange[2]}
            fillOpacity={0.2}
            stroke={theme.colors.orange[6]}
            strokeDasharray="4 2"
          />
        )}
      </svg>
    </div>
  );
});
// #endregion

// #region Dumbbell Chart Final
DumbbellChartContent.displayName = 'DumbbellChartContent';

export function DumbbellChart({ chartConfig }: { chartConfig: DumbbellChartConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  // State
  const [collapsedBinGroups, setCollapsedBinGroups] = useState<Set<string>>(new Set());
  const [collapsedNestedBins, setCollapsedNestedBins] = useState<Set<string>>(new Set());
  const [selectedLab, setSelectedLab] = useState<string>('hgb');
  const [selectedX, setSelectedX] = useState<string>('surgeon');
  const [showPre, setShowPre] = useState<boolean>(true);
  const [showPost, setShowPost] = useState<boolean>(true);
  const [showTargets, setShowTargets] = useState<boolean>(true);
  const [showMedian, setShowMedian] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<string>('time');
  const [providerSort, setProviderSort] = useState<'alpha' | 'count' | 'pre' | 'post'>('alpha');

  // Clear provider sorts when global sort changes
  const handleSortChange = (value: string) => {
    setSortMode(value);
  };

  const labConfig = useMemo(() => {
    const pre = LAB_RESULTS.find((l) => l.metricId === selectedLab && l.value.startsWith('pre'));
    const post = LAB_RESULTS.find((l) => l.metricId === selectedLab && l.value.startsWith('post'));
    if (!pre || !post) {
      // Fallback or empty config if not found (shouldn't happen with controlled select)
      return {
        label: '',
        unit: '',
        min: 0,
        max: 100,
        preKey: 'pre_hgb' as keyof DumbbellCase,
        postKey: 'post_hgb' as keyof DumbbellCase,
        defaultTargets: { preMin: 0, postMin: 0, postMax: 0 },
      };
    }

    return {
      label: pre.metricLabel,
      unit: pre.units.avg,
      min: pre.range.min,
      max: pre.range.max,
      preKey: pre.value as keyof DumbbellCase,
      postKey: post.value as keyof DumbbellCase,
      defaultTargets: {
        preMin: pre.target.min,
        postMin: post.target.min,
        postMax: post.target.max,
      },
    } as LabConfig;
  }, [selectedLab]);

  // Targets
  const [targets, setTargets] = useState(labConfig.defaultTargets);

  // Reset targets when lab changes
  useEffect(() => {
    setTargets(labConfig.defaultTargets);
  }, [selectedLab, labConfig.defaultTargets]);

  // Hover state for collapse arrows
  const [hoveredCollapse, setHoveredCollapse] = useState<string | null>(null);

  const hasNestedBins = useMemo(() => selectedX === 'year_quarter', [selectedX]);

  // Virtualization state
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([-1000, 2000]);

  const handleScroll = useCallback(() => {
    if (scrollViewportRef.current) {
      const { scrollLeft, clientWidth } = scrollViewportRef.current;
      // Overscan by 1000px on each side
      setVisibleRange([scrollLeft - 1000, scrollLeft + clientWidth + 1000]);
    }
  }, []);

  useEffect(() => {
    handleScroll();
    const ro = new ResizeObserver(() => handleScroll());
    if (scrollViewportRef.current) {
      ro.observe(scrollViewportRef.current);
    }
    return () => ro.disconnect();
  }, [handleScroll]);

  // Hover state for targets
  const [hoveredTarget, setHoveredTargetRaw] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const setHoveredTarget = useCallback((target: string | null) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (target) {
      setHoveredTargetRaw(target);
    } else {
      // Delay clearing to allow moving from line to handle
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredTargetRaw(null);
      }, 300);
    }
  }, []);

  // Handlers
  const handleToggleBinGroupCollapse = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedBinGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleNestedBinCollapse = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedNestedBins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Process Data
  const processedData = useMemo(() => getProcessedDumbbellData(
    (store.exploreChartData[chartConfig.chartId] as DumbbellData) || [],
    selectedX,
    labConfig,
    sortMode,
    hasNestedBins,
    providerSort,
  ), [store.exploreChartData, chartConfig.chartId, labConfig, selectedX, sortMode, hasNestedBins, providerSort]);

  // Layout & Width Calculation
  const layoutData = useMemo(() => calculateDumbbellLayout(
    processedData,
    collapsedBinGroups,
    collapsedNestedBins,
    selectedX,
    (t: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = `600 12px ${theme.fontFamily}`;
        return context.measureText(t).width;
      }
      return t.length * 7;
    },
  ), [processedData, collapsedBinGroups, collapsedNestedBins, selectedX, theme.fontFamily]);

  // Calculate total width - content starts at 0, only add Right margin
  const totalWidth = layoutData.items.reduce((acc, item) => acc + item.width, 0) + DUMBBELL_MARGIN.right;

  // Responsive Height
  const { ref, height: measuredHeight } = useElementSize();
  const height = measuredHeight || 400; // Fallback
  const bottomMargin = hasNestedBins ? 50 : 25;
  const innerHeight = Math.max(0, height - DUMBBELL_MARGIN.top - bottomMargin);

  const yDomain = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;

    processedData.forEach((binGroup) => {
      binGroup.nestedBins.forEach((nestedBin) => {
        nestedBin.cases.forEach((c) => {
          const preVal = c[labConfig.preKey] as number | null;
          const postVal = c[labConfig.postKey] as number | null;

          if (preVal !== null && preVal !== undefined) {
            minVal = Math.min(minVal, preVal);
            maxVal = Math.max(maxVal, preVal);
          }
          if (postVal !== null && postVal !== undefined) {
            minVal = Math.min(minVal, postVal);
            maxVal = Math.max(maxVal, postVal);
          }
        });
      });
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      return [labConfig.min, labConfig.max];
    }

    if (minVal === maxVal) {
      return [minVal - 1, maxVal + 1];
    }

    const diff = maxVal - minVal;
    const padding = diff * 0.05; // 5% padding
    return [minVal - padding, maxVal + padding];
  }, [processedData, labConfig]);

  const yScale = useMemo(() => scaleLinear()
    .domain(yDomain as [number, number])
    .range([innerHeight, 0]), [innerHeight, yDomain]);
  return (
    <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>
      {/* Header */}
      <Flex direction="row" justify="space-between" align="center" pl="md" pr="md" pt="xs">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            <span style={{ color: theme.colors.gray[6], fontWeight: 500 }}>Pre-op & Post-op</span>
            {' '}
            {labConfig.label}
            {' '}
            <span style={{ color: theme.colors.gray[6], fontWeight: 500 }}>by</span>
            {' '}
            {DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label || selectedX}
          </Title>
        </Flex>
        <Flex direction="row" align="center" gap="sm">
          <Flex direction="row" align="center" gap="xs">
            <Text size="xs" c="dimmed" fw={500}>Sort Cases:</Text>
            <SegmentedControl
              size="xs"
              value={sortMode}
              onChange={handleSortChange}
              data={[
                {
                  label: (
                    <Tooltip label={`Sort cases by pre-operative values per ${DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}`} openDelay={500}>
                      <Flex align="center" justify="center" gap={4}>
                        Pre
                        {sortMode === 'pre' && <IconArrowUp size={12} stroke={2} />}
                      </Flex>
                    </Tooltip>
                  ),
                  value: 'pre',
                },
                {
                  label: (
                    <Tooltip label={`Sort cases by post-operative values per ${DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}`} openDelay={500}>
                      <Flex align="center" justify="center" gap={4}>
                        Post
                        {sortMode === 'post' && <IconArrowUp size={12} stroke={2} />}
                      </Flex>
                    </Tooltip>
                  ),
                  value: 'post',
                },
                {
                  label: (
                    <Tooltip label={`Sort cases by pre-post gap per ${DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}`} openDelay={500}>
                      <Flex align="center" justify="center" gap={4}>
                        Gap
                        {sortMode === 'gap' && <IconArrowsVertical size={12} stroke={2} />}
                      </Flex>
                    </Tooltip>
                  ),
                  value: 'gap',
                },
                {
                  label: (
                    <Tooltip label={`Sort cases by time per ${DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label}`} openDelay={500}>
                      <Flex align="center" justify="center" gap={4}>
                        Time
                        {sortMode === 'time' && <IconArrowRightDashed size={12} stroke={2} />}
                      </Flex>
                    </Tooltip>
                  ),
                  value: 'time',
                },
              ]}
              styles={(t) => ({
                root: {
                  backgroundColor: 'transparent',
                  border: `1px solid ${t.colors.gray[3]}`,
                  minHeight: 30,
                },
                control: {
                  border: '0 !important',
                },
                label: {
                  padding: '0 8px',
                  fontWeight: 500,
                  '&[data-active]': {
                    color: sortMode === 'pre'
                      ? t.colors.teal[7]
                      : sortMode === 'post'
                        ? t.colors.indigo[7]
                        : t.colors.gray[7],
                  },
                },
                indicator: {
                  backgroundColor: sortMode === 'pre'
                    ? t.colors.teal[1]
                    : sortMode === 'post'
                      ? t.colors.indigo[1]
                      : t.colors.gray[2],
                },
              })}
            />
          </Flex>

          <Flex direction="row" align="center" gap="xs" ml={0}>
            <Text size="xs" c="dimmed" fw={500}>Show:</Text>
            <Button.Group>
              <Tooltip label="Show/hide pre-operative values" openDelay={500}>
                <Button
                  size="xs"
                  px={8}
                  variant={showPre ? 'light' : 'default'}
                  color="teal"
                  onClick={() => setShowPre(!showPre)}
                  styles={{
                    root: {
                      borderColor: showPre ? theme.colors.teal[6] : undefined,
                      fontWeight: 400,
                    },
                  }}
                >
                  Pre
                </Button>
              </Tooltip>
              <Tooltip label="Show/hide post-operative values" openDelay={500}>
                <Button
                  size="xs"
                  px={8}
                  variant={showPost ? 'light' : 'default'}
                  color="indigo"
                  onClick={() => setShowPost(!showPost)}
                  styles={{
                    root: {
                      borderColor: showPost ? theme.colors.indigo[6] : undefined,
                      marginLeft: -1,
                      fontWeight: 400,
                    },
                  }}
                >
                  Post
                </Button>
              </Tooltip>
              <Tooltip label="Show/hide target values" openDelay={500}>
                <Button
                  size="xs"
                  px={8}
                  variant={showTargets ? 'light' : 'default'}
                  color="gray"
                  onClick={() => setShowTargets(!showTargets)}
                  styles={{
                    root: {
                      marginLeft: -1,
                      borderColor: showTargets ? theme.colors.gray[6] : theme.colors.gray[4],
                      fontWeight: 400,
                      color: theme.colors.gray[9],
                    },
                  }}
                >
                  Target
                </Button>
              </Tooltip>
              <Tooltip label="Show/hide median values" openDelay={500}>
                <Button
                  size="xs"
                  px={8}
                  variant={showMedian ? 'light' : 'default'}
                  color="gray"
                  onClick={() => setShowMedian(!showMedian)}
                  styles={{
                    root: {
                      marginLeft: -1,
                      borderColor: showMedian ? theme.colors.gray[6] : theme.colors.gray[4],
                      fontWeight: 400,
                      color: theme.colors.gray[9],
                    },
                  }}
                >
                  Avg
                </Button>
              </Tooltip>
            </Button.Group>
          </Flex>
          <Select
            data={DUMBBELL_X_AXIS_OPTIONS}
            value={selectedX}
            onChange={(value) => setSelectedX(value || 'surgeon')}
            size="xs"
            w={160}
            allowDeselect={false}
            leftSection={<Title order={6} c="dimmed" style={{ fontSize: '10px' }}>X</Title>}
          />
          <Select
            data={Array.from(new Set(LAB_RESULTS.map((l) => l.metricId)))
              .filter((id) => id !== 'ferritin')
              .map((id) => {
                const res = LAB_RESULTS.find((l) => l.metricId === id);
                return {
                  value: id,
                  label: res?.metricLabel || id,
                };
              })}
            value={selectedLab}
            onChange={(value) => setSelectedLab(value || 'hgb')}
            size="xs"
            w={160}
            allowDeselect={false}
            leftSection={<Title order={6} c="dimmed" style={{ fontSize: '10px' }}>Y</Title>}
          />
          <CloseButton onClick={() => { store.removeExploreChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/* Chart Area */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }} ref={ref}>
        <Flex direction="row" h={height}>
          {/* Fixed Y Axis */}
          <div style={{ position: 'relative' }}>
            <DumbbellYAxis
              height={height}
              hasNestedBins={hasNestedBins}
              yScale={yScale}
              theme={theme}
              labConfig={labConfig}
              targets={targets}
              setTargets={setTargets}
              hoveredTarget={hoveredTarget}
              setHoveredTarget={setHoveredTarget}
            />

            {/* Provider Sort Toggle */}
            {(selectedX === 'surgeon' || selectedX === 'anesthesiologist') && (
              <Box style={{
                position: 'absolute', bottom: 0, right: 5, zIndex: 10,
              }}
              >
                <Tooltip
                  label={`Sort ${DUMBBELL_X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label} Bins: ${providerSort === 'alpha' ? 'A/Z →' : providerSort === 'count' ? 'Case Count →' : providerSort === 'pre' ? 'Pre-op Avg →' : 'Post-op Avg →'
                    }`}
                  position="right"
                >
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    px={4}
                    h={26}
                    style={{
                      fontSize: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      border: `1px solid ${theme.colors.gray[3]}`,
                    }}
                    onClick={() => {
                      const order: ('alpha' | 'count' | 'pre' | 'post')[] = ['alpha', 'count', 'pre', 'post'];
                      const nextSort = order[(order.indexOf(providerSort) + 1) % order.length];
                      setProviderSort(nextSort);
                    }}
                  >
                    {providerSort === 'alpha' && 'A/Z →'}
                    {providerSort === 'count' && 'Cases →'}
                    {providerSort === 'pre' && <Text size="0.6rem" fw={700} c="teal">Pre →</Text>}
                    {providerSort === 'post' && <Text size="0.6rem" fw={700} c="indigo">Post →</Text>}
                  </Button>
                </Tooltip>
              </Box>
            )}
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Box style={{ overflowX: 'auto', overflowY: 'hidden' }} ref={scrollViewportRef} onScroll={handleScroll}>
              <DumbbellChartContent
                totalWidth={totalWidth}
                height={height}
                yScale={yScale}
                processedData={processedData}
                collapsedBinGroups={collapsedBinGroups}
                collapsedNestedBins={collapsedNestedBins}
                onToggleBinGroupCollapse={handleToggleBinGroupCollapse}
                onToggleNestedBinCollapse={handleToggleNestedBinCollapse}
                hoveredCollapse={hoveredCollapse}
                setHoveredCollapse={setHoveredCollapse}
                labConfig={labConfig}
                selectedX={selectedX}
                showPre={showPre}
                showPost={showPost}
                targets={targets}
                setHoveredTarget={setHoveredTarget}
                showTargets={showTargets}
                visibleRange={visibleRange}
                showMedian={showMedian}
                hasNestedBins={hasNestedBins}
                binGroupLayout={layoutData.binGroupLayout}
                nestedBinLayout={layoutData.nestedBinLayout}
                theme={theme}
              />
            </Box>
          </div>
        </Flex>
      </div>
    </Box>
  );
}
