import {
  useMemo, useState, useContext, memo, useCallback, useEffect, useRef,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  ScrollArea, Box, CloseButton, Title, Flex, useMantineTheme,
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
  LAB_RESULTS,
} from '../../../../Types/application';

// Constants
const MARGIN = {
  top: 40, right: 30, bottom: 60, left: 60,
};
const CHAR_WIDTH_CASE = 4; // Increased spacing (was 8)
const DOT_RADIUS = 3; // Slightly larger dot radius
const EMPTY_VISIT_WIDTH = 30; // Minimum width for empty visit/quarter buckets

// Target Configuration
const DRAG_LIMIT = 1.0;

// X-Axis Configurations
const X_AXIS_OPTIONS = [
  { value: 'surgeon', label: 'Surgeon' },
  { value: 'anesthesiologist', label: 'Anesthesiologist' },
  { value: 'year_quarter', label: 'Year & Quarter' },
  { value: 'rbc', label: 'Intraoperative RBCs Transfused' },
  { value: 'platelet', label: 'Intraoperative Platelets Transfused' },
  { value: 'cryo', label: 'Intraoperative Cryo Transfused' },
  { value: 'ffp', label: 'Intraoperative FFP Transfused' },
  { value: 'cell_salvage', label: 'Cell Salvage Volume (mL)' },
];

type SortState = 'none' | 'pre' | 'post' | 'gap';

interface LabConfig {
  label: string;
  unit: string;
  min: number;
  max: number;
  preKey: keyof DumbbellCase;
  postKey: keyof DumbbellCase;
  defaultTargets: { preMin: number; postMin: number; postMax: number };
}

interface DumbbellChartSVGProps {
  totalWidth: number;
  height: number;
  yScale: ScaleLinear<number, number>;
  processedData: {
    id: string;
    cases: DumbbellCase[];
    visits: {
      id: string;
      label: string;
      cases: DumbbellCase[];
      minPre: number;
      minPost: number;
    }[];
  }[];
  collapsedProviders: Set<string>;
  collapsedVisits: Set<string>;
  hoveredCollapse: string | null;
  theme: MantineTheme;
  onToggleProviderCollapse: (e: React.MouseEvent, id: string) => void;
  onToggleVisitCollapse: (e: React.MouseEvent, id: string) => void;
  setHoveredCollapse: (id: string | null) => void;
  labConfig: LabConfig;
  showPre: boolean;
  showPost: boolean;
  targets: { preMin: number; postMin: number; postMax: number };
}

// Separate Y-Axis Component
const DumbbellYAxis = memo(({
  height,
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
}) => {
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
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

        // Clamp to +/- DRAG_LIMIT
        if (newVal > baseVal + DRAG_LIMIT) newVal = baseVal + DRAG_LIMIT;
        if (newVal < baseVal - DRAG_LIMIT) newVal = baseVal - DRAG_LIMIT;

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
    <svg width={MARGIN.left} height={height} style={{ display: 'block', flexShrink: 0 }}>

      {/* White background */}
      <rect width={MARGIN.left} height={height} fill="white" />

      {/* Y Axis Ticks */}
      {yScale.ticks(5).map((tick) => (
        <g key={tick} transform={`translate(${MARGIN.left}, ${yScale(tick) + MARGIN.top})`}>
          <text x={-10} y={4} textAnchor="end" fontSize={12} fill={theme.colors.gray[6]}>{tick}</text>
        </g>
      ))}

      {/* Y Axis Label */}
      <text
        transform={`translate(15, ${MARGIN.top + innerHeight / 2}) rotate(-90)`}
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
              transform={`translate(${MARGIN.left}, ${yScale(targets.preMin) + MARGIN.top})`}
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
              transform={`translate(${MARGIN.left}, ${yScale(targets.postMin) + MARGIN.top})`}
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
              transform={`translate(${MARGIN.left}, ${yScale(targets.postMax) + MARGIN.top})`}
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
    <g transform={`translate(0, ${MARGIN.top})`}>
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

const AverageLine = memo(({
  x1, x2, y, label, color,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  color: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const [mouseX, setMouseX] = useState(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.nativeEvent.offsetX);
  }, []);

  return (
    <g>
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
        stroke={color}
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
AverageLine.displayName = 'AverageLine';

const DumbbellChartContent = memo(({
  totalWidth,
  height,
  yScale,
  processedData,
  collapsedProviders,
  collapsedVisits,
  hoveredCollapse,
  theme,
  onToggleProviderCollapse,
  onToggleVisitCollapse,
  setHoveredCollapse,
  showMedian,
  isFlatMode,
  providerLayout,
  visitLayout,
  labConfig,
  showPre,
  showPost,
  targets,
  setHoveredTarget,
  showTargets,
}: DumbbellChartSVGProps & {
  isFlatMode: boolean,
  showPre: boolean,
  showPost: boolean,
  targets: { preMin: number; postMin: number; postMax: number },
  setHoveredTarget: (t: string | null) => void,
  showTargets: boolean,
  showMedian: boolean,
  providerLayout: Map<string, { x: number, width: number, label: string }>,
  visitLayout: Map<string, { x: number, width: number }>,
}) => {
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  // Selection Box State
  const [selection, setSelection] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const initialSelection = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (chartRef.current.scrollLeft || 0);
    const y = e.clientY - rect.top;

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

    const chartBottom = height - MARGIN.bottom;
    const chartTop = MARGIN.top;
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
  }, [selection, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartTop = MARGIN.top;
    const chartBottom = height - MARGIN.bottom;
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
  }, [interactionMode, selection, height, resizeHandle]);

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
    <g transform={`translate(0, ${MARGIN.top})`}>
      {/* Render Stripe backgrounds first */}
      {processedData.map((provider, i) => {
        const layout = providerLayout.get(provider.id);
        const providerX = layout ? layout.x : 0;
        const providerWidth = layout ? layout.width : 100;
        const providerColor = i % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];
        return (
          <rect
            key={`bg-${provider.id}`}
            x={providerX}
            y={0}
            width={providerWidth}
            height={innerHeight}
            fill={providerColor}
            opacity={0.3}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
      {yScale.ticks(5).map((tick) => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x1={0} x2={totalWidth - MARGIN.right} y1={0} y2={0} stroke={theme.colors.gray[3]} strokeDasharray="4 4" />
        </g>
      ))}

      {processedData.map((provider, providerIdx) => {
        const isProvCollapsed = collapsedProviders.has(provider.id);
        const layout = providerLayout.get(provider.id);
        const providerWidth = layout ? layout.width : 100;
        const providerX = layout ? layout.x : 0;
        const providerLabel = layout ? layout.label : provider.id;
        const providerColor = providerIdx % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];

        let sumPre = 0; let countPre = 0;
        let sumPost = 0; let countPost = 0;
        provider.visits.forEach((v) => {
          v.cases.forEach((c) => {
            const preVal = c[labConfig.preKey] as number;
            const postVal = c[labConfig.postKey] as number;
            if (preVal !== undefined && preVal !== null) {
              sumPre += preVal;
              countPre += 1;
            }
            if (postVal !== undefined && postVal !== null) {
              sumPost += postVal;
              countPost += 1;
            }
          });
        });
        const avgPre = countPre > 0 ? sumPre / countPre : null;
        const avgPost = countPost > 0 ? sumPost / countPost : null;

        return (
          <g key={provider.id}>
            <Tooltip label={provider.id} openDelay={200}>
              <rect
                x={providerX}
                y={isFlatMode ? innerHeight : innerHeight + 25}
                width={providerWidth}
                height={25}
                fill={isProvCollapsed ? theme.colors.gray[4] : providerColor}
                stroke={theme.colors.gray[5]}
                strokeWidth={1}
              />
            </Tooltip>

            <text
              x={providerX + providerWidth / 2}
              y={isFlatMode ? innerHeight + 17 : innerHeight + 42}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={isProvCollapsed ? theme.colors.gray[6] : theme.colors.gray[9]}
              style={{ pointerEvents: 'none' }}
            >
              {isProvCollapsed ? '...' : providerLabel}
            </text>

            <rect
              x={providerX + providerWidth - 15}
              y={isFlatMode ? innerHeight : innerHeight + 25}
              width={15}
              height={25}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredCollapse(provider.id)}
              onMouseLeave={() => setHoveredCollapse(null)}
              onClick={(e) => onToggleProviderCollapse(e, provider.id)}
            />
            {hoveredCollapse === provider.id && (
              <path
                d={isProvCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'}
                transform={`translate(${providerX + providerWidth - 12}, ${isFlatMode ? innerHeight + 3 : innerHeight + 31}) scale(0.6)`}
                fill="none"
                stroke={theme.colors.gray[7]}
                strokeWidth={2}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {!isProvCollapsed && (
              <g>
                {provider.visits.map((visit, visitIdx) => {
                  const isVisitCollapsed = collapsedVisits.has(visit.id);
                  const vLayout = visitLayout.get(visit.id);
                  const visitWidth = vLayout ? vLayout.width : 40;
                  const currentVisitX = vLayout ? vLayout.x : 0;
                  const visitColor = visitIdx % 2 === 0 ? theme.colors.gray[2] : theme.colors.gray[0];
                  const bgShade = (!isFlatMode && visitIdx % 2 === 0) ? theme.colors.gray[1] : 'transparent';

                  return (
                    <g key={visit.id}>
                      <rect
                        x={currentVisitX}
                        y={0}
                        width={visitWidth}
                        height={innerHeight}
                        fill={bgShade}
                        opacity={0.3}
                        style={{ pointerEvents: 'none' }}
                      />
                      {!isFlatMode && (
                        <Tooltip label={visit.label} openDelay={200}>
                          <rect
                            x={currentVisitX}
                            y={innerHeight}
                            width={visitWidth}
                            height={25}
                            fill={isVisitCollapsed ? theme.colors.gray[4] : visitColor}
                            stroke={theme.colors.gray[4]}
                            strokeWidth={1}
                          />
                        </Tooltip>
                      )}
                      {/* Visit Label - Hidden in Flat Mode */}
                      {!isFlatMode && (
                        <text
                          x={currentVisitX + visitWidth / 2}
                          y={innerHeight + 20}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={400}
                          fill={theme.colors.gray[6]}
                          style={{ pointerEvents: 'none' }}
                        >
                          {visit.label}
                        </text>
                      )}
                      <rect
                        x={currentVisitX + visitWidth - 10}
                        y={innerHeight}
                        width={10}
                        height={25}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredCollapse(visit.id)}
                        onMouseLeave={() => setHoveredCollapse(null)}
                        onClick={(e) => onToggleVisitCollapse(e, visit.id)}
                      />
                      {hoveredCollapse === visit.id && (
                        <path
                          d={isVisitCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'}
                          transform={`translate(${currentVisitX + visitWidth - 10}, ${innerHeight + 6}) scale(0.6)`}
                          fill="none"
                          stroke={theme.colors.gray[7]}
                          strokeWidth={2}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                    </g>
                  );
                })}

                <g>
                  {provider.visits.map((visit) => {
                    const isVisitCollapsed = collapsedVisits.has(visit.id);
                    const vLayout = visitLayout.get(visit.id);
                    const currentVisitX = vLayout ? vLayout.x : 0;

                    return (
                      <g key={visit.id}>
                        {!isVisitCollapsed && visit.cases.map((d) => {
                          const vIdx = visit.cases.indexOf(d);
                          const caseX = currentVisitX + vIdx * CHAR_WIDTH_CASE + CHAR_WIDTH_CASE / 2;
                          const preVal = d[labConfig.preKey] as number | null;
                          const postVal = d[labConfig.postKey] as number | null;

                          return (
                            <g key={d.case_id}>
                              {showPre && showPost && preVal !== null && postVal !== null && (
                                <line
                                  x1={caseX}
                                  x2={caseX}
                                  y1={yScale(preVal)}
                                  y2={yScale(postVal)}
                                  stroke={theme.colors.gray[5]}
                                  strokeWidth={1}
                                  shapeRendering="crispEdges"
                                />
                              )}
                              {showPre && preVal !== null && (
                                <Tooltip label={`Pre: ${preVal.toFixed(1)}`}>
                                  <circle
                                    cx={caseX}
                                    cy={yScale(preVal)}
                                    r={DOT_RADIUS}
                                    fill={isSelected(caseX, yScale(preVal) + MARGIN.top) ? theme.colors.orange[5] : theme.colors.teal[6]}
                                    stroke="white"
                                    strokeWidth={0.6}
                                  />
                                </Tooltip>
                              )}
                              {showPost && postVal !== null && (
                                <Tooltip label={`Post: ${postVal.toFixed(1)}`}>
                                  <circle
                                    cx={caseX}
                                    cy={yScale(postVal)}
                                    r={DOT_RADIUS}
                                    fill={isSelected(caseX, yScale(postVal) + MARGIN.top) ? theme.colors.orange[5] : theme.colors.indigo[6]}
                                    stroke="white"
                                    strokeWidth={0.6}
                                  />
                                </Tooltip>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>

                {showMedian && showPre && avgPre !== null && (
                  <AverageLine
                    x1={providerX}
                    x2={providerX + providerWidth}
                    y={yScale(avgPre)}
                    label={`Average Pre-op: ${avgPre.toFixed(1)} for ${provider.id}`}
                    color={theme.colors.teal[4]}
                  />
                )}
                {showMedian && showPost && avgPost !== null && (
                  <AverageLine
                    x1={providerX}
                    x2={providerX + providerWidth}
                    y={yScale(avgPost)}
                    label={`Average Post-op: ${avgPost.toFixed(1)} for ${provider.id}`}
                    color={theme.colors.indigo[4]}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  ), [processedData, collapsedProviders, collapsedVisits, hoveredCollapse, theme, labConfig, showPre, showPost, yScale, innerHeight, isFlatMode, onToggleProviderCollapse, onToggleVisitCollapse, setHoveredCollapse, isSelected, totalWidth, showMedian, providerLayout, visitLayout]);

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

DumbbellChartContent.displayName = 'DumbbellChartContent';

export function DumbbellChart({ chartConfig }: { chartConfig: DumbbellChartConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  // State
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const [collapsedVisits, setCollapsedVisits] = useState<Set<string>>(new Set());
  const [selectedLab, setSelectedLab] = useState<string>('hgb');
  const [selectedX, setSelectedX] = useState<string>('surgeon');
  const [showPre, setShowPre] = useState<boolean>(true);
  const [showPost, setShowPost] = useState<boolean>(true);
  const [showTargets, setShowTargets] = useState<boolean>(true);
  const [showMedian, setShowMedian] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<string>('time');

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

  const isFlatMode = useMemo(() => [
    'surgeon',
    'anesthesiologist',
    'rbc',
    'platelet',
    'cryo',
    'ffp',
    'cell_salvage',
  ].includes(selectedX), [selectedX]);

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
  const toggleProviderCollapse = useCallback((e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
    setCollapsedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }, []);

  const toggleVisitCollapse = useCallback((e: React.MouseEvent, uniqueVisitId: string) => {
    e.stopPropagation();
    setCollapsedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueVisitId)) next.delete(uniqueVisitId);
      else next.add(uniqueVisitId);
      return next;
    });
  }, []);

  // Get and Process Data
  const processedData = useMemo(() => {
    const rawData = (store.exploreChartData[chartConfig.chartId] as DumbbellData) || [];
    const groupedByProvider = new Map<string, DumbbellCase[]>();

    // Grouping Logic based on selectedX
    rawData.forEach((d) => {
      let key = d.surgeon_prov_id; // Default Surgeon
      if (selectedX === 'anesthesiologist') key = d.anesth_prov_id;
      else if (selectedX === 'year_quarter') {
        const date = new Date(d.surgery_start_dtm);
        key = `${date.getFullYear()}`;
      } else if (selectedX === 'rbc') {
        const val = d.intraop_rbc_units;
        key = `${val} ${val === 1 ? 'RBC' : 'RBCs'}`;
      } else if (selectedX === 'platelet') {
        const val = d.intraop_plt_units;
        key = `${val} ${val === 1 ? 'Platelet' : 'Platelets'}`;
      } else if (selectedX === 'cryo') {
        const val = d.intraop_cryo_units;
        key = `${val} ${val === 1 ? 'Cryo' : 'Cryos'}`;
      } else if (selectedX === 'ffp') {
        const val = d.intraop_ffp_units;
        key = `${val} ${val === 1 ? 'FFP' : 'FFPs'}`;
      } else if (selectedX === 'cell_salvage') {
        if (d.intraop_cell_saver_ml === 0) key = '0 mL';
        else if (d.intraop_cell_saver_ml <= 300) key = '1-300 mL';
        else if (d.intraop_cell_saver_ml <= 400) key = '301-400 mL';
        else if (d.intraop_cell_saver_ml <= 500) key = '401-500 mL';
        else key = '>500 mL';
      }

      if (!groupedByProvider.has(key)) groupedByProvider.set(key, []);
      groupedByProvider.get(key)?.push(d);
    });

    const hierarchy: {
      id: string;
      cases: DumbbellCase[];
      visits: {
        id: string;
        label: string;
        cases: DumbbellCase[];
        minPre: number;
        minPost: number;
      }[];
    }[] = [];

    // Sort Keys
    const sortedKeys = Array.from(groupedByProvider.keys());
    if (selectedX === 'year_quarter' || selectedX === 'rbc' || selectedX === 'platelet' || selectedX === 'cryo' || selectedX === 'ffp') {
      sortedKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    } else if (selectedX === 'cell_salvage') {
      const order = ['0 mL', '1-300 mL', '301-400 mL', '401-500 mL', '>500 mL'];
      sortedKeys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    } else {
      sortedKeys.sort(); // Alphabetical for names
    }

    sortedKeys.forEach((providerId) => {
      const cases = groupedByProvider.get(providerId)!;
      // Determine provider sort based on global sort mode
      const providerSort = sortMode === 'time' ? 'none' : sortMode as SortState;

      if (providerSort === 'none') {
        // Sub-grouping logic
        const groupedByVisit = new Map<string, DumbbellCase[]>();

        cases.forEach((d) => {
          let subKey = d.visit_no; // Default Visit ID
          if (selectedX === 'year_quarter') {
            const date = new Date(d.surgery_start_dtm);
            const q = Math.floor((date.getMonth() + 3) / 3);
            subKey = `Q${q}`;
          } else if (isFlatMode) {
            subKey = 'All Cases';
          }
          if (!groupedByVisit.has(subKey)) groupedByVisit.set(subKey, []);
          groupedByVisit.get(subKey)?.push(d);
        });

        // Ensure all 4 quarters exist for year_quarter mode
        if (selectedX === 'year_quarter') {
          for (let q = 1; q <= 4; q += 1) {
            const qKey = `Q${q}`;
            if (!groupedByVisit.has(qKey)) {
              groupedByVisit.set(qKey, []);
            }
          }
        }

        const visits = Array.from(groupedByVisit.entries()).map(([visitLabel, visitCases]) => {
          const preAccess = labConfig.preKey as keyof DumbbellCase;
          const postAccess = labConfig.postKey as keyof DumbbellCase;
          const preValues = visitCases.map((c) => c[preAccess] as number);
          const postValues = visitCases.map((c) => c[postAccess] as number);
          const minPre = preValues.length > 0 ? Math.min(...preValues) : Infinity;
          const minPost = postValues.length > 0 ? Math.min(...postValues) : Infinity;

          // Sort Cases within Visit
          // Default: Chronological by surgery_start_dtm
          const sortedCases = [...visitCases];

          sortedCases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);

          return {
            id: `${providerId}-${visitLabel}`,
            label: visitLabel,
            cases: sortedCases,
            minPre,
            minPost,
          };
        });

        // Sort visits
        if (selectedX === 'year_quarter') {
          visits.sort((a, b) => a.label.localeCompare(b.label));
        } else if (['surgeon', 'anesthesiologist'].includes(selectedX)) {
          visits.sort((a, b) => {
            const timeA = a.cases[0]?.surgery_start_dtm || 0;
            const timeB = b.cases[0]?.surgery_start_dtm || 0;
            return timeA - timeB;
          });
        }
        // Others (Transfusions/Cell Salvage) have only one 'All Cases' groups, no sort needed

        hierarchy.push({
          id: providerId,
          cases,
          visits,
        });
      } else {
        // Sorted by Pre/Post Hgb: Flatten all cases into one "Visit"
        const sortedCases = [...cases];
        const preAccess = labConfig.preKey;
        const postAccess = labConfig.postKey;

        if (providerSort === 'pre') {
          sortedCases.sort((a, b) => (a[preAccess] as number) - (b[preAccess] as number));
        } else if (providerSort === 'post') {
          sortedCases.sort((a, b) => (a[postAccess] as number) - (b[postAccess] as number));
        } else if (providerSort === 'gap') {
          sortedCases.sort((a, b) => Math.abs((a[preAccess] as number) - (a[postAccess] as number)) - Math.abs((b[preAccess] as number) - (b[postAccess] as number)));
        }

        const minPre = Math.min(...sortedCases.map((c) => c[preAccess] as number));
        const minPost = Math.min(...sortedCases.map((c) => c[postAccess] as number));

        // Create a single virtual visit for the flattened cases
        const virtualVisit = {
          id: `${providerId}-all-sorted`,
          label: 'All Cases',
          cases: sortedCases,
          minPre,
          minPost,
        };

        hierarchy.push({
          id: providerId,
          cases,
          visits: [virtualVisit],
        });
      }
    });

    return hierarchy;
  }, [store.exploreChartData, chartConfig.chartId, labConfig, selectedX, sortMode, isFlatMode]);

  // --- Layout & Width Calculation ---

  // Helper to measure text width
  const measureText = useCallback((text: string, fontSize: number = 12, fontWeight: number = 600) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${fontWeight} ${fontSize}px ${theme.fontFamily || 'sans-serif'}`;
      // Add a buffer because canvas measurement can be tight
      return context.measureText(text).width + 2;
    }
    return text.length * 8;
  }, [theme.fontFamily]);

  const getShortenedLabel = useCallback((label: string) => {
    if (label.includes('RBC')) return label.split(' ')[0];
    if (label.includes('Platelet')) return label.split(' ')[0];
    if (label.includes('Cryo')) return label.split(' ')[0];
    if (label.includes('FFP')) return label.split(' ')[0];
    return label;
  }, []);

  const layoutData = useMemo(() => {
    const items: {
      type: 'case' | 'visit_gap' | 'provider_gap' | 'spacer',
      data?: DumbbellCase,
      width: number
    }[] = [];

    const providerLayout = new Map<string, { x: number, width: number, label: string }>();
    const visitLayout = new Map<string, { x: number, width: number }>();

    let currentX = 0;

    processedData.forEach((provider) => {
      const providerStartX = currentX;
      let displayLabel = provider.id;

      if (collapsedProviders.has(provider.id)) {
        const width = 50;
        items.push({ type: 'provider_gap', width });
        currentX += width;
      } else {
        provider.visits.forEach((visit) => {
          const visitStartX = currentX;
          if (collapsedVisits.has(visit.id)) {
            const width = 40;
            items.push({ type: 'visit_gap', width });
            currentX += width;
          } else if (visit.cases.length === 0) {
            const width = EMPTY_VISIT_WIDTH;
            items.push({ type: 'visit_gap', width });
            currentX += width;
          } else {
            visit.cases.forEach((c) => {
              const width = CHAR_WIDTH_CASE;
              items.push({ type: 'case', data: c, width });
              currentX += width;
            });
          }
          visitLayout.set(visit.id, { x: visitStartX, width: currentX - visitStartX });
        });
      }

      // Calculate natural width
      let providerWidth = currentX - providerStartX;

      // Enforce Min Width & Label Checks
      const isSurgeon = selectedX === 'surgeon' || selectedX === 'anesthesiologist';

      if (isSurgeon) {
        const MIN_SURGEON_WIDTH = 40;
        if (providerWidth < MIN_SURGEON_WIDTH) {
          const deficit = MIN_SURGEON_WIDTH - providerWidth;
          items.push({ type: 'spacer', width: deficit });
          currentX += deficit;
          providerWidth += deficit;
        }
      } else {
        // RBC/Count buckets
        const fullWidth = measureText(displayLabel, 12, 600);
        // Check if full label fits
        if (providerWidth < fullWidth + 10) {
          const shortLabel = getShortenedLabel(displayLabel);
          const shortWidth = measureText(shortLabel, 12, 600);

          if (shortLabel !== displayLabel && providerWidth >= shortWidth + 8) {
            displayLabel = shortLabel;
          } else {
            // Must expand
            const targetWidth = (shortLabel !== displayLabel) ? shortWidth : fullWidth;

            if (providerWidth < targetWidth + 10) {
              const deficit = (targetWidth + 10) - providerWidth;
              items.push({ type: 'spacer', width: deficit });
              currentX += deficit;
              providerWidth += deficit;
              if (shortLabel !== displayLabel) displayLabel = shortLabel;
            }
          }
        }
      }

      providerLayout.set(provider.id, { x: providerStartX, width: providerWidth, label: displayLabel });
    });

    return { items, providerLayout, visitLayout };
  }, [processedData, collapsedProviders, collapsedVisits, measureText, getShortenedLabel, selectedX]);

  // Calculate total width - content starts at 0, only add Right margin
  const totalWidth = layoutData.items.reduce((acc, item) => acc + item.width, 0) + MARGIN.right;

  // Responsive Height
  const { ref, height: measuredHeight } = useElementSize();
  const height = measuredHeight || 400; // Fallback
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const yScale = useMemo(() => scaleLinear()
    .domain([labConfig.min, labConfig.max])
    .range([innerHeight, 0]), [innerHeight, labConfig]);
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
            {X_AXIS_OPTIONS.find((opt) => opt.value === selectedX)?.label || selectedX}
          </Title>
        </Flex>
        <Flex direction="row" align="center" gap="sm">
          <Flex direction="row" align="center" gap="xs">
            <Text size="xs" c="dimmed" fw={500}>Sort:</Text>
            <SegmentedControl
              size="xs"
              value={sortMode}
              onChange={handleSortChange}
              data={[
                {
                  label: (
                    <Flex align="center" justify="center" gap={4}>
                      Pre
                      {sortMode === 'pre' && <IconArrowUp size={12} stroke={2} />}
                    </Flex>
                  ),
                  value: 'pre',
                },
                {
                  label: (
                    <Flex align="center" justify="center" gap={4}>
                      Post
                      {sortMode === 'post' && <IconArrowUp size={12} stroke={2} />}
                    </Flex>
                  ),
                  value: 'post',
                },
                {
                  label: (
                    <Flex align="center" justify="center" gap={4}>
                      Gap
                      {sortMode === 'gap' && <IconArrowsVertical size={12} stroke={2} />}
                    </Flex>
                  ),
                  value: 'gap',
                },
                {
                  label: (
                    <Flex align="center" justify="center" gap={4}>
                      Time
                      {sortMode === 'time' && <IconArrowRightDashed size={12} stroke={2} />}
                    </Flex>
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
            </Button.Group>
          </Flex>
          <Select
            data={X_AXIS_OPTIONS}
            value={selectedX}
            onChange={(value) => setSelectedX(value || 'surgeon')}
            size="xs"
            w={160}
            allowDeselect={false}
            leftSection={<Title order={6} c="dimmed" style={{ fontSize: '10px' }}>X</Title>}
          />
          <Select
            data={Array.from(new Set(LAB_RESULTS.map((l) => l.metricId))).map((id) => {
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
          <DumbbellYAxis
            height={height}
            yScale={yScale}
            theme={theme}
            labConfig={labConfig}
            targets={targets}
            setTargets={setTargets}
            hoveredTarget={hoveredTarget}
            setHoveredTarget={setHoveredTarget}
          />

          {/* Scrollable Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ScrollArea h={height}>
              <DumbbellChartContent
                totalWidth={totalWidth}
                height={height}
                yScale={yScale}
                processedData={processedData}
                collapsedProviders={collapsedProviders}
                collapsedVisits={collapsedVisits}
                hoveredCollapse={hoveredCollapse}
                theme={theme}
                onToggleProviderCollapse={toggleProviderCollapse}
                onToggleVisitCollapse={toggleVisitCollapse}
                setHoveredCollapse={setHoveredCollapse}
                isFlatMode={isFlatMode}
                showPre={showPre}
                showPost={showPost}
                targets={targets}
                setHoveredTarget={setHoveredTarget}
                showTargets={showTargets}
                showMedian={showMedian}
                labConfig={labConfig}
                providerLayout={layoutData.providerLayout}
                visitLayout={layoutData.visitLayout}
              />
            </ScrollArea>
          </div>
        </Flex>
      </div>
    </Box>
  );
}
