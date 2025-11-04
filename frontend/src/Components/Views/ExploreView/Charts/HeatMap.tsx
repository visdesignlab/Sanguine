import {
  Flex, Title, ActionIcon, CloseButton,
} from '@mantine/core';
import { IconGripVertical, IconSortDescending } from '@tabler/icons-react';
import {
  useContext, useRef, useEffect, useState,
} from 'react';
import * as d3 from 'd3';
import { Store } from '../../../../Store/Store';
import { CostChartConfig } from '../../../../Types/application';

// x ticks: 0 through 20 (RBC units)
// y ticks: list of surgeon names
export const surgeons = [
  'Dr. Adams',
  'Dr. Baker',
  'Dr. Carter',
  'Dr. Davis',
  'Dr. Evans',
  'Dr. Flores',
  'Dr. Garcia',
  'Dr. Harris',
  'Dr. Irving',
  'Dr. Jones',
];

export const xTicks = Array.from({ length: 21 }, (_, i) => i); // 0..20

// Generate deterministic sample values so the heatmap shows peaks per surgeon.
// Each tuple: [xIndex, yIndex, value]
export const heatmapData = surgeons.flatMap((_, yIdx) => (
  xTicks.map((x) => {
    // create a shifted peak per surgeon for visualization (values 0..10)
    const peak = (yIdx * 3) % xTicks.length;
    const value = Math.max(0, 10 - Math.abs(x - peak));
    return [x, yIdx, value];
  })
));

export default function HeatMap({ chartConfig }: { chartConfig: CostChartConfig }) {
  const store = useContext(Store);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Margins and defaults (kept consistent for measurement + drawing)
  const margin = {
    top: 20, right: 20, bottom: 40, left: 120,
  };
  const defaultWidth = chartConfig?.width ?? 700;
  const defaultHeightPerRow = 28;

  // State driven size (content area, already subtracting margins)
  const [contentWidth, setContentWidth] = useState<number>(
    (containerRef.current?.clientWidth ?? defaultWidth) - margin.left - margin.right,
  );
  const [contentHeight, setContentHeight] = useState<number>(
    (chartConfig?.height ?? (surgeons.length * defaultHeightPerRow)) - margin.top - margin.bottom,
  );

  // ResizeObserver to update sizes when container changes
  useEffect(() => {
    const innerEl = containerRef.current;
    const defaultH = (chartConfig?.height ?? (surgeons.length * defaultHeightPerRow)) - margin.top - margin.bottom;

    if (!innerEl) {
      // ensure initial values if ref not present yet
      setContentWidth(defaultWidth - margin.left - margin.right);
      setContentHeight(defaultH);
      return undefined;
    }

    // Prefer observing the parent grid/card element (react-grid-layout resizes that)
    const observedEl: HTMLElement = (innerEl.parentElement ?? innerEl) as HTMLElement;

    const updateSize = () => {
      // use getBoundingClientRect for reliable measured width
      const rect = observedEl.getBoundingClientRect();
      const w = (rect.width || defaultWidth) - margin.left - margin.right;
      const h = (chartConfig?.height ?? (surgeons.length * defaultHeightPerRow)) - margin.top - margin.bottom;
      setContentWidth(Math.max(0, Math.floor(w)));
      setContentHeight(Math.max(0, Math.floor(h)));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(observedEl);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
    // chartConfig.height included so changes to desired height update observer measurements
  }, [chartConfig?.height]);

  useEffect(() => {
    // Only draw when we have a positive size
    if (contentWidth <= 0 || contentHeight <= 0) return;

    const data: Array<[number, number, number]> = heatmapData as any;
    const width = contentWidth;
    const height = contentHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // scales
    const xScale = d3.scaleBand<number>()
      .domain(xTicks)
      .range([0, width])
      .paddingInner(0.05)
      .paddingOuter(0);

    const yScale = d3.scaleBand<string>()
      .domain(surgeons)
      .range([0, height])
      .paddingInner(0.05)
      .paddingOuter(0);

    const color = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 10]); // value range known 0..10

    // draw cells
    g.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (d) => xScale(d[0]) ?? 0)
      .attr('y', (d) => {
        const yName = surgeons[d[1]];
        return yScale(yName) ?? 0;
      })
      .attr('width', () => xScale.bandwidth())
      .attr('height', () => yScale.bandwidth())
      .attr('fill', (d) => color(d[2]) as string)
      .attr('stroke', '#fff')
      .append('title')
      .text((d) => `RBCs: ${d[0]}, Surgeon: ${surgeons[d[1]]}, Value: ${d[2]}`);

    // x axis
    const xAxis = d3.axisBottom(xScale).tickValues(xTicks).tickFormat(d3.format('d'));
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis)
      .call((gSel) => gSel.selectAll('text').attr('font-size', 11));

    // y axis
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .call(yAxis)
      .call((gSel) => gSel.selectAll('text').attr('font-size', 12));

    // axis labels
    svg.append('text')
      .attr('x', margin.left + width / 2)
      .attr('y', margin.top + height + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text('Intraoperative RBC Units Transfused');

    svg.append('text')
      .attr('transform', `translate(16, ${margin.top + height / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text('Surgeon');

    // cleanup handled by clearing svg at start of effect
  }, [contentWidth, contentHeight, chartConfig]);

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            RBC Units Transfused Per Surgeon
          </Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm">
          <ActionIcon
            variant="subtle"
            onClick={() => {
              // toggle sort placeholder
            }}
            title="Toggle sort by total cost"
          >
            <IconSortDescending size={18} />
          </ActionIcon>
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/* Heatmap chart */}
      <div ref={containerRef} style={{ width: '100%', overflow: 'auto', marginTop: 8 }}>
        <svg ref={svgRef} />
      </div>
    </>
  );
}
