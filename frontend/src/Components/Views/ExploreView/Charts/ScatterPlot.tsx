import {
  useMemo, useState, useContext, memo, useCallback, useEffect, useRef,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  Box, CloseButton, Title, Flex, useMantineTheme,
  Tooltip, MantineTheme, Select, Button, Text, SegmentedControl,
} from '@mantine/core';
import {
  IconGripVertical, IconArrowUp, IconArrowDown, IconArrowRightDashed,
} from '@tabler/icons-react';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../../Store/Store';
import {
  DumbbellCase, LAB_RESULTS, BLOOD_COMPONENTS,
  SCATTER_X_AXIS_OPTIONS, SCATTER_Y_AXIS_OPTIONS,
  SCATTER_MARGIN, SCATTER_DOT_RADIUS, SCATTER_CHAR_WIDTH_CASE,
  SCATTER_DRAG_LIMIT, ScatterPlotConfig,
} from '../../../../Types/application';
import { smallHoverColor } from '../../../../Theme/mantineTheme';
import {
  getProcessedScatterData, calculateScatterLayout,
  buildSpatialIndex, findNearestPoint,
  ScatterVarConfig, PointPosition,
} from './ScatterPlotUtils';

// #region Y-Axis
const ScatterYAxis = memo(({
  height, yScale, theme, varConfig, targets, setTargets,
  hoveredTarget, setHoveredTarget, hasNestedBins,
}: {
  height: number;
  yScale: ScaleLinear<number, number>;
  theme: MantineTheme;
  varConfig: ScatterVarConfig;
  targets: { min: number; max: number };
  setTargets: React.Dispatch<React.SetStateAction<{ min: number; max: number }>>;
  hoveredTarget: string | null;
  setHoveredTarget: (t: string | null) => void;
  hasNestedBins: boolean;
}) => {
  const bottomMargin = hasNestedBins ? 50 : 25;
  const innerHeight = Math.max(0, height - SCATTER_MARGIN.top - bottomMargin);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const handleDragStart = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const handleMouseMove = (e: MouseEvent) => {
      const pixelRange = innerHeight;
      const valueRange = varConfig.max - varConfig.min;
      const valuePerPixel = valueRange / pixelRange;
      const deltaValue = e.movementY * valuePerPixel;
      setTargets((prev) => {
        const val = prev[dragging];
        let newVal = val - deltaValue;
        const baseVal = varConfig.defaultTargets[dragging];
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
        x1={0} x2={totalWidth} y1={yScale(targets.min)} y2={yScale(targets.min)}
        stroke="transparent" strokeWidth={10} style={{ cursor: 'default' }}
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
        x1={0} x2={totalWidth} y1={yScale(targets.max)} y2={yScale(targets.max)}
        stroke="transparent" strokeWidth={10} style={{ cursor: 'default' }}
        onMouseEnter={() => { setHoveredTarget('max'); setHoveredLine('max'); }}
        onMouseLeave={() => { setHoveredTarget(null); setHoveredLine(null); }}
        onMouseMove={handleMouseMove}
      />
    </g>
  );
});
ScatterTargetOverlay.displayName = 'ScatterTargetOverlay';
// #endregion

// #region ScatterPlot Export
export function ScatterPlot({ chartConfig }: { chartConfig: ScatterPlotConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  // State
  const [selectedX, setSelectedX] = useState<string>(chartConfig.xAxisVar || 'rbc_units');
  const [selectedY, setSelectedY] = useState<string>(chartConfig.yAxisVar || 'post_hgb');
  const [showTargets, setShowTargets] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [sortMode, setSortMode] = useState<string>('time');
  const [collapsedBinGroups, setCollapsedBinGroups] = useState<Set<string>>(new Set());
  const [collapsedNestedBins, setCollapsedNestedBins] = useState<Set<string>>(new Set());

  const xAxisOption = useMemo(
    () => SCATTER_X_AXIS_OPTIONS.find((o) => o.value === selectedX),
    [selectedX],
  );
  const isDiscrete = xAxisOption?.isDiscrete ?? true;
  const hasNestedBins = selectedX === 'year_quarter';

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
        defaultTargets: { min: 0, max: 10 },
      };
    }
    return {
      label: selectedY, unit: '', min: 0, max: 100,
      key: selectedY as keyof DumbbellCase,
      defaultTargets: { min: 0, max: 50 },
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
  const [targets, setTargets] = useState(varConfig.defaultTargets);
  useEffect(() => { setTargets(varConfig.defaultTargets); }, [varConfig.defaultTargets]);

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

  // Collapse handlers
  const handleToggleBinGroupCollapse = useCallback((_e: React.MouseEvent, id: string) => {
    setCollapsedBinGroups((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const handleToggleNestedBinCollapse = useCallback((_e: React.MouseEvent, id: string) => {
    setCollapsedNestedBins((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  // Flatten nested series data: store format is [{name, color, data: case[]}, ...]
  const rawData = useMemo(() => {
    const storeData = store.exploreChartData[chartConfig.chartId];
    if (!storeData) return [] as DumbbellCase[];
    // Check if data is in the old series format ({data: [...]}) or flat DumbbellCase[]
    if (Array.isArray(storeData) && storeData.length > 0 && 'data' in storeData[0]) {
      // Old series format: flatten the inner data arrays
      return ((storeData as unknown) as { data: DumbbellCase[] }[]).flatMap((s) => s.data);
    }
    return (storeData as DumbbellCase[]) || [];
  }, [store.exploreChartData, chartConfig.chartId]);
  const processedData = useMemo(
    () => getProcessedScatterData(rawData, selectedX, varConfig.key, sortMode, isDiscrete),
    [rawData, selectedX, varConfig.key, sortMode, isDiscrete],
  );

  // Layout (discrete mode)
  const layoutData = useMemo(() => {
    if (!isDiscrete) return { binGroupLayout: new Map(), nestedBinLayout: new Map(), totalWidth: 0 };
    return calculateScatterLayout(processedData, collapsedBinGroups, collapsedNestedBins, selectedX, (t: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) { context.font = `600 12px ${theme.fontFamily}`; return context.measureText(t).width; }
      return t.length * 7;
    });
  }, [processedData, collapsedBinGroups, collapsedNestedBins, selectedX, isDiscrete, theme.fontFamily]);

  // Responsive size
  const { ref: sizeRef, height: measuredHeight, width: measuredWidth } = useElementSize();
  const height = measuredHeight || 400;
  const containerWidth = measuredWidth || 600;
  const bottomMargin = hasNestedBins ? 50 : 25;
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
    let globalCaseIdx = 0;

    if (!isDiscrete && xScale && xVarKey) {
      // Continuous mode
      rawData.forEach((c) => {
        const xVal = c[xVarKey] as number | null;
        const yVal = c[varConfig.key] as number | null;
        if (xVal !== null && xVal !== undefined && yVal !== null && yVal !== undefined) {
          points.push({
            x: xScale(xVal),
            y: yScale(yVal) + SCATTER_MARGIN.top,
            caseIdx: globalCaseIdx,
            binGroupIdx: 0,
            nestedBinIdx: 0,
            caseInBinIdx: globalCaseIdx,
          });
        }
        globalCaseIdx += 1;
      });
    } else {
      // Discrete mode
      processedData.forEach((binGroup, bgIdx) => {
        if (collapsedBinGroups.has(binGroup.id)) return;
        binGroup.nestedBins.forEach((nestedBin, nbIdx) => {
          if (collapsedNestedBins.has(nestedBin.id)) return;
          const nbLayout = layoutData.nestedBinLayout.get(nestedBin.id);
          if (!nbLayout) return;
          nestedBin.cases.forEach((c, cIdx) => {
            const yVal = c[varConfig.key] as number | null;
            if (yVal !== null && yVal !== undefined) {
              const caseX = nbLayout.x + cIdx * SCATTER_CHAR_WIDTH_CASE + SCATTER_CHAR_WIDTH_CASE / 2;
              points.push({
                x: caseX,
                y: yScale(yVal) + SCATTER_MARGIN.top,
                caseIdx: globalCaseIdx,
                binGroupIdx: bgIdx,
                nestedBinIdx: nbIdx,
                caseInBinIdx: cIdx,
              });
            }
            globalCaseIdx += 1;
          });
        });
      });
    }
    return points;
  }, [isDiscrete, xScale, xVarKey, rawData, varConfig.key, yScale, processedData, collapsedBinGroups, collapsedNestedBins, layoutData.nestedBinLayout]);

  // Spatial index
  const spatialIndex = useMemo(() => buildSpatialIndex(pointPositions), [pointPositions]);

  // Selection brush state
  const chartRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
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
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    const hovered = hoveredPointRef.current;
    const sel = appliedSelection;

    for (let i = 0; i < pointPositions.length; i += 1) {
      const p = pointPositions[i];
      let color = theme.colors.blue[6];
      let radius = SCATTER_DOT_RADIUS;
      let opacity = 0.7;

      // Check selection
      if (sel) {
        const minX = Math.min(sel.x1, sel.x2);
        const maxX = Math.max(sel.x1, sel.x2);
        const minY = Math.min(sel.y1, sel.y2);
        const maxY = Math.max(sel.y1, sel.y2);
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          color = theme.colors.orange[6];
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
  }, [pointPositions, appliedSelection, theme]);

  // Redraw canvas when dependencies change
  useEffect(() => { drawPoints(); }, [drawPoints]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${height}px`;
    drawPoints();
  }, [totalWidth, height, drawPoints]);

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
    setSelection({ x1: x, y1: y, x2: x, y2: y });
    setAppliedSelection(null);
    initialSelection.current = { x1: x, y1: y, x2: x, y2: y };
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
          const allCases = isDiscrete
            ? processedData.flatMap((bg) => bg.nestedBins.flatMap((nb) => nb.cases))
            : rawData;
          const caseData = allCases[nearest.caseIdx];
          if (caseData) setTooltipData({ x: nearest.x, y: nearest.y, caseData });
        } else {
          setTooltipData(null);
        }
        requestAnimationFrame(drawPoints);
      }
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
      setSelection({ x1: initialSelection.current.x1 + dx, y1: initialSelection.current.y1 + clampedDy, x2: initialSelection.current.x2 + dx, y2: initialSelection.current.y2 + clampedDy });
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
      setSelection({ x1: nMinX, y1: nMinY, x2: nMaxX, y2: nMaxY });
    }
  }, [interactionMode, selection, height, resizeHandle, bottomMargin, spatialIndex, pointPositions, drawPoints, isDiscrete, processedData, rawData]);

  const handleMouseUp = useCallback(() => {
    setInteractionMode('idle');
    setResizeHandle(null);
    dragStart.current = null;
    initialSelection.current = null;
    if (selection) {
      if (Math.abs(selection.x2 - selection.x1) < 5 && Math.abs(selection.y2 - selection.y1) < 5) {
        setSelection(null); setAppliedSelection(null);
      } else { setAppliedSelection(selection); }
    }
  }, [selection]);

  // X axis label for title
  const xLabel = xAxisOption?.label || selectedX;
  const yLabel = SCATTER_Y_AXIS_OPTIONS.find((o) => o.value === selectedY)?.label || selectedY;

  return useObserver(() => (
    <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>
      {/* Header */}
      <Flex direction="row" justify="space-between" align="center" pl="md" pr="md" pt="xs">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            <span style={{ color: theme.colors.gray[6], fontWeight: 500 }}>{yLabel}</span>
            {' '}
            <span style={{ color: theme.colors.gray[6], fontWeight: 500 }}>by</span>
            {' '}
            {xLabel}
          </Title>
        </Flex>
        <Flex direction="row" align="center" gap="sm">
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
                  root: { backgroundColor: 'transparent', border: `1px solid ${t.colors.gray[3]}`, minHeight: 30 },
                  control: { border: '0 !important' },
                  label: { padding: '0 8px', fontWeight: 500 },
                  indicator: { backgroundColor: t.colors.gray[2] },
                })}
              />
            </Flex>
          )}

          {/* Show buttons */}
          <Flex direction="row" align="center" gap="xs" ml={0}>
            <Text size="xs" c="dimmed" fw={500}>Show:</Text>
            <Button.Group>
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
              <Tooltip label="Show/hide average line" openDelay={500}>
                <Button
                  size="xs"
                  px={8}
                  variant={showAvg ? 'light' : 'default'}
                  color="gray"
                  onClick={() => setShowAvg(!showAvg)}
                  styles={{ root: { marginLeft: -1, borderColor: showAvg ? theme.colors.gray[6] : theme.colors.gray[4], fontWeight: 400, color: theme.colors.gray[9] } }}
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
            hasNestedBins={hasNestedBins}
            yScale={yScale}
            theme={theme}
            varConfig={varConfig}
            targets={targets}
            setTargets={setTargets}
            hoveredTarget={hoveredTarget}
            setHoveredTarget={setHoveredTarget}
          />

          {/* Scrollable Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Box style={{ overflowX: isDiscrete ? 'auto' : 'hidden', overflowY: 'hidden' }} ref={scrollViewportRef} onScroll={handleScroll}>
              <div
                ref={chartRef}
                style={{ width: totalWidth, height, position: 'relative', userSelect: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); hoveredPointRef.current = null; setTooltipData(null); requestAnimationFrame(drawPoints); }}
              >
                {/* SVG layer for gridlines, bins, targets, avg, brush */}
                <svg width={totalWidth} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
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
                                y={!hasNestedBins ? innerHeight : innerHeight + 25}
                                width={layout.width}
                                height={25}
                                fill={isBinGroupCollapsed ? theme.colors.gray[4] : bgColor}
                                stroke={theme.colors.gray[5]}
                                strokeWidth={1}
                              />
                            </Tooltip>
                            <text
                              x={layout.x + layout.width / 2}
                              y={!hasNestedBins ? innerHeight + 17 : innerHeight + 42}
                              textAnchor="middle"
                              fontSize={12}
                              fontWeight={600}
                              fill={isBinGroupCollapsed ? theme.colors.gray[6] : theme.colors.gray[9]}
                              style={{ pointerEvents: 'none' }}
                            >
                              {isBinGroupCollapsed ? '...' : layout.label}
                            </text>
                            {/* Bin group collapse toggle */}
                            {!isBinGroupCollapsed && hasNestedBins && (
                              <>
                                <rect
                                  x={layout.x + layout.width - 15}
                                  y={innerHeight + 25}
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
                                    d="M 8 5 L 2 12 L 8 19"
                                    transform={`translate(${layout.x + layout.width - 12}, ${innerHeight + 31}) scale(0.6)`}
                                    fill="none"
                                    stroke={theme.colors.gray[7]}
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'none' }}
                                  />
                                )}
                              </>
                            )}
                            {/* Nested bins */}
                            {!isBinGroupCollapsed && hasNestedBins && binGroup.nestedBins.map((nb, nbIdx) => {
                              const nbLayout = layoutData.nestedBinLayout.get(nb.id);
                              if (!nbLayout) return null;
                              const isNbCollapsed = collapsedNestedBins.has(nb.id);
                              const nbColor = nbIdx % 2 === 0 ? theme.colors.gray[2] : theme.colors.gray[0];
                              return (
                                <g key={nb.id}>
                                  <rect x={nbLayout.x} y={innerHeight} width={nbLayout.width} height={25} fill={isNbCollapsed ? theme.colors.gray[4] : nbColor} stroke={theme.colors.gray[4]} strokeWidth={1} />
                                  <text x={nbLayout.x + nbLayout.width / 2} y={innerHeight + 17} textAnchor="middle" fontSize={10} fontWeight={400} fill={theme.colors.gray[6]} style={{ pointerEvents: 'none' }}>
                                    {isNbCollapsed ? '...' : nb.label}
                                  </text>
                                  <rect
                                    x={nbLayout.x + nbLayout.width - 10}
                                    y={innerHeight}
                                    width={10}
                                    height={25}
                                    fill="transparent"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredCollapse(nb.id)}
                                    onMouseLeave={() => setHoveredCollapse(null)}
                                    onClick={(e) => handleToggleNestedBinCollapse(e, nb.id)}
                                  />
                                </g>
                              );
                            })}
                            {/* Average line */}
                            {showAvg && binGroup.avg !== null && (
                              <g>
                                <line
                                  x1={layout.x}
                                  x2={layout.x + layout.width}
                                  y1={yScale(binGroup.avg)}
                                  y2={yScale(binGroup.avg)}
                                  stroke={theme.colors.blue[4]}
                                  strokeWidth={1.5}
                                  strokeOpacity={0.6}
                                  style={{ pointerEvents: 'none' }}
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Continuous mode avg line */}
                  {!isDiscrete && showAvg && processedData[0]?.avg !== null && (
                    <g transform={`translate(0, ${SCATTER_MARGIN.top})`}>
                      <line
                        x1={0}
                        x2={totalWidth}
                        y1={yScale(processedData[0].avg!)}
                        y2={yScale(processedData[0].avg!)}
                        stroke={theme.colors.blue[4]}
                        strokeWidth={1.5}
                        strokeOpacity={0.6}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  )}

                  {/* Target overlay */}
                  {showTargets && (
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
                </svg>

                {/* Canvas layer for dots */}
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                />

                {/* Tooltip anchor */}
                {tooltipData && (
                  <Tooltip
                    label={(
                      <Box>
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
                    position="top"
                    opened
                  >
                    <div style={{ position: 'absolute', left: tooltipData.x - 1, top: tooltipData.y - 1, width: 2, height: 2, pointerEvents: 'none' }} />
                  </Tooltip>
                )}
              </div>
            </Box>
          </div>
        </Flex>
      </div>
    </Box>
  ));
}
// #endregion
