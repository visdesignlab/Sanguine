import {
  Flex, Title, CloseButton, Stack, Select,
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useContext, useMemo, useState, useRef, useCallback } from 'react';
import {
  ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Cell, ReferenceLine,
} from 'recharts';
import { Store } from '../../../../Store/Store';
import {
  ScatterPlotData, ScatterPlotConfig,
  TIME_AGGREGATION_OPTIONS, BLOOD_COMPONENT_OPTIONS, dashboardYAxisOptions, LAB_RESULT_OPTIONS,
  dashboardXAxisVars, dashboardYAxisVars,
} from '../../../../Types/application';
import { smallHoverColor, smallSelectColor } from '../../../../Theme/mantineTheme';
import { SCATTER_PLOT_REFERENCE_LINES } from '../../../../Store/ScatterPlotDummyData';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

export function ScatterPlot({ chartConfig }: { chartConfig: ScatterPlotConfig }) {
  const store = useContext(Store);

  const dataKeyString = useMemo(
    () => `${chartConfig.aggregation}_${chartConfig.yAxisVar}_${chartConfig.xAxisVar}`,
    [chartConfig.aggregation, chartConfig.yAxisVar, chartConfig.xAxisVar],
  );

  const data = store.exploreStore.chartData[dataKeyString] as ScatterPlotData || [];



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
  const isCellSaver = chartConfig.xAxisVar === 'cell_saver_ml';
  const xTicks = isCellSaver
    ? [0, 100, 200, 300, 400]
    : Array.from({ length: 21 }, (_, i) => i); // [0, 1, 2, ..., 20]
  const xDomain = isCellSaver ? [0, 400] : [0, 20];

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

  // Selection State
  const [selection, setSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'selecting' | 'moving' | 'resizing'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ seriesIndex: number; pointIndex: number } | null>(null);
  const [cursorOverride, setCursorOverride] = useState<string | null>(null);


  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const initialSelection = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Constants for Layout
  const MARGIN = { top: 20, right: 20, bottom: 80, left: 20 };
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
    }
  };

  const handleMouseUp = () => {
    setInteractionMode('idle');
    setResizeHandle(null);
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
          <ComposedChart
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
            {interactionMode === 'idle' && (
              <Tooltip cursor={{ strokeDasharray: '5 5', stroke: '#888', strokeWidth: 1 }} />
            )}
            <Legend
              verticalAlign="top"
              align="right"
              height={LEGEND_HEIGHT}
              wrapperStyle={{ paddingBottom: '20px', fontSize: '14px' }}
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
            {SCATTER_PLOT_REFERENCE_LINES[chartConfig.yAxisVar]?.map((line: { value: number; label: string; color: string; direction: 'x' | 'y' }, i: number) => (
              <ReferenceLine
                key={i}
                y={line.direction === 'y' ? line.value : undefined}
                x={line.direction === 'x' ? line.value : undefined}
                stroke={line.color}
                label={{
                  value: line.label, position: 'insideTopLeft', fill: line.color, fontSize: 12,
                }}
              />
            ))}
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
                  let opacity = 1;

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

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Stack>
  );
}
