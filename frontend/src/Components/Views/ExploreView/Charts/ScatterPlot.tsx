import {
  Flex, Title, CloseButton, Stack, Select, ActionIcon, Popover, MultiSelect, Button, Group, Badge,
} from '@mantine/core';
import { IconGripVertical, IconCircles, IconFilter, IconSettings, IconPlus, IconX } from '@tabler/icons-react';
import { useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AddGroupModal, GroupDefinition, GroupCondition } from './AddGroupModal';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Cell, ReferenceLine,
} from 'recharts';
import { Store } from '../../../../Store/Store';
import {
  ScatterPlotData, ScatterPlotConfig,
  BLOOD_COMPONENT_OPTIONS, LAB_RESULT_OPTIONS,
  dashboardXAxisVars, dashboardYAxisVars,
} from '../../../../Types/application';
import { smallHoverColor, smallSelectColor } from '../../../../Theme/mantineTheme';
import { SCATTER_PLOT_REFERENCE_LINES } from '../../../../Store/ScatterPlotDummyData';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

const getUnit = (varName: string) => {
  const blood = BLOOD_COMPONENT_OPTIONS.find((b) => b.value === varName);
  if (blood) return blood.units.sum; // Simple approximation for now
  const lab = LAB_RESULT_OPTIONS.find((l) => l.value === varName);
  if (lab) return lab.units.sum;
  return '';
};

const checkCondition = (point: any, condition: GroupCondition) => {
  const val = point[condition.field];
  // Handle boolean/string comparisons
  if (typeof condition.value === 'boolean' || condition.value === 'true' || condition.value === 'false') {
    // robust boolean check
    const boolVal = String(val) === 'true';
    const targetBool = String(condition.value) === 'true';
    return condition.operator === '!=' ? boolVal !== targetBool : boolVal === targetBool;
  }

  // Numeric check
  const numVal = Number(val);
  const targetVal = Number(condition.value);

  switch (condition.operator) {
    case '>': return numVal > targetVal;
    case '>=': return numVal >= targetVal;
    case '<': return numVal < targetVal;
    case '<=': return numVal <= targetVal;
    case '=': return numVal === targetVal;
    case '!=': return numVal !== targetVal;
    default: return false;
  }
};

function CustomTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  xAxisVar,
  yAxisVar,
}: {
  active?: boolean;
  payload?: any[];
  xLabel: string;
  yLabel: string;
  xAxisVar: string;
  yAxisVar: string;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
      }}
      >
        <p style={{ margin: '2px 0' }}>
          {xLabel}
          :
          {' '}
          {data[xAxisVar]}
        </p>
        <p style={{ margin: '2px 0' }}>
          {yLabel}
          :
          {' '}
          {data[yAxisVar]}
        </p>
      </div>
    );
  }
  return null;
}

export function ScatterPlot({ chartConfig }: { chartConfig: ScatterPlotConfig }) {
  const store = useContext(Store);

  const dataKeyString = useMemo(
    () => `${chartConfig.aggregation}_${chartConfig.yAxisVar}_${chartConfig.xAxisVar}`,
    [chartConfig.aggregation, chartConfig.yAxisVar, chartConfig.xAxisVar],
  );

  const [groups, setGroups] = useState<GroupDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localRefLines, setLocalRefLines] = useState<any[]>([]);

  useEffect(() => {
    setLocalRefLines(SCATTER_PLOT_REFERENCE_LINES[chartConfig.yAxisVar]?.map((l) => ({ ...l })) || []);
  }, [chartConfig.yAxisVar]);

  // Process data into groups

  // Process data into groups
  const processedData = useMemo(() => {
    const rawData = (store.exploreStore.chartData[dataKeyString] as ScatterPlotData) || [];
    // 1. Flatten all data points
    const allPoints = rawData.flatMap((series) => series.data);

    if (groups.length === 0) {
      // Default View: Single "Visits" group (All points)
      return [{
        name: 'Surigcal Cases',
        color: '#6b7280', // Darker grey
        data: allPoints,
      }];
    }

    // 2. Buckets
    const buckets: Record<string, any[]> = {};
    groups.forEach(g => { buckets[g.id] = []; });
    buckets['all'] = [];

    // 3. Assign
    allPoints.forEach(point => {
      let assigned = false;
      for (const group of groups) {
        // Check all conditions for this group (AND logic)
        const matches = group.conditions.every(c => checkCondition(point, c));
        if (matches) {
          buckets[group.id].push(point);
          assigned = true;
          break; // First match wins
        }
      }
      if (!assigned) {
        buckets['all'].push(point);
      }
    });

    // 4. Convert to Series
    const result = groups.map(g => ({
      name: g.name,
      color: g.color,
      data: buckets[g.id],
    }));

    // Add "All" group if it has points
    if (buckets['all'].length > 0) {
      result.push({
        name: 'All',
        color: '#9ca3af', // Darker grey (was #e5e7eb)
        data: buckets['all'],
      });
    }

    return result;
  }, [store.exploreStore.chartData, dataKeyString, groups]);

  const data = processedData; // Use processed data for rendering logic depending on 'data' variable



  // Options for Selects
  const scatterXOptions = useMemo(() => [
    ...BLOOD_COMPONENT_OPTIONS.map((b) => ({ value: b.value, label: b.label.base })),
  ], []);

  const scatterYOptions = useMemo(() => [
    ...LAB_RESULT_OPTIONS.map((l) => ({ value: l.value, label: l.label.base })),
  ], []);



  const handleXChange = (val: string | null) => {
    if (!val) return;
    const xLabel = scatterXOptions.find((o) => o.value === val)?.label || val;
    const yLabel = scatterYOptions.find((o) => o.value === chartConfig.yAxisVar)?.label || chartConfig.yAxisVar;

    store.exploreStore.updateChartConfig({
      ...chartConfig,
      xAxisVar: val as typeof dashboardXAxisVars[number],
      title: `${yLabel} vs ${xLabel}`,
    });
  };

  const handleYChange = (val: string | null) => {
    if (!val) return;
    const xLabel = scatterXOptions.find((o) => o.value === chartConfig.xAxisVar)?.label || chartConfig.xAxisVar;
    const yLabel = scatterYOptions.find((o) => o.value === val)?.label || val;

    store.exploreStore.updateChartConfig({
      ...chartConfig,
      yAxisVar: val as typeof dashboardYAxisVars[number],
      title: `${yLabel} vs ${xLabel}`,
    });
  };

  // Define ticks for the x-axis to match the buckets
  // Define ticks for the x-axis to match the buckets
  const { xTicks, xDomain } = useMemo(() => {
    const isCellSaver = chartConfig.xAxisVar === 'cell_saver_ml';
    const ticks = isCellSaver
      ? [0, 100, 200, 300, 400]
      : Array.from({ length: 21 }, (_, i) => i);
    const domain = isCellSaver ? [0, 400] : [0, 20];
    return { xTicks: ticks, xDomain: domain };
  }, [chartConfig.xAxisVar]);

  // Calculate Y Domain
  const yDomain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    data.forEach((series) => {
      series.data.forEach((point) => {
        const val = point[chartConfig.yAxisVar];
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });
    if (min === Infinity) return [0, 100]; // Default
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [data, chartConfig.yAxisVar]);

  // Calculate Median Lines per Bin
  const binMedians = useMemo(() => {
    // Collect all y-values per bin
    const binValues: Record<number, number[]> = {};
    // Initialize bins based on ticks
    xTicks.slice(0, -1).forEach((tick) => { binValues[tick] = []; });

    data.forEach((series) => {
      series.data.forEach((point) => {
        const x = point[chartConfig.xAxisVar];
        const y = point[chartConfig.yAxisVar];
        // Find the bin this point belongs to
        for (let i = 0; i < xTicks.length - 1; i += 1) {
          const start = xTicks[i];
          const end = xTicks[i + 1];
          // Determine strictness. For last bin include end.
          if (x >= start && (i === xTicks.length - 2 ? x <= end : x < end)) {
            binValues[start].push(y);
            break;
          }
        }
      });
    });

    // Compute medians
    return Object.entries(binValues).map(([startStr, values]) => {
      const start = Number(startStr);
      if (values.length === 0) return null;
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;

      const endTickIndex = xTicks.findIndex((t) => t === start);
      const end = xTicks[endTickIndex + 1];

      if (end === undefined) return null;

      return { start, end, median };
    }).filter((b) => b !== null) as { start: number; end: number; median: number }[];
  }, [data, xTicks, chartConfig.xAxisVar, chartConfig.yAxisVar]);

  // Selection State
  const [selection, setSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing' | 'draggingLine'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ seriesIndex: number; pointIndex: number } | null>(null);
  const [hoveredMedian, setHoveredMedian] = useState<{ median: number; range: string; x: number; y: number } | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);
  const [cursorOverride, setCursorOverride] = useState<string | null>(null);
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);


  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const initialSelection = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Constants for Layout
  const MARGIN = { top: 5, right: 20, bottom: 30, left: 20 };
  const Y_AXIS_WIDTH = 60;
  const X_AXIS_HEIGHT = 30;
  const LEGEND_HEIGHT = 40;



  // Helper: Convert Pixel to Data
  const pixelsToData = useCallback((x: number, y: number, width: number, height: number) => {
    const chartLeft = MARGIN.left + Y_AXIS_WIDTH;
    const chartTop = MARGIN.top + LEGEND_HEIGHT;
    const chartWidth = width - chartLeft - MARGIN.right;
    const chartHeight = height - chartTop - MARGIN.bottom - X_AXIS_HEIGHT;

    // Clamp to chart area
    const clampedX = Math.max(chartLeft, Math.min(x, width - MARGIN.right));
    const clampedY = Math.max(chartTop, Math.min(y, height - MARGIN.bottom - X_AXIS_HEIGHT));

    const xRatio = (clampedX - chartLeft) / chartWidth;
    const yRatio = (height - MARGIN.bottom - X_AXIS_HEIGHT - clampedY) / chartHeight; // Y is inverted

    // Use zoomed domain if active, otherwise default domain
    const xVal = xDomain[0] + xRatio * (xDomain[1] - xDomain[0]);
    const yVal = yDomain[0] + yRatio * (yDomain[1] - yDomain[0]);

    return { x: xVal, y: yVal };
  }, [xDomain, yDomain]);

  // Helper: Convert Data to Pixel
  const dataToPixels = useCallback((dataX: number, dataY: number, width: number, height: number) => {
    const chartLeft = MARGIN.left + Y_AXIS_WIDTH;
    const chartTop = MARGIN.top + LEGEND_HEIGHT;
    const chartWidth = width - chartLeft - MARGIN.right;
    const chartHeight = height - chartTop - MARGIN.bottom - X_AXIS_HEIGHT;

    const xRatio = (dataX - xDomain[0]) / (xDomain[1] - xDomain[0]);
    const yRatio = (dataY - yDomain[0]) / (yDomain[1] - yDomain[0]);

    const x = chartLeft + xRatio * chartWidth;
    const y = height - MARGIN.bottom - X_AXIS_HEIGHT - yRatio * chartHeight;

    return { x, y };
  }, [xDomain, yDomain]);



  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for Reference Lines
    if (localRefLines.length > 0) {
      const chartLeft = MARGIN.left + Y_AXIS_WIDTH;
      const chartTop = MARGIN.top + LEGEND_HEIGHT;
      const chartWidth = rect.width - chartLeft - MARGIN.right;
      const chartHeight = rect.height - chartTop - MARGIN.bottom - X_AXIS_HEIGHT;
      const clickTolerance = 10;

      for (let i = 0; i < localRefLines.length; i += 1) {
        const line = localRefLines[i];
        if (line.direction === 'y') {
          const { y: lineY } = dataToPixels(0, line.value, rect.width, rect.height);
          if (Math.abs(y - lineY) <= clickTolerance && x >= chartLeft && x <= chartLeft + chartWidth) {
            setInteractionMode('draggingLine');
            setDraggedLineIndex(i);
            return;
          }
        } else {
          // Horizontal drag (vertical line)
          const { x: lineX } = dataToPixels(line.value, 0, rect.width, rect.height);
          if (Math.abs(x - lineX) <= clickTolerance && y >= chartTop && y <= chartTop + chartHeight) {
            setInteractionMode('draggingLine');
            setDraggedLineIndex(i);
            return;
          }
        }
      }
    }

    // Check if clicking existing selection
    if (selection) {
      const p1 = dataToPixels(selection.x1, selection.y1, rect.width, rect.height);
      const p2 = dataToPixels(selection.x2, selection.y2, rect.width, rect.height);
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      const tolerance = 10; // Increased tolerance

      // Check handles
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

      // Check inside
      if (x > minX && x < maxX && y > minY && y < maxY) {
        setInteractionMode('moving');
        const { x: dataX, y: dataY } = pixelsToData(x, y, rect.width, rect.height);
        dragStart.current = { x: dataX, y: dataY };
        initialSelection.current = { ...selection };
        return;
      }
    }

    // Check bounds for new selection
    const chartLeft = MARGIN.left + Y_AXIS_WIDTH;
    const chartTop = MARGIN.top + LEGEND_HEIGHT;
    const chartRight = rect.width - MARGIN.right;
    const chartBottom = rect.height - MARGIN.bottom - X_AXIS_HEIGHT;
    if (x < chartLeft || x > chartRight || y < chartTop || y > chartBottom) return;

    // Start new selection
    const { x: dataX, y: dataY } = pixelsToData(x, y, rect.width, rect.height);
    setInteractionMode('selecting');
    setSelection({ x1: dataX, y1: dataY, x2: dataX, y2: dataY });
    initialSelection.current = { x1: dataX, y1: dataY, x2: dataX, y2: dataY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update Cursor when Idle
    if (interactionMode === 'idle') {
      let cursor = 'crosshair';

      // Check hover over ref lines
      if (localRefLines.length > 0) {
        const chartLeft = MARGIN.left + Y_AXIS_WIDTH;
        const chartTop = MARGIN.top + LEGEND_HEIGHT;
        const chartWidth = rect.width - chartLeft - MARGIN.right;
        const chartHeight = rect.height - chartTop - MARGIN.bottom - X_AXIS_HEIGHT;
        const hoverTolerance = 10;

        for (const line of localRefLines) {
          if (line.direction === 'y') {
            const { y: lineY } = dataToPixels(0, line.value, rect.width, rect.height);
            if (Math.abs(y - lineY) <= hoverTolerance && x >= chartLeft && x <= chartLeft + chartWidth) {
              cursor = 'ns-resize';
              break;
            }
          } else {
            const { x: lineX } = dataToPixels(line.value, 0, rect.width, rect.height);
            if (Math.abs(x - lineX) <= hoverTolerance && y >= chartTop && y <= chartTop + chartHeight) {
              cursor = 'ew-resize';
              break;
            }
          }
        }
      }

      if (selection) {
        const p1 = dataToPixels(selection.x1, selection.y1, rect.width, rect.height);
        const p2 = dataToPixels(selection.x2, selection.y2, rect.width, rect.height);
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const tolerance = 10;

        if ((Math.abs(x - minX) < tolerance && Math.abs(y - minY) < tolerance) || (Math.abs(x - maxX) < tolerance && Math.abs(y - maxY) < tolerance)) cursor = 'nwse-resize';
        else if ((Math.abs(x - maxX) < tolerance && Math.abs(y - minY) < tolerance) || (Math.abs(x - minX) < tolerance && Math.abs(y - maxY) < tolerance)) cursor = 'nesw-resize';
        else if ((Math.abs(y - minY) < tolerance || Math.abs(y - maxY) < tolerance) && x > minX && x < maxX) cursor = 'ns-resize';
        else if ((Math.abs(x - minX) < tolerance || Math.abs(x - maxX) < tolerance) && y > minY && y < maxY) cursor = 'ew-resize';
        else if (x > minX && x < maxX && y > minY && y < maxY) cursor = 'move';
      }
      chartRef.current.style.cursor = cursorOverride || cursor;
      return;
    }

    const { x: dataX, y: dataY } = pixelsToData(x, y, rect.width, rect.height);

    if (interactionMode === 'selecting') {
      if (!initialSelection.current) return;
      setSelection({
        x1: initialSelection.current.x1,
        y1: initialSelection.current.y1,
        x2: dataX,
        y2: dataY,
      });
    } else if (interactionMode === 'moving') {
      if (!initialSelection.current || !dragStart.current) return;
      const dx = dataX - dragStart.current.x;
      const dy = dataY - dragStart.current.y;
      setSelection({
        x1: initialSelection.current.x1 + dx,
        y1: initialSelection.current.y1 + dy,
        x2: initialSelection.current.x2 + dx,
        y2: initialSelection.current.y2 + dy,
      });
    } else if (interactionMode === 'resizing') {
      if (!initialSelection.current) return;
      const newSel = { ...selection! };
      const minX = Math.min(initialSelection.current.x1, initialSelection.current.x2);
      const maxX = Math.max(initialSelection.current.x1, initialSelection.current.x2);
      const minY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const maxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);

      let newMinX = minX; let newMaxX = maxX; let newMinY = minY; let newMaxY = maxY;

      if (resizeHandle?.includes('w')) newMinX = dataX;
      if (resizeHandle?.includes('e')) newMaxX = dataX;
      if (resizeHandle?.includes('n')) newMaxY = dataY;
      if (resizeHandle?.includes('s')) newMinY = dataY;

      setSelection({ x1: newMinX, y1: newMinY, x2: newMaxX, y2: newMaxY });
    } else if (interactionMode === 'draggingLine') {
      if (draggedLineIndex === null) return;
      // dataX/Y already calculated above
      const line = localRefLines[draggedLineIndex];
      let newValue = line.direction === 'y' ? dataY : dataX;

      // Apply constraints if maxAdjustment is defined
      if (line.maxAdjustment !== undefined) {
        // Find the initial value from the source of truth (dummy data) to calculate the range
        // We look up by the current yAxisVar (or xAxisVar if direction is x, but we only have y-axis refs for now usually)
        // If we can't find original, we fallback to current (no constraint essentially, or strict to current)
        // Better: store initialValue in localRefLines state when initializing.
        // But for now, let's look it up from SCATTER_PLOT_REFERENCE_LINES directly.

        const originalLines = SCATTER_PLOT_REFERENCE_LINES[chartConfig.yAxisVar];
        // We assume the index matches because we initialized localRefLines from it and didn't reorder
        const originalLine = originalLines?.[draggedLineIndex];

        if (originalLine) {
          const minVal = originalLine.value - line.maxAdjustment;
          const maxVal = originalLine.value + line.maxAdjustment;
          newValue = Math.max(minVal, Math.min(maxVal, newValue));
        }
      }

      const newLines = [...localRefLines];
      newLines[draggedLineIndex] = { ...line, value: newValue };
      setLocalRefLines(newLines);
    }
  };

  const handleMouseUp = () => {
    setInteractionMode('idle');
    setResizeHandle(null);
    setDraggedLineIndex(null);
    dragStart.current = null;
    initialSelection.current = null;

    // Clear tiny selection
    if (selection && Math.abs(selection.x2 - selection.x1) < (xDomain[1] - xDomain[0]) * 0.01
      && Math.abs(selection.y2 - selection.y1) < (yDomain[1] - yDomain[0]) * 0.01) {
      setSelection(null);
    }
  };

  const isSelected = (point: any) => {
    if (!selection) return true; // Show all if no selection
    const x = point[chartConfig.xAxisVar];
    const y = point[chartConfig.yAxisVar];
    const minX = Math.min(selection.x1, selection.x2);
    const maxX = Math.max(selection.x1, selection.x2);
    const minY = Math.min(selection.y1, selection.y2);
    const maxY = Math.max(selection.y1, selection.y2);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const xLabel = scatterXOptions.find((o) => o.value === chartConfig.xAxisVar)?.label || chartConfig.xAxisVar;
  const yLabel = scatterYOptions.find((o) => o.value === chartConfig.yAxisVar)?.label || chartConfig.yAxisVar;

  return (
    <Stack style={{ height: '100%', width: '100%' }} gap={0}>
      <Flex direction="row" justify="space-between" align="center" pl="md" pt="xs" pb="xs">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          {/** Chart Grip */}
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          {/** Chart Title */}
          <Title order={4}>{chartConfig.title || `${yLabel} vs ${xLabel}`}</Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm" pr="md">
          {/** Action Icons */}
          <ActionIcon variant="subtle" disabled>
            <IconSettings size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" disabled>
            <IconFilter size={18} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            onClick={() => setIsModalOpen(true)}
            disabled={groups.length >= 6}
          >
            <IconCircles size={18} />
          </ActionIcon>

          <AddGroupModal
            opened={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddGroup={(g) => setGroups([...groups, g])}
            onUpdateGroup={(g) => {
              setGroups(groups.map((group) => (group.id === g.id ? g : group)));
            }}
            existingGroups={groups}
            onRemoveGroup={(id) => setGroups(groups.filter(g => g.id !== id))}
          />
          {/** Attribute Selects */}
          <Select
            placeholder="X Axis"
            data={scatterXOptions}
            value={chartConfig.xAxisVar}
            onChange={handleXChange}
            searchable
            w={200}
            leftSection={<span style={{ fontSize: '12px', fontWeight: 700, color: 'gray' }}>X</span>}
            styles={{ input: { height: 30, minHeight: 30 } }}
          />
          <Select
            placeholder="Y Axis"
            data={scatterYOptions}
            value={chartConfig.yAxisVar}
            onChange={handleYChange}
            searchable
            w={200}
            leftSection={<span style={{ fontSize: '12px', fontWeight: 700, color: 'gray' }}>Y</span>}
            styles={{ input: { height: 30, minHeight: 30 } }}
          />
          {/** Close Chart */}
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <div
        ref={chartRef}
        style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <style>{`
          .recharts-wrapper, .recharts-surface {
            cursor: inherit !important;
          }
        `}</style>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={MARGIN}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey={chartConfig.xAxisVar}
              name={xLabel}
              ticks={xTicks}
              domain={xDomain}
              height={X_AXIS_HEIGHT}
              label={{ value: xLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              type="number"
              dataKey={chartConfig.yAxisVar}
              name={yLabel}
              domain={yDomain}
              width={Y_AXIS_WIDTH}
              label={{
                value: yLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '5 5', stroke: '#888', strokeWidth: 1 }}
              content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} xAxisVar={chartConfig.xAxisVar} yAxisVar={chartConfig.yAxisVar} />}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={LEGEND_HEIGHT}
              wrapperStyle={{ paddingBottom: '20px', fontSize: '14px' }}
              onMouseEnter={(o) => setHoveredLegend(o.value)}
              onMouseLeave={() => setHoveredLegend(null)}
            />
            {xTicks.slice(0, -1).map((tick, index) => (
              <ReferenceArea
                key={tick}
                x1={tick}
                x2={xTicks[index + 1]}
                fill={index % 2 === 0 ? '#f0f0f0' : 'white'}
                fillOpacity={1}
              />
            ))}

            {localRefLines.map((line: { value: number; label: string; color: string; direction: 'x' | 'y' }, i: number) => {
              const unit = getUnit(line.direction === 'x' ? chartConfig.xAxisVar : chartConfig.yAxisVar);
              // Extract base label if it was previously modified or just use it
              const baseLabel = line.label.split(':')[0];
              const displayLabel = `${baseLabel}: ${Math.round(line.value * 10) / 10} ${unit}`;

              return (
                <ReferenceLine
                  key={i}
                  y={line.direction === 'y' ? line.value : undefined}
                  x={line.direction === 'x' ? line.value : undefined}
                  stroke={line.color}
                  strokeDasharray="5 5"
                  label={{
                    value: displayLabel,
                    position: 'insideTopLeft',
                    fill: line.color,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              );
            })}
            {selection && (
              <ReferenceArea
                x1={clamp(selection.x1, xDomain[0], xDomain[1])}
                x2={clamp(selection.x2, xDomain[0], xDomain[1])}
                y1={clamp(selection.y1, yDomain[0], yDomain[1])}
                y2={clamp(selection.y2, yDomain[0], yDomain[1])}
                fill="#8884d8"
                fillOpacity={0.3}
                stroke="#8884d8"
                strokeOpacity={0.5}
              />
            )}
            {data.map((series, seriesIndex) => (
              <Scatter
                key={series.name}
                name={series.name}
                data={series.data}
                fill={series.color}
                isAnimationActive={false}
                onMouseEnter={(_, index) => {
                  if (interactionMode !== 'idle') return;
                  setHoveredPoint({ seriesIndex, pointIndex: index });
                  setCursorOverride('pointer');
                }}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setCursorOverride(null);
                }}
                onClick={(point) => {
                  const x = point[chartConfig.xAxisVar];
                  const y = point[chartConfig.yAxisVar];
                  setSelection({
                    x1: x, y1: y, x2: x, y2: y,
                  });
                }}
              >
                {series.data.map((entry, index) => {
                  let fillColor = series.color;
                  let opacity = 0.7;

                  const isHovered = hoveredPoint?.seriesIndex === seriesIndex && hoveredPoint?.pointIndex === index;

                  if (isHovered) {
                    fillColor = smallHoverColor;
                  } else if (selection) {
                    if (isSelected(entry)) {
                      fillColor = smallSelectColor;
                    } else {
                      fillColor = '#ccc';
                      opacity = 0.5;
                    }
                  }

                  if (hoveredLegend && hoveredLegend !== series.name) {
                    opacity = 0.1;
                  }

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      fillOpacity={opacity}
                    />
                  );
                })}
              </Scatter>
            ))}

            {binMedians.map((bin) => {
              const width = bin.end - bin.start;
              const startX = bin.start + width * 0.25;
              const endX = bin.start + width * 0.75;
              return (
                <ReferenceLine
                  key={`median-${bin.start}`}
                  segment={[{ x: startX, y: bin.median }, { x: endX, y: bin.median }]}
                  stroke="#ccc" // Lighter grey
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  isFront
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    // Calculate position relative to chart container
                    if (!chartRef.current) return;
                    const domEvent = e as unknown as React.MouseEvent;
                    if (domEvent && chartRef.current) {
                      const rect = chartRef.current.getBoundingClientRect();
                      const centerX = bin.start + width / 2;
                      const { x: pixelX, y: pixelY } = dataToPixels(centerX, bin.median, rect.width, rect.height);
                      setHoveredMedian({
                        median: bin.median,
                        range: `${bin.start}-${bin.end}`,
                        x: pixelX,
                        y: pixelY,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredMedian(null)}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
        {hoveredMedian && (
          <div
            style={{
              position: 'absolute',
              left: hoveredMedian.x,
              top: hoveredMedian.y - 10,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <p style={{ margin: '2px 0', fontWeight: 600 }}>
              Median
              {' '}
              {yLabel}
              :
              {' '}
              {Math.round(hoveredMedian.median * 100) / 100}
              {' '}
              {getUnit(chartConfig.yAxisVar)}
            </p>
            <p style={{ margin: '2px 0', color: '#666' }}>
              Group:
              {' '}
              {hoveredMedian.range}
              {' '}
              {getUnit(chartConfig.xAxisVar)}
              {' '}
              {xLabel}
            </p>
          </div>
        )}
      </div>
    </Stack>
  );
}
