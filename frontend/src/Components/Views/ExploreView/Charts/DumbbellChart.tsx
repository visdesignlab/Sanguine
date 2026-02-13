import {
  useMemo, useState, useContext, memo, useCallback,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  ScrollArea, Box, CloseButton, Title, Flex, useMantineTheme,
  Tooltip, MantineTheme,
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { Store } from '../../../../Store/Store';
import { DumbbellCase, DumbbellChartConfig, DumbbellData } from '../../../../Types/application';

// Constants
const MARGIN = {
  top: 40, right: 30, bottom: 60, left: 60,
};
const CHAR_WIDTH_CASE = 8; // Further reduced width per case
const DOT_RADIUS = 4.5; // Slightly larger dot radius

function getNextSortState(current: 'none' | 'pre' | 'post' | undefined): 'none' | 'pre' | 'post' {
  if (!current || current === 'none') return 'pre';
  if (current === 'pre') return 'post';
  return 'none';
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
  providerSorts: Map<string, 'none' | 'pre' | 'post'>;
  visitSorts: Map<string, 'none' | 'pre' | 'post'>;
  hoveredCollapse: string | null;
  theme: MantineTheme;
  onToggleProviderSort: (id: string) => void;
  onToggleVisitSort: (id: string) => void;
  onToggleProviderCollapse: (e: React.MouseEvent, id: string) => void;
  onToggleVisitCollapse: (e: React.MouseEvent, id: string) => void;
  setHoveredCollapse: (id: string | null) => void;
}

const DumbbellChartSVG = memo(({
  totalWidth,
  height,
  yScale,
  processedData,
  collapsedProviders,
  collapsedVisits,
  providerSorts,
  visitSorts,
  hoveredCollapse,
  theme,
  onToggleProviderSort,
  onToggleVisitSort,
  onToggleProviderCollapse,
  onToggleVisitCollapse,
  setHoveredCollapse,
}: DumbbellChartSVGProps) => {
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  let currentX = MARGIN.left;

  return (
    <div style={{ width: totalWidth, height, position: 'relative' }}>
      <svg width={totalWidth} height={height}>
        {/* Y Axis Grid */}
        {yScale.ticks(5).map((tick) => (
          <g key={tick} transform={`translate(${MARGIN.left}, ${yScale(tick) + MARGIN.top})`}>
            <line x1={0} x2={totalWidth - MARGIN.left - MARGIN.right} y1={0} y2={0} stroke={theme.colors.gray[3]} strokeDasharray="4 4" />
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
          Hemoglobin Value (g/dL)
        </text>

        {/* Buckets and Dumbbells */}
        <g transform={`translate(0, ${MARGIN.top})`}>
          {processedData.map((provider, providerIdx) => {
            const isProvCollapsed = collapsedProviders.has(provider.id);
            // Calculate provider width based on its children (cases/visits) status
            let providerWidth = 0;
            if (isProvCollapsed) {
              providerWidth = 50;
            } else {
              provider.visits.forEach((v) => {
                if (collapsedVisits.has(v.id)) providerWidth += 40;
                else providerWidth += v.cases.length * CHAR_WIDTH_CASE;
              });
            }

            const providerX = currentX;
            currentX += providerWidth;

            // Provider Bucket Color: Alternating Darker Greys
            const providerColor = providerIdx % 2 === 0 ? theme.colors.gray[3] : theme.colors.gray[1];
            const providerSort = providerSorts.get(provider.id) || 'none';

            return (
              <g key={provider.id}>
                {/* Provider Bucket Body (Sort Trigger) */}
                <rect
                  x={providerX}
                  y={innerHeight + 25}
                  width={providerWidth}
                  height={25}
                  fill={isProvCollapsed ? theme.colors.gray[4] : providerColor}
                  stroke={theme.colors.gray[5]}
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onToggleProviderSort(provider.id)}
                />

                {/* Provider Label & Sort Indicator */}
                {!isProvCollapsed ? (
                  <text
                    x={providerX + providerWidth / 2}
                    y={innerHeight + 42}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={theme.colors.gray[9]}
                    style={{ pointerEvents: 'none' }}
                  >
                    {provider.id}
                    {' '}
                    {providerSort === 'pre' ? '↓' : providerSort === 'post' ? '↑' : ''}
                  </text>
                ) : (
                  <text
                    x={providerX + providerWidth / 2}
                    y={innerHeight + 42}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={theme.colors.gray[6]}
                    style={{ pointerEvents: 'none' }}
                  >
                    ...
                  </text>
                )}

                {/* Collapse Trigger (Right Edge) */}
                <rect
                  x={providerX + providerWidth - 15}
                  y={innerHeight + 25}
                  width={15}
                  height={25}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredCollapse(provider.id)}
                  onMouseLeave={() => setHoveredCollapse(null)}
                  onClick={(e) => onToggleProviderCollapse(e, provider.id)}
                />
                {/* Collapse Arrow (Only visible on hover) */}
                {hoveredCollapse === provider.id && (
                  <path
                    d={isProvCollapsed ? 'M 2 5 L 8 12 L 2 19' : 'M 8 5 L 2 12 L 8 19'} // Simple chevron path
                    transform={`translate(${providerX + providerWidth - 12}, ${innerHeight + 28}) scale(0.6)`}
                    fill="none"
                    stroke={theme.colors.gray[8]}
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Internal Visits */}
                {!isProvCollapsed && (
                  <g>
                    {(() => {
                      let visitX = providerX;
                      return provider.visits.map((visit, visitIdx) => {
                        const isVisitCollapsed = collapsedVisits.has(visit.id);
                        const visitWidth = isVisitCollapsed ? 40 : visit.cases.length * CHAR_WIDTH_CASE;
                        const currentVisitX = visitX;
                        visitX += visitWidth;

                        // Visit Bucket Color: Alternating LIGHTER Greys
                        const visitColor = visitIdx % 2 === 0 ? theme.colors.gray[2] : theme.colors.gray[0];


                        // Background Shade for Visit Area (Super light)
                        const bgShade = visitIdx % 2 === 0 ? theme.colors.gray[1] : 'transparent';
                        const visitSort = visitSorts.get(visit.id) || 'none';

                        return (
                          <g key={visit.id}>
                            {/* Background Shade Rectangle */}
                            <rect
                              x={currentVisitX}
                              y={0}
                              width={visitWidth}
                              height={innerHeight}
                              fill={bgShade}
                              opacity={0.3}
                              style={{ pointerEvents: 'none' }}
                            />

                            {/* Visit Bucket Body (Sort Trigger) */}
                            <rect
                              x={currentVisitX}
                              y={innerHeight}
                              width={visitWidth}
                              height={25}
                              fill={isVisitCollapsed ? theme.colors.gray[4] : visitColor}
                              stroke={theme.colors.gray[4]}
                              strokeWidth={1}
                              style={{ cursor: 'pointer' }}
                              onClick={() => onToggleVisitSort(visit.id)}
                            />
                            <text
                              x={currentVisitX + visitWidth / 2}
                              y={innerHeight + 17}
                              textAnchor="middle"
                              fontSize={11}
                              fill={theme.colors.gray[8]}
                              style={{ pointerEvents: 'none' }}
                            >
                              {isVisitCollapsed ? '...' : visit.label}
                              {' '}
                              {visitSort === 'pre' ? '↓' : visitSort === 'post' ? '↑' : ''}
                            </text>

                            {/* Collapse Trigger (Right Edge) */}
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
                                transform={`translate(${currentVisitX + visitWidth - 10}, ${innerHeight + 2}) scale(0.6)`}
                                fill="none"
                                stroke={theme.colors.gray[8]}
                                strokeWidth={2}
                                style={{ pointerEvents: 'none' }}
                              />
                            )}

                            {/* Cases (Dumbbells) */}
                            {!isVisitCollapsed && visit.cases.map((d, i) => {
                              const caseX = currentVisitX + i * CHAR_WIDTH_CASE + CHAR_WIDTH_CASE / 2;
                              return (
                                <g key={d.id}>
                                  {/* Connector Line */}
                                  <line
                                    x1={caseX}
                                    x2={caseX}
                                    y1={yScale(d.preHgb)}
                                    y2={yScale(d.postHgb)}
                                    stroke={theme.colors.gray[6]}
                                    strokeWidth={1.5}
                                    shapeRendering="crispEdges"
                                  />
                                  {/* Pre Dot (Green) */}
                                  <Tooltip label={`Pre: ${d.preHgb.toFixed(1)}`}>
                                    <circle
                                      cx={caseX}
                                      cy={yScale(d.preHgb)}
                                      r={DOT_RADIUS}
                                      fill={theme.colors.teal[6]}
                                      stroke="white"
                                      strokeWidth={1}
                                    />
                                  </Tooltip>
                                  {/* Post Dot (Blue) */}
                                  <Tooltip label={`Post: ${d.postHgb.toFixed(1)}`}>
                                    <circle
                                      cx={caseX}
                                      cy={yScale(d.postHgb)}
                                      r={DOT_RADIUS}
                                      fill={theme.colors.indigo[6]}
                                      stroke="white"
                                      strokeWidth={1}
                                    />
                                  </Tooltip>
                                </g>
                              );
                            })}
                          </g>
                        );
                      });
                    })()}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
});

DumbbellChartSVG.displayName = 'DumbbellChartSVG';

export function DumbbellChart({ chartConfig }: { chartConfig: DumbbellChartConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  // State
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const [collapsedVisits, setCollapsedVisits] = useState<Set<string>>(new Set());
  const [providerSorts, setProviderSorts] = useState<Map<string, 'none' | 'pre' | 'post'>>(new Map());
  const [visitSorts, setVisitSorts] = useState<Map<string, 'none' | 'pre' | 'post'>>(new Map());

  // Hover state for collapse arrows
  const [hoveredCollapse, setHoveredCollapse] = useState<string | null>(null);

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

  const toggleProviderSort = useCallback((providerId: string) => {
    setProviderSorts((prev) => {
      const next = new Map(prev);
      next.set(providerId, getNextSortState(next.get(providerId)));
      return next;
    });
  }, []);

  const toggleVisitSort = useCallback((uniqueVisitId: string) => {
    setVisitSorts((prev) => {
      const next = new Map(prev);
      next.set(uniqueVisitId, getNextSortState(next.get(uniqueVisitId)));
      return next;
    });
  }, []);

  // Get and Process Data
  const processedData = useMemo(() => {
    const dataKeyString = `none_${chartConfig.yAxisVar}_${chartConfig.xAxisVar}`;
    const rawData = (store.exploreChartData[dataKeyString] as DumbbellData) || [];

    const groupedByProvider = new Map<string, DumbbellCase[]>();
    rawData.forEach((d) => {
      if (!groupedByProvider.has(d.providerId)) groupedByProvider.set(d.providerId, []);
      groupedByProvider.get(d.providerId)?.push(d);
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

    groupedByProvider.forEach((cases, providerId) => {
      const providerSort = providerSorts.get(providerId) || 'none';

      if (providerSort === 'none') {
        // Default: Group by Visit, Sort cases chronologically
        const groupedByVisit = new Map<string, DumbbellCase[]>();
        cases.forEach((d) => {
          if (!groupedByVisit.has(d.visitId)) groupedByVisit.set(d.visitId, []);
          groupedByVisit.get(d.visitId)?.push(d);
        });

        const visits = Array.from(groupedByVisit.entries()).map(([visitLabel, visitCases]) => {
          const minPre = Math.min(...visitCases.map((c) => c.preHgb));
          const minPost = Math.min(...visitCases.map((c) => c.postHgb));

          // Sort Cases within Visit
          // Default: Chronological by surgery_start_dtm
          // Overridden by visitSorts
          const visitSort = visitSorts.get(`${providerId}-${visitLabel}`) || 'none';
          const sortedCases = [...visitCases];

          if (visitSort === 'pre') {
            sortedCases.sort((a, b) => a.preHgb - b.preHgb);
          } else if (visitSort === 'post') {
            sortedCases.sort((a, b) => a.postHgb - b.postHgb);
          } else {
            // Default chronological
            sortedCases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);
          }

          return {
            id: `${providerId}-${visitLabel}`,
            label: visitLabel,
            cases: sortedCases,
            minPre,
            minPost,
          };
        });

        // Sort visits chronologically based on their first case
        visits.sort((a, b) => {
          const timeA = a.cases[0]?.surgery_start_dtm || 0;
          const timeB = b.cases[0]?.surgery_start_dtm || 0;
          return timeA - timeB;
        });

        hierarchy.push({
          id: providerId,
          cases,
          visits,
        });
      } else {
        // Sorted by Pre/Post Hgb: Flatten all cases into one "Visit"
        const sortedCases = [...cases];
        if (providerSort === 'pre') {
          sortedCases.sort((a, b) => a.preHgb - b.preHgb);
        } else if (providerSort === 'post') {
          sortedCases.sort((a, b) => a.postHgb - b.postHgb);
        }

        const minPre = Math.min(...sortedCases.map((c) => c.preHgb));
        const minPost = Math.min(...sortedCases.map((c) => c.postHgb));

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
  }, [store.exploreChartData, chartConfig.yAxisVar, chartConfig.xAxisVar, providerSorts, visitSorts]);

  // Flat list of visible cases for plotting
  const visibleItems = useMemo(() => {
    const items: { type: 'case' | 'visit_gap' | 'provider_gap', data?: DumbbellCase, width: number }[] = [];

    processedData.forEach((provider) => {
      if (collapsedProviders.has(provider.id)) {
        items.push({ type: 'provider_gap', width: 50 });
      } else {
        provider.visits.forEach((visit) => {
          if (collapsedVisits.has(visit.id)) {
            items.push({ type: 'visit_gap', width: 40 });
          } else {
            visit.cases.forEach((c) => {
              items.push({ type: 'case', data: c, width: CHAR_WIDTH_CASE });
            });
          }
        });
      }
    });
    return items;
  }, [processedData, collapsedProviders, collapsedVisits]);

  // Calculate total width
  const totalWidth = visibleItems.reduce((acc, item) => acc + item.width, 0) + MARGIN.left + MARGIN.right;

  // Responsive Height
  const { ref, height: measuredHeight } = useElementSize();
  const height = measuredHeight || 400; // Fallback
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  // Scales
  const yMin = 0; // Hgb usually 0-20
  const yMax = 18;

  const yScale = useMemo(() => scaleLinear()
    .domain([yMin, yMax])
    .range([innerHeight, 0]), [innerHeight]);
  return (
    <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>
      {/* Header */}
      <Flex direction="row" justify="space-between" align="center" pl="md" pr="md" pt="xs">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>Pre and Post Hemoglobin Values by Provider and Visit</Title>
        </Flex>
        <CloseButton onClick={() => { store.removeExploreChart(chartConfig.chartId); }} />
      </Flex>

      {/* Chart Area */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }} ref={ref}>
        <ScrollArea h={height}>
          <DumbbellChartSVG
            totalWidth={totalWidth}
            height={height}
            yScale={yScale}
            processedData={processedData}
            collapsedProviders={collapsedProviders}
            collapsedVisits={collapsedVisits}
            providerSorts={providerSorts}
            visitSorts={visitSorts}
            hoveredCollapse={hoveredCollapse}
            theme={theme}
            onToggleProviderSort={toggleProviderSort}
            onToggleVisitSort={toggleVisitSort}
            onToggleProviderCollapse={toggleProviderCollapse}
            onToggleVisitCollapse={toggleVisitCollapse}
            setHoveredCollapse={setHoveredCollapse}
          />
        </ScrollArea>
      </div>
    </Box>
  );
}
