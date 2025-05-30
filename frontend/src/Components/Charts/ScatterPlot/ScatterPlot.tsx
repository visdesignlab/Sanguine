import styled from '@emotion/styled';
import {
  axisBottom, axisLeft, brush, deviation, mean, range, scaleBand, scaleLinear, select,
} from 'd3';
import { observer } from 'mobx-react';
import {
  useContext, useCallback, useEffect, useState,
} from 'react';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint, SingleCasePoint } from '../../../Interfaces/Types/DataTypes';
import {
  basicGray, largeFontSize, OffsetDict, regularFontSize, thirdGray, smallHoverColor, smallSelectColor,
} from '../../../Presets/Constants';
import { AcronymDictionary, BloodComponent, HemoOption } from '../../../Presets/DataDict';
import CustomizedAxisBand from '../ChartAccessories/CustomizedAxisBand';

interface DotProps {
  selected: boolean;
  brushed: boolean;
  hovered: boolean;
  hoverColor: string;
  selectedColor: string;
}

// If selected: selectedColor; If only hovered: hoverColor; If none, lightGray
const ScatterDot = styled('circle')<DotProps>`
  r: 4px;
  opacity: ${(props) => (props.hovered || props.selected || props.brushed ? 1 : 0.5)};
  stroke-width: 2px;
  fill: ${(props) => (props.selected
    ? props.selectedColor
    : props.hovered
      ? props.hoverColor
      : basicGray)};
  `;

const StatisticalLine = styled('line')`
  stroke-width: 3px;
  stroke: #3498d5;
`;

type Props = {
  xAxisVar: BloodComponent;
  yAxisVar: HemoOption;
  width: number;
  height: number;
  data: ScatterDataPoint[];
  svg: React.RefObject<SVGSVGElement>;
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
};

function ScatterPlot({
  xAxisVar, xMax, xMin, yMax, yMin, yAxisVar, data, width, height, svg,
}: Props) {
  const scalePadding = 0.2;
  const currentOffset = OffsetDict.minimum;
  const store = useContext(Store);
  const { interactionStore } = store;
  const svgSelection = select(svg.current);
  const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null);
  const [isFirstRender, updateIsFirstRender] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xAxisScale = useCallback<any>(() => {
    let innerXAxisScale;
    if (xAxisVar === 'CELL_SAVER_ML') {
      innerXAxisScale = scaleLinear()
        .domain([0.9 * xMin, 1.1 * xMax])
        .range([currentOffset.left, width - currentOffset.right - currentOffset.margin]).nice();
    } else {
      innerXAxisScale = scaleBand()
        .domain(range(0, xMax + 1) as never)
        .range([currentOffset.left, width - currentOffset.right - currentOffset.margin])
        .padding(scalePadding);
    }
    return innerXAxisScale;
  }, [xMax, xMin, width, currentOffset, xAxisVar]);

  const yAxisScale = useCallback(() => scaleLinear()
    .domain([0.9 * yMin, 1.1 * yMax])
    .range([height - currentOffset.bottom, currentOffset.top])
    .nice(), [yMax, yMin, height, currentOffset]);

  const brushDef = brush()
    .extent([[xAxisScale().range()[0], yAxisScale().range()[1]], [xAxisScale().range()[1], yAxisScale().range()[0]]])
    .on('end', (e) => { updateBrushLoc(e.selection); });
  svgSelection.select('.brush-layer').call(brushDef as never);

  // helper function to determine the correct x position for a given data point
  const getCX = (dPoint: ScatterDataPoint) => {
    if (xAxisVar === 'CELL_SAVER_ML') {
      return (xAxisScale()(dPoint.xVal)) || 0;
    }
    return ((xAxisScale()(dPoint.xVal) || 0) + dPoint.randomFactor * xAxisScale().bandwidth());
  };

  // Update the brush and the selected cases in the store.
  useEffect(() => {
    if (isFirstRender) {
      updateIsFirstRender(false);
    } else if (brushLoc) {
      const caseList: SingleCasePoint[] = [];
      data.forEach((dataPoint) => {
        const cx = getCX(dataPoint);
        const cy = yAxisScale()(dataPoint.yVal);
        if (cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
          caseList.push(dataPoint.case);
        }
      });
      if (caseList.length === 0) {
        updateBrushLoc(null);
        if (store.provenanceState.currentSelectedPatientGroup.length > 0) {
          store.interactionStore.clearBrushSelectedCases();
        }
      } else {
        store.interactionStore.brushSelectedCaseIds = caseList.map((d) => d.CASE_ID);
      }
    } else if (store.interactionStore.selectedCaseIds.length > 0) {
      store.interactionStore.clearBrushSelectedCases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brushLoc]);

  const yAxisLabel = axisLeft(yAxisScale());
  const xAxisLabel = axisBottom(xAxisScale() as never);

  svgSelection
    .select('.axes')
    .select('.y-axis')
    .attr('transform', `translate(${currentOffset.left}, 0)`)
    .attr('display', null)
    .call(yAxisLabel as never)
    .selectAll('text')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize);

  svgSelection
    .select('.axes')
    .select('.y-label')
    .attr('display', null)
    .attr('x', -0.5 * height)
    .attr('y', currentOffset.margin - 10)
    .attr('transform', 'rotate(-90)')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'hanging')
    .text(
      AcronymDictionary[yAxisVar] ? AcronymDictionary[yAxisVar] : yAxisVar,
    );

  if (xAxisVar === 'CELL_SAVER_ML') {
    svgSelection.select('.axes')
      .select('.x-axis')
      .call(xAxisLabel as never)
      .selectAll('text')
      .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize);
  } else {
    svgSelection.select('.axes')
      .select('.x-axis')
      .selectAll('.tick')
      .remove();
    svgSelection.select('.axes')
      .select('.x-axis')
      .selectAll('.domain')
      .remove();
  }

  svgSelection
    .select('.axes')
    .select('.x-label')
    .attr('y', height - currentOffset.bottom + 20)
    .attr('x', 0.5 * width + currentOffset.margin)
    .attr('alignment-baseline', 'hanging')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .text(AcronymDictionary[xAxisVar] ? AcronymDictionary[xAxisVar] : xAxisVar);

  // Generate the statistical lines for all median sets
  const generateStatisticalLines = (medianSet: Record<string, number[]>) => {
    let lineSet: JSX.Element[] = [];
    if (xAxisVar !== 'CELL_SAVER_ML') {
      for (const [key, value] of Object.entries(medianSet)) {
        const meanVal = mean(value) || 0;
        const std = deviation(value) || 0;
        const lowerBound = meanVal - ((1.96 * std) / Math.sqrt((value).length));
        const upperBound = meanVal + ((1.96 * std) / Math.sqrt((value).length));
        lineSet = lineSet.concat(
          [<StatisticalLine
            key={key}
            x1={xAxisScale()(parseInt(key, 10))}
            y1={yAxisScale()(meanVal)}
            y2={yAxisScale()(meanVal)}
            x2={xAxisScale()(parseInt(key, 10)) + xAxisScale().bandwidth() || 0}
          />,
            <StatisticalLine
              key={`${key}lower`}
              x1={xAxisScale()(parseInt(key, 10)) + 0.5 * xAxisScale().bandwidth() || 0}
              y1={yAxisScale()(lowerBound)}
              y2={yAxisScale()(upperBound)}
              x2={xAxisScale()(parseInt(key, 10)) + 0.5 * xAxisScale().bandwidth() || 0}
            />,
          ],
        );
      }
    }
    return lineSet;
  };

  // Generates all data to be rendered within the plot
  // This includes all datapoints and each set's relevant statistics lines
  const generateScatterplot = () => {
    const scatterDots: JSX.Element[] = [];
    const medianSet: Record<string, number[]> = {};

    data.forEach((dataPoint, idx) => {
      // Get the exact value for CELL_SAVER_ML or a jittered xVal
      const cx = getCX(dataPoint);
      // Check if the data point is hovered
      const hovered = interactionStore.hoveredCaseIds.includes(dataPoint.case.CASE_ID);
      const selected = interactionStore.selectedCaseIds.includes(dataPoint.case.CASE_ID);
      if (medianSet[dataPoint.xVal]) {
        medianSet[dataPoint.xVal].push(dataPoint.yVal);
      } else {
        medianSet[dataPoint.xVal] = [dataPoint.yVal];
      }
      const cy = yAxisScale()(dataPoint.yVal);
      // Append the scatterdot JSX element
      scatterDots.push(
        <ScatterDot
          key={`dot-${idx}`}
          cx={cx}
          cy={cy}
          selected={selected}
          brushed={false}
          hovered={hovered && !selected}
          hoverColor={smallHoverColor}
          selectedColor={smallSelectColor}
          onClick={() => {
            // If selected, deselect this case.
            if (selected) {
              store.interactionStore.deselectCaseIds([dataPoint.case.CASE_ID]);
            } else {
              // If not selected, select this case.
              store.interactionStore.addSelectedCaseIds([dataPoint.case.CASE_ID]);
            }
          }}
          onMouseEnter={() => { interactionStore.hoveredCaseIds = [dataPoint.case.CASE_ID]; }}
          onMouseLeave={() => { interactionStore.hoveredCaseIds = []; }}
        />,
      );
    });

    // Generate statistical lines
    const lineSet = generateStatisticalLines(medianSet);

    // Statistical lines will be rendered on top of the scatter dots
    return scatterDots.concat(lineSet);
  };

  return (
    <>
      <g className="chart-comp">
        <text
          fontSize="13px"
          fill={thirdGray}
          x={width}
          textAnchor="end"
          alignmentBaseline="hanging"
          y={0}
          className="highlight-label"
        />
      </g>
      <g className="axes">
        <g className="y-axis" />
        <g className="x-axis" transform={`translate(0 ,${height - currentOffset.bottom} )`}>
          {xAxisVar !== 'CELL_SAVER_ML' ? <CustomizedAxisBand scalePadding={scalePadding} scaleDomain={JSON.stringify(xAxisScale().domain())} scaleRange={JSON.stringify(xAxisScale().range())} chartHeight={height - currentOffset.bottom - currentOffset.top} xAxisVar={xAxisVar} /> : null}
        </g>
        <text className="x-label" />
        <text className="y-label" />
      </g>
      <g className="brush-layer" />
      {generateScatterplot()}
    </>
  );
}

export default observer(ScatterPlot);
