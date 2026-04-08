import {
  useMemo, useState, useContext, memo, useCallback, useEffect, useRef, useId,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  Box, CloseButton, Title, Flex, useMantineTheme,
  Tooltip, MantineTheme, Select, Button, Text, SegmentedControl, ActionIcon,
} from '@mantine/core';
import {
  IconGripVertical, IconArrowUp, IconArrowDown, IconArrowRightDashed, IconCircles,
} from '@tabler/icons-react';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { reaction } from 'mobx';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../../Store/Store';

import {
  DumbbellCase, LAB_RESULTS,
  SCATTER_X_AXIS_OPTIONS, SCATTER_Y_AXIS_OPTIONS,
  SCATTER_MARGIN, SCATTER_DOT_RADIUS, SCATTER_CHAR_WIDTH_CASE,
  SCATTER_DRAG_LIMIT, ScatterPlotConfig, chartColors,
} from '../../../../Types/application';
import {
  AddGroupModal, GroupDefinition, GroupCondition, CONDITION_FIELDS_FLAT,
} from './AddGroupModal';
import { smallHoverColor, backgroundSelectedColor, smallSelectColor } from '../../../../Theme/mantineTheme';
import {
  getProcessedScatterData, calculateScatterLayout,
  buildSpatialIndex, findNearestPoint,
  ScatterVarConfig, PointPosition,
} from './ScatterPlotUtils';
import { BLOOD_COMPONENTS } from '../../../../Types/bloodProducts';

// #region Y-Axis
const ScatterYAxis = memo(({
  height, yScale, theme, varConfig, targets, setTargets,
  hoveredTarget, setHoveredTarget, isDiscrete,
}: {
  height: number;
  yScale: ScaleLinear<number, number>;
  theme: MantineTheme;
  varConfig: ScatterVarConfig;
  targets: { min: number; max: number };
  setTargets: React.Dispatch<React.SetStateAction<{ min: number; max: number }>>;
  hoveredTarget: string | null;
  setHoveredTarget: (t: string | null) => void;
  isDiscrete: boolean;
}) => {
  const bottomMargin = isDiscrete ? (25) : 40;
  const innerHeight = Math.max(0, height - SCATTER_MARGIN.top - bottomMargin);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const handleDragStart = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging || !varConfig.defaultTargets) return undefined;
    const handleMouseMove = (e: MouseEvent) => {
      const pixelRange = innerHeight;
      const valueRange = varConfig.max - varConfig.min;
      const valuePerPixel = valueRange / pixelRange;
      const deltaValue = e.movementY * valuePerPixel;
      setTargets((prev) => {
        const val = prev[dragging];
        let newVal = val - deltaValue;
        const baseVal = varConfig.defaultTargets![dragging];
        if (newVal > baseVal + SCATTER_DRAG_LIMIT) newVal = baseVal + SCATTER_DRAG_LIMIT;
        if (newVal < baseVal - SCATTER_DRAG_LIMIT) newVal = baseVal - SCATTER_DRAG_LIMIT;
        return { ...prev, [dragging]: newVal };
      });
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, innerHeight, varConfig, setTargets]);

  return (
    <svg width={SCATTER_MARGIN.left} height={height} style={{ display: 'block', flexShrink: 0 }}>
      <rect width={SCATTER_MARGIN.left} height={height} fill="white" />
      {yScale.ticks(5).map((tick) => {
        let displayTick = tick.toString();
        if (Math.abs(tick) >= 1000000) displayTick = `${+(tick / 1000000).toFixed(1)}M`;
        else if (Math.abs(tick) >= 1000) displayTick = `${+(tick / 1000).toFixed(1)}k`;
        return (
          <g key={tick} transform={`translate(${SCATTER_MARGIN.left}, ${yScale(tick) + SCATTER_MARGIN.top})`}>
            <text x={-10} y={4} textAnchor="end" fontSize={12} fill={theme.colors.gray[6]}>{displayTick}</text>
          </g>
        );
      })}
      <text
        transform={`translate(15, ${SCATTER_MARGIN.top + innerHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={12}
        fontWeight={500}
        fill={theme.colors.gray[8]}
      >
        {varConfig.label}
        {' '}
        (
        {varConfig.unit}
        )
      </text>
      {varConfig.defaultTargets && (
        <g>
          {(hoveredTarget === 'min' || dragging === 'min') && (
            <Tooltip label={`Target Min: ${targets.min.toFixed(1)} ${varConfig.unit}`} position="right">
              <g
                transform={`translate(${SCATTER_MARGIN.left}, ${yScale(targets.min) + SCATTER_MARGIN.top})`}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={handleDragStart('min')}
                onMouseEnter={() => setHoveredTarget('min')}
                onMouseLeave={() => setHoveredTarget(null)}
              >
                <rect x={-20} y={-10} width={40} height={20} fill="transparent" />
                <path d="M 0 0 L -8 -5 L -8 5 Z" fill={theme.colors.teal[6]} />
              </g>
            </Tooltip>
          )}
          {(hoveredTarget === 'max' || dragging === 'max') && (
            <Tooltip label={`Target Max: ${targets.max.toFixed(1)} ${varConfig.unit}`} position="right">
              <g
                transform={`translate(${SCATTER_MARGIN.left}, ${yScale(targets.max) + SCATTER_MARGIN.top})`}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={handleDragStart('max')}
                onMouseEnter={() => setHoveredTarget('max')}
                onMouseLeave={() => setHoveredTarget(null)}
              >
                <rect x={-20} y={-10} width={40} height={20} fill="transparent" />
                <path d="M 0 0 L -8 -5 L -8 5 Z" fill={theme.colors.indigo[6]} />
              </g>
            </Tooltip>
          )}
        </g>
      )}
    </svg>
  );
});
ScatterYAxis.displayName = 'ScatterYAxis';
// #endregion

// #region Target Overlay
const ScatterTargetOverlay = memo(({
  totalWidth, yScale, targets, theme, varConfig, setHoveredTarget,
}: {
  totalWidth: number;
  yScale: ScaleLinear<number, number>;
  targets: { min: number; max: number };
  theme: MantineTheme;
  varConfig: ScatterVarConfig;
  setHoveredTarget: (t: string | null) => void;
}) => {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [mouseX, setMouseX] = useState<number>(0);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.nativeEvent.offsetX);
  }, []);

  return (
    <g transform={`translate(0, ${SCATTER_MARGIN.top})`}>
      <rect
        x={0}
        y={yScale(targets.max)}
        width={totalWidth}
        height={Math.max(0, yScale(targets.min) - yScale(targets.max))}
        fill={theme.colors.teal[0]}
        opacity={0.3}
        style={{ pointerEvents: 'none' }}
      />
      {/* Min line */}
      <Tooltip label={`Target Min: ${targets.min.toFixed(1)} ${varConfig.unit}`} position="top" offset={5} opened={hoveredLine === 'min'}>
        <rect x={mouseX} y={yScale(targets.min)} width={1} height={1} fill="transparent" style={{ pointerEvents: 'none' }} />
      </Tooltip>
      <line x1={0} x2={totalWidth} y1={yScale(targets.min)} y2={yScale(targets.min)} stroke={theme.colors.teal[4]} strokeDasharray="5 5" strokeWidth={1} />
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.min)}
        y2={yScale(targets.min)}
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('min'); setHoveredLine('min'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />
      {/* Max line */}
      <Tooltip label={`Target Max: ${targets.max.toFixed(1)} ${varConfig.unit}`} position="bottom" offset={5} opened={hoveredLine === 'max'}>
        <rect x={mouseX} y={yScale(targets.max)} width={1} height={1} fill="transparent" style={{ pointerEvents: 'none' }} />
      </Tooltip>
      <line x1={0} x2={totalWidth} y1={yScale(targets.max)} y2={yScale(targets.max)} stroke={theme.colors.indigo[3]} strokeDasharray="5 5" strokeWidth={1} />
      <line
        x1={0}
        x2={totalWidth}
        y1={yScale(targets.max)}
        y2={yScale(targets.max)}
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('max'); setHoveredLine('max'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />
    </g>
  );
});
ScatterTargetOverlay.displayName = 'ScatterTargetOverlay';

// #region AverageLine
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
AverageLine.displayName = 'AverageLine';
// #endregion

// Helper: evaluate a single group condition against a case
function evaluateCondition(c: DumbbellCase, cond: GroupCondition): boolean {
  const val = ((c as unknown) as Record<string, unknown>)[cond.field];
  if (val == null) return false;
  const numVal = Number(val);
  const condVal = Number(cond.value);
  // Boolean fields stored as 0/1 or true/false
  if (cond.value === 'true' || cond.value === 'false') {
    const boolVal = Boolean(val) && val !== 0 && val !== '0';
    const condBool = cond.value === 'true';
    return cond.operator === '=' ? boolVal === condBool : boolVal !== condBool;
  }
  switch (cond.operator) {
    case '>': return numVal > condVal;
    case '>=': return numVal >= condVal;
    case '<': return numVal < condVal;
    case '<=': return numVal <= condVal;
    case '=': return numVal === condVal;
    case '!=': return numVal !== condVal;
    default: return false;
  }
}

// #region ScatterPlot Export
export function ScatterPlot({ chartConfig }: { chartConfig: ScatterPlotConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  // State
  const [selectedX, setSelectedX] = useState<string>(chartConfig.xAxisVar || 'rbc_units');
  const [selectedY, setSelectedY] = useState<string>(chartConfig.yAxisVar || 'post_hgb');
  const [showTargets, setShowTargets] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [sortMode, setSortMode] = useState<string>('asc');
  const [collapsedBinGroups, setCollapsedBinGroups] = useState<Set<string>>(new Set());

  // Groups
  const [groups, setGroups] = useState<GroupDefinition[]>([]);
  const [groupModalOpened, setGroupModalOpened] = useState(false);
  const [hoveredLegendGroup, setHoveredLegendGroup] = useState<string | null>(null);
  const [selectedLegendGroups, setSelectedLegendGroups] = useState<Set<string>>(new Set());

  // Modal form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(chartColors[0]);
  const [formConditions, setFormConditions] = useState<GroupCondition[]>([{ field: '', operator: '>', value: 0 }]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const xAxisOption = useMemo(
    () => SCATTER_X_AXIS_OPTIONS.find((o) => o.value === selectedX),
    [selectedX],
  );
  const isDiscrete = xAxisOption?.isDiscrete ?? true;

  // Derive var config for Y axis
  const varConfig = useMemo((): ScatterVarConfig => {
    const labResult = LAB_RESULTS.find((l) => l.value === selectedY);
    if (labResult) {
      return {
        label: labResult.label.base,
        unit: labResult.units.avg,
        min: labResult.range.min,
        max: labResult.range.max,
        key: labResult.value as keyof DumbbellCase,
        defaultTargets: { min: labResult.target.min, max: labResult.target.max },
      };
    }
    const bloodComp = BLOOD_COMPONENTS.find((b) => b.value === selectedY);
    if (bloodComp) {
      return {
        label: bloodComp.label.base,
        unit: bloodComp.units.avg,
        min: 0,
        max: 20,
        key: bloodComp.value as keyof DumbbellCase,
      };
    }
    return {
      label: selectedY,
      unit: '',
      min: 0,
      max: 100,
      key: selectedY as keyof DumbbellCase,
    };
  }, [selectedY]);

  // Derive x var key for continuous mode
  const xVarKey = useMemo((): keyof DumbbellCase | null => {
    if (isDiscrete) return null;
    const labResult = LAB_RESULTS.find((l) => l.value === selectedX);
    if (labResult) return labResult.value as keyof DumbbellCase;
    const bloodComp = BLOOD_COMPONENTS.find((b) => b.value === selectedX);
    if (bloodComp) return bloodComp.value as keyof DumbbellCase;
    return null;
  }, [selectedX, isDiscrete]);

  // Targets
  const [targets, setTargets] = useState(varConfig.defaultTargets || { min: 0, max: 0 });
  useEffect(() => {
    if (varConfig.defaultTargets) {
      setTargets(varConfig.defaultTargets);
    }
  }, [varConfig.defaultTargets]);

  // Hover state
  const [hoveredTarget, setHoveredTargetRaw] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const setHoveredTarget = useCallback((target: string | null) => {
    if (hoverTimeoutRef.current) { window.clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    if (target) { setHoveredTargetRaw(target); } else {
      hoverTimeoutRef.current = window.setTimeout(() => setHoveredTargetRaw(null), 300);
    }
  }, []);

  const [hoveredCollapse, setHoveredCollapse] = useState<string | null>(null);

  // Virtualization
  const scrollViewportRef = useRef<HTMLDivElement>(null);
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

  const [visibleRange, setVisibleRange] = useState<[number, number]>([-1000, 2000]);
  const handleScroll = useCallback(() => {
    if (scrollViewportRef.current) {
      const { scrollLeft, clientWidth } = scrollViewportRef.current;
      setVisibleRange([scrollLeft - 1000, scrollLeft + clientWidth + 1000]);
    }
  }, []);
  useEffect(() => {
    handleScroll();
    const ro = new ResizeObserver(() => handleScroll());
    if (scrollViewportRef.current) ro.observe(scrollViewportRef.current);
    return () => ro.disconnect();
  }, [handleScroll]);

  // Flatten nested series data: store format is [{name, color, data: case[]}, ...]
  const rawData = useMemo(() => {
    const storeData = store.exploreChartData[chartConfig.chartId];
    if (!storeData) return [] as DumbbellCase[];
    // Check if data is in the old series format ({data: [...]})
    if (Array.isArray(storeData) && storeData.length > 0 && 'data' in storeData[0]) {
      // Old series format: flatten the inner data arrays
      return ((storeData as unknown) as { data: DumbbellCase[] }[]).flatMap((s) => s.data);
    }
    return (storeData as DumbbellCase[]) || [];
  }, [store.exploreChartData, chartConfig.chartId]);
  const processedData = useMemo(
    () => getProcessedScatterData(rawData, selectedX, varConfig.key, sortMode, isDiscrete, xVarKey),
    [rawData, selectedX, varConfig.key, sortMode, isDiscrete, xVarKey],
  );
  const rawIndexByCaseRef = useMemo(() => {
    const map = new Map<DumbbellCase, number>();
    rawData.forEach((c, idx) => map.set(c, idx));
    return map;
  }, [rawData]);

  // Layout (discrete mode)
  const layoutData = useMemo(() => {
    if (!isDiscrete) return { binGroupLayout: new Map(), totalWidth: 0 };
    return calculateScatterLayout(processedData, collapsedBinGroups, selectedX, (t: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) { context.font = `600 12px ${theme.fontFamily}`; return context.measureText(t).width; }
      return t.length * 7;
    });
  }, [processedData, collapsedBinGroups, selectedX, isDiscrete, theme.fontFamily]);

  // Responsive size
  const { ref: sizeRef, height: measuredHeight, width: measuredWidth } = useElementSize();
  const height = measuredHeight || 400;
  const containerWidth = measuredWidth || 600;
  const bottomMargin = isDiscrete ? (25) : 40;
  const innerHeight = Math.max(0, height - SCATTER_MARGIN.top - bottomMargin);

  // For discrete: total SVG width = layout + right margin. For continuous: container width.
  const totalWidth = isDiscrete
    ? layoutData.totalWidth + SCATTER_MARGIN.right
    : containerWidth - SCATTER_MARGIN.left;

  // Y scale
  const yDomain = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    rawData.forEach((c) => {
      const val = c[varConfig.key] as number | null;
      if (val !== null && val !== undefined) { minVal = Math.min(minVal, val); maxVal = Math.max(maxVal, val); }
    });
    if (minVal === Infinity) return [varConfig.min, varConfig.max];
    if (minVal === maxVal) return [minVal - 1, maxVal + 1];
    const diff = maxVal - minVal;
    return [minVal - diff * 0.05, maxVal + diff * 0.05];
  }, [rawData, varConfig]);

  const yScale = useMemo(
    () => scaleLinear().domain(yDomain as [number, number]).range([innerHeight, 0]),
    [innerHeight, yDomain],
  );

  // X scale (continuous mode only)
  const xScale = useMemo(() => {
    if (isDiscrete || !xVarKey) return null;
    let minVal = Infinity;
    let maxVal = -Infinity;
    rawData.forEach((c) => {
      const val = c[xVarKey] as number | null;
      if (val !== null && val !== undefined) { minVal = Math.min(minVal, val); maxVal = Math.max(maxVal, val); }
    });
    if (minVal === Infinity) return scaleLinear().domain([0, 1]).range([0, totalWidth]);
    if (minVal === maxVal) return scaleLinear().domain([minVal - 1, maxVal + 1]).range([0, totalWidth]);
    const diff = maxVal - minVal;
    return scaleLinear().domain([minVal - diff * 0.05, maxVal + diff * 0.05]).range([0, totalWidth]);
  }, [isDiscrete, xVarKey, rawData, totalWidth]);

  // Build point positions
  const pointPositions = useMemo((): PointPosition[] => {
    const points: PointPosition[] = [];

    if (!isDiscrete && xScale && xVarKey) {
      // Continuous mode
      rawData.forEach((c, rawIdx) => {
        const xVal = c[xVarKey] as number | null;
        const yVal = c[varConfig.key] as number | null;
        if (xVal !== null && xVal !== undefined && yVal !== null && yVal !== undefined) {
          points.push({
            x: xScale(xVal),
            y: yScale(yVal) + SCATTER_MARGIN.top,
            caseIdx: rawIdx,
            binGroupIdx: 0,
          });
        }
      });
    } else {
      // Discrete mode
      processedData.forEach((binGroup, bgIdx) => {
        if (collapsedBinGroups.has(binGroup.id)) return;
        const bgLayout = layoutData.binGroupLayout.get(binGroup.id);
        if (!bgLayout) return;
        binGroup.cases.forEach((c, cIdx) => {
          const rawIdx = rawIndexByCaseRef.get(c);
          if (rawIdx === undefined) return;
          const yVal = c[varConfig.key] as number | null;
          if (yVal !== null && yVal !== undefined) {
            const caseX = bgLayout.x + cIdx * SCATTER_CHAR_WIDTH_CASE + SCATTER_CHAR_WIDTH_CASE / 2;
            points.push({
              x: caseX,
              y: yScale(yVal) + SCATTER_MARGIN.top,
              caseIdx: rawIdx,
              binGroupIdx: bgIdx,
            });
          }
        });
      });
    }
    return points;
  }, [isDiscrete, xScale, xVarKey, rawData, varConfig.key, yScale, processedData, collapsedBinGroups, layoutData.binGroupLayout, rawIndexByCaseRef]);

  // Precompute group color for each case index
  const caseGroupColors = useMemo(() => {
    const map = new Map<number, string>();
    if (groups.length === 0) return map;
    rawData.forEach((c, idx) => {
      for (const group of groups) {
        if (group.conditions.every((cond) => evaluateCondition(c, cond))) {
          map.set(idx, group.color);
          break;
        }
      }
    });
    return map;
  }, [rawData, groups]);

  // Spatial index
  const spatialIndex = useMemo(() => buildSpatialIndex(pointPositions), [pointPositions]);

  // Selection brush state
  const chartRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [brushHoverCursor, setBrushHoverCursor] = useState<string>('crosshair');
  const initialSelection = useRef<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const dragStart = useRef<{ x: number, y: number } | null>(null);

  // Hover state for canvas
  const hoveredPointRef = useRef<PointPosition | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; caseData: DumbbellCase } | null>(null);

  // Canvas ref + drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawPoints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(-Math.max(0, visibleRange[0]), 0);

    const hovered = hoveredPointRef.current;
    const sel = appliedSelection;

    const legendHover = hoveredLegendGroup;
    const legendSelected = selectedLegendGroups;
    const hasLegendEmphasis = legendHover !== null || legendSelected.size > 0;

    for (let i = 0; i < pointPositions.length; i += 1) {
      const p = pointPositions[i];
      const groupColor = caseGroupColors.get(p.caseIdx);
      let color = groupColor || theme.colors.gray[5];
      let radius = SCATTER_DOT_RADIUS;
      let opacity = 0.7;

      // Legend emphasis (selected takes precedence, hover overlays)
      if (hasLegendEmphasis) {
        const pointKey = groupColor || '__default__';
        const isSelected = legendSelected.has(pointKey);
        const isHovered = legendHover === pointKey;
        if (isSelected || isHovered) {
          opacity = 0.9;
        } else {
          opacity = 0.08;
        }
      }

      // Cross-chart selection highlight
      const pointCaseId = String(rawData[p.caseIdx]?.case_id || '');
      const isCaseSelected = store.selectedCaseIdsSet.has(pointCaseId);

      if (isCaseSelected) {
        color = smallSelectColor;
        opacity = 0.95;
      } else if (sel) {
        // Visual brush selection (temporary highlight while brushing or for local context)
        const minX = Math.min(sel.x1, sel.x2);
        const maxX = Math.max(sel.x1, sel.x2);
        const minY = Math.min(sel.y1, sel.y2);
        const maxY = Math.max(sel.y1, sel.y2);
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          color = smallSelectColor;
          opacity = 0.9;
        }
      }

      // Check hover
      if (hovered && p.caseIdx === hovered.caseIdx) {
        color = smallHoverColor;
        radius = SCATTER_DOT_RADIUS + 2;
        opacity = 1;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.restore();
  }, [pointPositions, appliedSelection, theme, caseGroupColors, hoveredLegendGroup, selectedLegendGroups, visibleRange, store.selectedCaseIdsSet, rawData]);

  // Redraw canvas when dependencies change (React path)
  useEffect(() => { drawPoints(); }, [drawPoints]);

  // MobX reaction for manual redraw when selection changes (Performance path)
  // This bypasses React re-renders for selection changes
  useEffect(() => reaction(
    () => store.selectedCaseIdsSet,
    () => { drawPoints(); },
    { name: 'ScatterPlotSelectionRedraw' },
  ), [store.selectedCaseIdsSet, drawPoints]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vWidth = Math.min(totalWidth, visibleRange[1] - visibleRange[0]);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = vWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${vWidth}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${Math.max(0, visibleRange[0])}px`;
    drawPoints();
  }, [totalWidth, height, visibleRange, drawPoints]);

  // Mouse handlers for brush + hover
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartTop = SCATTER_MARGIN.top;
    const chartBottom = height - bottomMargin;

    if (selection) {
      const minX = Math.min(selection.x1, selection.x2);
      const maxX = Math.max(selection.x1, selection.x2);
      const minY = Math.min(selection.y1, selection.y2);
      const maxY = Math.max(selection.y1, selection.y2);
      const tol = 10;
      let handle = null;
      if (Math.abs(x - minX) < tol && Math.abs(y - minY) < tol) handle = 'nw';
      else if (Math.abs(x - maxX) < tol && Math.abs(y - minY) < tol) handle = 'ne';
      else if (Math.abs(x - minX) < tol && Math.abs(y - maxY) < tol) handle = 'sw';
      else if (Math.abs(x - maxX) < tol && Math.abs(y - maxY) < tol) handle = 'se';
      else if (Math.abs(y - minY) < tol && x > minX && x < maxX) handle = 'n';
      else if (Math.abs(y - maxY) < tol && x > minX && x < maxX) handle = 's';
      else if (Math.abs(x - minX) < tol && y > minY && y < maxY) handle = 'w';
      else if (Math.abs(x - maxX) < tol && y > minY && y < maxY) handle = 'e';
      if (handle) { setInteractionMode('resizing'); setResizeHandle(handle); initialSelection.current = { ...selection }; return; }
      if (x > minX && x < maxX && y > minY && y < maxY) { setInteractionMode('moving'); dragStart.current = { x, y }; initialSelection.current = { ...selection }; return; }
    }
    if (y < chartTop || y > chartBottom) { setAppliedSelection(null); setSelection(null); return; }
    setInteractionMode('selecting');
    setSelection({
      x1: x, y1: y, x2: x, y2: y,
    });
    setAppliedSelection(null);
    initialSelection.current = {
      x1: x, y1: y, x2: x, y2: y,
    };
  }, [selection, height, bottomMargin]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartTop = SCATTER_MARGIN.top;
    const chartBottom = height - bottomMargin;
    const clampedY = Math.max(chartTop, Math.min(y, chartBottom));

    // Hover detection (always, even during brush)
    if (interactionMode === 'idle') {
      const nearest = findNearestPoint(spatialIndex, pointPositions, x, y, 12);
      const prev = hoveredPointRef.current;
      if (nearest !== prev) {
        hoveredPointRef.current = nearest;
        if (nearest) {
          // Find the case data
          const caseData = rawData[nearest.caseIdx];
          if (caseData) setTooltipData({ x: nearest.x, y: nearest.y, caseData });
        } else {
          setTooltipData(null);
        }
        requestAnimationFrame(drawPoints);
      }

      // Check for brush hover interaction to set dynamic resize/move cursor
      let cursor = 'crosshair';
      if (selection) {
        const minX = Math.min(selection.x1, selection.x2);
        const maxX = Math.max(selection.x1, selection.x2);
        const minY = Math.min(selection.y1, selection.y2);
        const maxY = Math.max(selection.y1, selection.y2);
        const tol = 10;
        if (Math.abs(x - minX) < tol && Math.abs(y - minY) < tol) cursor = 'nw-resize';
        else if (Math.abs(x - maxX) < tol && Math.abs(y - minY) < tol) cursor = 'ne-resize';
        else if (Math.abs(x - minX) < tol && Math.abs(y - maxY) < tol) cursor = 'sw-resize';
        else if (Math.abs(x - maxX) < tol && Math.abs(y - maxY) < tol) cursor = 'se-resize';
        else if (Math.abs(y - minY) < tol && x > minX && x < maxX) cursor = 'n-resize';
        else if (Math.abs(y - maxY) < tol && x > minX && x < maxX) cursor = 's-resize';
        else if (Math.abs(x - minX) < tol && y > minY && y < maxY) cursor = 'w-resize';
        else if (Math.abs(x - maxX) < tol && y > minY && y < maxY) cursor = 'e-resize';
        else if (x > minX && x < maxX && y > minY && y < maxY) cursor = 'move';
      }
      setBrushHoverCursor(cursor);
    }

    if (interactionMode === 'selecting' && initialSelection.current) {
      setSelection({ ...initialSelection.current, x2: x, y2: clampedY });
    } else if (interactionMode === 'moving' && initialSelection.current && dragStart.current) {
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;
      const cMinY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const cMaxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);
      let clampedDy = dy;
      if (cMinY + dy < chartTop) clampedDy = chartTop - cMinY;
      if (cMaxY + dy > chartBottom) clampedDy = chartBottom - cMaxY;
      setSelection({
        x1: initialSelection.current.x1 + dx, y1: initialSelection.current.y1 + clampedDy, x2: initialSelection.current.x2 + dx, y2: initialSelection.current.y2 + clampedDy,
      });
    } else if (interactionMode === 'resizing' && initialSelection.current) {
      const minX = Math.min(initialSelection.current.x1, initialSelection.current.x2);
      const maxX = Math.max(initialSelection.current.x1, initialSelection.current.x2);
      const minY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const maxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);
      let nMinX = minX; let nMaxX = maxX; let nMinY = minY; let nMaxY = maxY;
      if (resizeHandle?.includes('w')) nMinX = x;
      if (resizeHandle?.includes('e')) nMaxX = x;
      if (resizeHandle?.includes('n')) nMinY = clampedY;
      if (resizeHandle?.includes('s')) nMaxY = clampedY;
      setSelection({
        x1: nMinX, y1: nMinY, x2: nMaxX, y2: nMaxY,
      });
    }
  }, [interactionMode, selection, height, resizeHandle, bottomMargin, spatialIndex, pointPositions, drawPoints, rawData]);

  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    setInteractionMode('idle');
    setResizeHandle(null);
    dragStart.current = null;
    initialSelection.current = null;

    if (selection) {
      const dx = Math.abs(selection.x2 - selection.x1);
      const dy = Math.abs(selection.y2 - selection.y1);

      if (dx < 5 && dy < 5 && e) {
        // Click interaction: Toggle single case
        const rect = chartRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const nearest = findNearestPoint(spatialIndex, pointPositions, x, y, 12);
          if (nearest) {
            const caseId = String(rawData[nearest.caseIdx]?.case_id || '');
            if (caseId) store.actions.updateCaseSelection([caseId], 'toggle');
          }
        }
        setSelection(null);
        setAppliedSelection(null);
      } else {
        // Brush interaction: Add all points in rectangle to selection
        setAppliedSelection(selection);
        const minX = Math.min(selection.x1, selection.x2);
        const maxX = Math.max(selection.x1, selection.x2);
        const minY = Math.min(selection.y1, selection.y2);
        const maxY = Math.max(selection.y1, selection.y2);

        const selectedInBox = pointPositions.filter((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        const caseIds = selectedInBox.map((p) => String(rawData[p.caseIdx]?.case_id || '')).filter(Boolean);

        if (caseIds.length > 0) {
          store.actions.updateCaseSelection(caseIds, 'add');
        }
      }
    }
  }, [selection, spatialIndex, pointPositions, rawData, store.actions]);

  // X axis label for title
  const xLabel = xAxisOption?.label || selectedX;
  const yLabel = SCATTER_Y_AXIS_OPTIONS.find((o) => o.value === selectedY)?.label || selectedY;

  return useObserver(() => (
    <>
      <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>
        {/* Header */}
        <Flex direction="row" justify="space-between" align="center" pl="md" pr="md" pt="xs">
          <Flex direction="row" align="center" gap="md" ml={-12}>
            <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
            <Title order={4}>
              {yLabel}
              {' '}
              <span style={{ color: theme.colors.gray[6], fontWeight: 500 }}>by</span>
              {' '}
              {xLabel}
            </Title>
          </Flex>
          <Flex direction="row" align="center" gap="sm">
            {/* Groups icon */}
            <Tooltip label="Manage color groups" openDelay={500}>
              <ActionIcon
                size="md"
                variant={groups.length > 0 ? 'light' : 'subtle'}
                color="blue"
                onClick={() => setGroupModalOpened(true)}
              >
                <IconCircles size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Sort Cases */}
            {isDiscrete && (
              <Flex direction="row" align="center" gap="xs">
                <Text size="xs" c="dimmed" fw={500}>Sort Cases:</Text>
                <SegmentedControl
                  size="xs"
                  value={sortMode}
                  onChange={setSortMode}
                  data={[
                    {
                      label: (
                        <Tooltip label="Sort ascending by Y value" openDelay={500}>
                          <Flex align="center" justify="center" gap={4}>
                            <IconArrowUp size={14} stroke={2} />
                          </Flex>
                        </Tooltip>
                      ),
                      value: 'asc',
                    },
                    {
                      label: (
                        <Tooltip label="Sort descending by Y value" openDelay={500}>
                          <Flex align="center" justify="center" gap={4}>
                            <IconArrowDown size={14} stroke={2} />
                          </Flex>
                        </Tooltip>
                      ),
                      value: 'desc',
                    },
                    {
                      label: (
                        <Tooltip label="Sort by time" openDelay={500}>
                          <Flex align="center" justify="center" gap={4}>
                            <IconArrowRightDashed size={14} stroke={2} />
                          </Flex>
                        </Tooltip>
                      ),
                      value: 'time',
                    },
                  ]}
                  styles={(t) => ({
                    root: { backgroundColor: 'transparent', border: `1px solid ${t.colors.gray[3]}` },
                    control: { border: '0 !important' },
                    label: {
                      padding: '3px 8px', marginBottom: 2, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    },
                    indicator: { backgroundColor: t.colors.gray[2] },
                  })}
                />
              </Flex>
            )}

            {/* Show buttons */}
            <Flex direction="row" align="center" gap="xs" ml={0}>
              <Text size="xs" c="dimmed" fw={500}>Show:</Text>
              <Button.Group>
                {varConfig.defaultTargets && (
                  <Tooltip label="Show/hide target range" openDelay={500}>
                    <Button
                      size="xs"
                      px={8}
                      variant={showTargets ? 'light' : 'default'}
                      color="gray"
                      onClick={() => setShowTargets(!showTargets)}
                      styles={{ root: { borderColor: showTargets ? theme.colors.gray[6] : theme.colors.gray[4], fontWeight: 400, color: theme.colors.gray[9] } }}
                    >
                      Target
                    </Button>
                  </Tooltip>
                )}
                <Tooltip label="Show/hide average line" openDelay={500}>
                  <Button
                    size="xs"
                    px={8}
                    variant={showAvg ? 'light' : 'default'}
                    color="gray"
                    onClick={() => setShowAvg(!showAvg)}
                    styles={{
                      root: {
                        marginLeft: -1, borderColor: showAvg ? theme.colors.gray[6] : theme.colors.gray[4], fontWeight: 400, color: theme.colors.gray[9],
                      },
                    }}
                  >
                    Avg
                  </Button>
                </Tooltip>
              </Button.Group>
            </Flex>

            <Select
              data={SCATTER_X_AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={selectedX}
              onChange={(v) => setSelectedX(v || 'rbc_units')}
              size="xs"
              w={200}
              allowDeselect={false}
              leftSection={<Title order={6} c="dimmed" style={{ fontSize: '10px' }}>X</Title>}
            />
            <Select
              data={SCATTER_Y_AXIS_OPTIONS}
              value={selectedY}
              onChange={(v) => setSelectedY(v || 'post_hgb')}
              size="xs"
              w={200}
              allowDeselect={false}
              leftSection={<Title order={6} c="dimmed" style={{ fontSize: '10px' }}>Y</Title>}
            />
            <CloseButton onClick={() => store.removeExploreChart(chartConfig.chartId)} />
          </Flex>
        </Flex>

        {/* Chart Area */}
        <div style={{ flex: 1, minHeight: 0, width: '100%' }} ref={sizeRef}>
          <Flex direction="row" h={height}>
            {/* Fixed Y Axis */}
            <ScatterYAxis
              height={height}
              isDiscrete={isDiscrete}
              yScale={yScale}
              theme={theme}
              varConfig={varConfig}
              targets={targets}
              setTargets={setTargets}
              hoveredTarget={hoveredTarget}
              setHoveredTarget={setHoveredTarget}
            />

            {/* Scrollable Content */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              {/* Legend overlay */}
              <Flex
                direction="column"
                gap={2}
                style={{
                  position: 'absolute',
                  top: SCATTER_MARGIN.top + 4,
                  right: 8,
                  zIndex: 5,
                  pointerEvents: 'auto',
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 4,
                  padding: '4px 8px',
                }}
              >
                {groups.map((g) => {
                  const isActive = selectedLegendGroups.has(g.color);
                  const isDimmed = (hoveredLegendGroup && hoveredLegendGroup !== g.color)
                    || (selectedLegendGroups.size > 0 && !isActive && !hoveredLegendGroup);
                  return (
                    <Flex
                      key={g.id}
                      align="center"
                      gap={4}
                      onMouseEnter={() => setHoveredLegendGroup(g.color)}
                      onMouseLeave={() => setHoveredLegendGroup(null)}
                      onClick={() => setSelectedLegendGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.color)) { next.delete(g.color); } else { next.add(g.color); }
                        return next;
                      })}
                      style={{ cursor: 'pointer', opacity: isDimmed ? 0.4 : 1 }}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: g.color,
                        flexShrink: 0,
                        boxShadow: isActive ? `0 0 0 2px ${g.color}40` : undefined,
                      }}
                      />
                      <Text
                        size="xs"
                        fw={isActive ? 700 : 400}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {g.name || 'Unnamed Group'}
                      </Text>
                    </Flex>
                  );
                })}
                {(() => {
                  const canInteract = groups.length > 0;
                  const isActive = canInteract && selectedLegendGroups.has('__default__');
                  const isDimmed = canInteract && ((hoveredLegendGroup && hoveredLegendGroup !== '__default__')
                    || (selectedLegendGroups.size > 0 && !isActive && !hoveredLegendGroup));
                  return (
                    <Flex
                      align="center"
                      gap={4}
                      onMouseEnter={canInteract ? () => setHoveredLegendGroup('__default__') : undefined}
                      onMouseLeave={canInteract ? () => setHoveredLegendGroup(null) : undefined}
                      onClick={canInteract ? () => setSelectedLegendGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has('__default__')) { next.delete('__default__'); } else { next.add('__default__'); }
                        return next;
                      }) : undefined}
                      style={{ cursor: canInteract ? 'pointer' : 'default', opacity: isDimmed ? 0.4 : 1 }}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: theme.colors.gray[5],
                        flexShrink: 0,
                        boxShadow: isActive ? `0 0 0 2px ${theme.colors.gray[5]}40` : undefined,
                      }}
                      />
                      <Text
                        size="xs"
                        fw={isActive ? 700 : 400}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        All Surgical Cases
                      </Text>
                    </Flex>
                  );
                })()}
              </Flex>

              <Box style={{ overflowX: isDiscrete ? 'auto' : 'hidden', overflowY: 'hidden' }} ref={scrollViewportRef} onScroll={handleScroll}>
                <div
                  ref={chartRef}
                  style={{
                    width: totalWidth,
                    height,
                    position: 'relative',
                    userSelect: 'none',
                    cursor: interactionMode !== 'idle' ? (interactionMode === 'moving' ? 'move' : (interactionMode === 'resizing' && resizeHandle ? `${resizeHandle}-resize` : 'crosshair')) : brushHoverCursor,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => { handleMouseUp(); hoveredPointRef.current = null; setTooltipData(null); setBrushHoverCursor('crosshair'); requestAnimationFrame(drawPoints); }}
                >
                  {/* SVG layer for gridlines, bins, targets, avg, brush */}
                  <svg
                    width={Math.min(totalWidth, visibleRange[1] - visibleRange[0])}
                    height={height}
                    style={{ position: 'absolute', top: 0, left: Math.max(0, visibleRange[0]) }}
                    viewBox={`${Math.max(0, visibleRange[0])} 0 ${Math.min(totalWidth, visibleRange[1] - visibleRange[0])} ${height}`}
                  >
                    {/* Gridlines */}
                    <g transform={`translate(0, ${SCATTER_MARGIN.top})`}>
                      {yScale.ticks(5).map((tick) => (
                        <line key={tick} x1={0} x2={totalWidth} y1={yScale(tick)} y2={yScale(tick)} stroke={theme.colors.gray[3]} strokeDasharray="4 4" />
                      ))}
                    </g>

                    {/* Continuous x-axis ticks */}
                    {!isDiscrete && xScale && (
                      <g transform={`translate(0, ${height - bottomMargin})`}>
                        {xScale.ticks(8).map((tick) => (
                          <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
                            <line y1={0} y2={6} stroke={theme.colors.gray[5]} />
                            <text y={18} textAnchor="middle" fontSize={11} fill={theme.colors.gray[6]}>{tick}</text>
                          </g>
                        ))}
                        {/* X-axis label */}
                        <text
                          x={totalWidth / 2}
                          y={bottomMargin - 2}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={600}
                          fill={theme.colors.gray[7]}
                        >
                          {xAxisOption?.label || selectedX}
                        </text>
                      </g>
                    )}

                    {/* Discrete: bin backgrounds and labels */}
                    {isDiscrete && (
                      <g transform={`translate(0, ${SCATTER_MARGIN.top})`}>
                        {processedData.map((binGroup, i) => {
                          const layout = layoutData.binGroupLayout.get(binGroup.id);
                          if (!layout) return null;
                          if (layout.x > visibleRange[1] || layout.x + layout.width < visibleRange[0]) return null;
                          const bgColor = i % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];
                          const isBinGroupCollapsed = collapsedBinGroups.has(binGroup.id);
                          return (
                            <g key={binGroup.id}>
                              <rect x={layout.x} y={0} width={layout.width} height={innerHeight} fill={bgColor} opacity={0.3} style={{ pointerEvents: 'none' }} />
                              <Tooltip label={<Text size="xs">{binGroup.label}</Text>} openDelay={200}>
                                <rect
                                  x={layout.x}
                                  y={innerHeight}
                                  width={layout.width}
                                  height={25}
                                  fill={isBinGroupCollapsed ? theme.colors.gray[4] : bgColor}
                                  stroke={theme.colors.gray[5]}
                                  strokeWidth={1}
                                />
                              </Tooltip>
                              <foreignObject
                                x={layout.x}
                                y={innerHeight}
                                width={layout.width}
                                height={25}
                                style={{ pointerEvents: 'none' }}
                              >
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: isBinGroupCollapsed ? theme.colors.gray[6] : theme.colors.gray[9],
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    WebkitMaskImage: layout.isOverflowing && !isBinGroupCollapsed ? 'linear-gradient(to right, black 70%, transparent 100%)' : 'none',
                                    maskImage: layout.isOverflowing && !isBinGroupCollapsed ? 'linear-gradient(to right, black 70%, transparent 100%)' : 'none',
                                  }}
                                >
                                  {isBinGroupCollapsed ? '...' : layout.label}
                                </div>
                              </foreignObject>
                              {/* Collapse handle */}
                              <rect
                                x={layout.x + layout.width - 15}
                                y={innerHeight}
                                width={15}
                                height={25}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredCollapse(binGroup.id)}
                                onMouseLeave={() => setHoveredCollapse(null)}
                                onClick={(e) => handleToggleBinGroupCollapse(e, binGroup.id)}
                              />
                              {hoveredCollapse === binGroup.id && (
                                <path
                                  d={isBinGroupCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'}
                                  transform={`translate(${layout.x + layout.width - 12}, ${innerHeight + 6}) scale(0.6)`}
                                  fill="none"
                                  stroke={theme.colors.gray[7]}
                                  strokeWidth={2}
                                  style={{ pointerEvents: 'none' }}
                                />
                              )}
                              {/* Average line */}
                              {showAvg && binGroup.avg !== null && (
                                <AverageLine
                                  x1={layout.x}
                                  x2={layout.x + layout.width}
                                  y={yScale(binGroup.avg)}
                                  label={(
                                    <Box>
                                      <Text size="xs">
                                        {SCATTER_X_AXIS_OPTIONS.find((o) => o.value === selectedX)?.label || selectedX}
                                        :
                                        {' '}
                                        {binGroup.label}
                                      </Text>
                                      <Text size="xs">
                                        <Text component="span" fw={700}>Avg</Text>
                                        {' '}
                                        {varConfig.label}
                                        :
                                        {' '}
                                        <Text component="span" fw={700} size="xs">
                                          {binGroup.avg.toFixed(1)}
                                          {' '}
                                          {varConfig.unit}
                                        </Text>
                                      </Text>
                                    </Box>
                                  )}
                                  color={theme.colors.blue[4]}
                                />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Continuous mode avg line */}
                    {!isDiscrete && showAvg && processedData[0]?.avg !== null && (
                      <g transform={`translate(0, ${SCATTER_MARGIN.top})`}>
                        <AverageLine
                          x1={0}
                          x2={totalWidth}
                          y={yScale(processedData[0].avg!)}
                          label={(
                            <Box>
                              <Text size="xs">
                                <Text component="span" fw={700}>Avg</Text>
                                {' '}
                                {varConfig.label}
                                :
                                {' '}
                                <Text component="span" fw={700} size="xs">
                                  {processedData[0].avg!.toFixed(1)}
                                  {' '}
                                  {varConfig.unit}
                                </Text>
                              </Text>
                            </Box>
                          )}
                          color={theme.colors.blue[4]}
                        />
                      </g>
                    )}

                    {/* Target overlay */}
                    {showTargets && varConfig.defaultTargets && (
                      <ScatterTargetOverlay
                        totalWidth={totalWidth}
                        yScale={yScale}
                        targets={targets}
                        theme={theme}
                        varConfig={varConfig}
                        setHoveredTarget={setHoveredTarget}
                      />
                    )}

                    {/* Brush selection */}
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
                    {/* Hover crosshair reference lines */}
                    {tooltipData && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Vertical line from point down to x-axis */}
                        <line
                          x1={tooltipData.x}
                          x2={tooltipData.x}
                          y1={SCATTER_MARGIN.top}
                          y2={height - bottomMargin}
                          stroke={theme.colors.gray[5]}
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          opacity={0.6}
                        />
                        {/* Horizontal line from y-axis to point */}
                        <line
                          x1={0}
                          x2={totalWidth}
                          y1={tooltipData.y}
                          y2={tooltipData.y}
                          stroke={theme.colors.gray[5]}
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          opacity={0.6}
                        />
                      </g>
                    )}
                  </svg>

                  {/* Canvas layer for dots */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: Math.max(0, visibleRange[0]),
                      pointerEvents: 'none',
                    }}
                  />

                  {/* HTML Tooltip styled like Mantine without the lag */}
                  {tooltipData && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: Math.max(10, tooltipData.y - 50),
                        left: Math.min(totalWidth - 120, tooltipData.x + 10),
                        backgroundColor: 'white',
                        border: `1px solid ${theme.colors.gray[3]}`,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    >
                      <Text size="xs">
                        Case:
                        {' '}
                        {tooltipData.caseData.case_id}
                      </Text>
                      <Text size="xs">
                        {varConfig.label}
                        :
                        {' '}
                        <Text component="span" fw={700} size="xs">
                          {(tooltipData.caseData[varConfig.key] as number)?.toFixed(1)}
                          {' '}
                          {varConfig.unit}
                        </Text>
                      </Text>
                    </Box>
                  )}
                </div>
              </Box>
            </div>
          </Flex>
        </div>
      </Box>
      <AddGroupModal
        opened={groupModalOpened}
        onClose={() => setGroupModalOpened(false)}
        name={formName}
        onNameChange={setFormName}
        color={formColor}
        onColorChange={setFormColor}
        conditions={formConditions}
        onConditionsChange={setFormConditions}
        existingGroups={groups}
        editingGroupId={editingGroupId}
        onRemoveGroup={(id) => {
          setGroups((prev) => prev.filter((g) => g.id !== id));
          if (editingGroupId === id) {
            setEditingGroupId(null);
            setFormName('');
            setFormColor(chartColors[groups.length > 1 ? groups.length - 1 : 0]);
            setFormConditions([{ field: '', operator: '>', value: 0 }]);
          }
        }}
        onEditGroup={(group) => {
          setEditingGroupId(group.id);
          setFormName(group.name);
          setFormColor(group.color);
          setFormConditions([...group.conditions]);
        }}
        onResetForm={() => {
          setEditingGroupId(null);
          setFormName('');
          setFormColor(chartColors[groups.length]);
          setFormConditions([{ field: '', operator: '>', value: 0 }]);
        }}
        onSave={() => {
          const defaultName = formName || formConditions.map((cond) => {
            const fieldDef = CONDITION_FIELDS_FLAT.find((f) => f.value === cond.field);
            const label = fieldDef?.label || cond.field;
            return `${label} ${cond.operator} ${cond.value}`;
          }).join(', ');
          if (editingGroupId) {
            setGroups((prev) => prev.map((g) => (
              g.id === editingGroupId
                ? {
                  ...g, name: defaultName, color: formColor, conditions: formConditions,
                }
                : g)));
          } else {
            const newGroup: GroupDefinition = {
              id: `grp-${Date.now()}`,
              name: defaultName,
              color: formColor,
              conditions: [...formConditions],
            };
            setGroups((prev) => [...prev, newGroup]);
          }
          setEditingGroupId(null);
          setFormName('');
          setFormColor(chartColors[groups.length + (editingGroupId ? 0 : 1)]);
          setFormConditions([{ field: '', operator: '>', value: 0 }]);
        }}
        isFormValid={formConditions.length > 0 && formConditions.every((c) => c.field !== '')}
      />
    </>
  ));
}
// #endregion
