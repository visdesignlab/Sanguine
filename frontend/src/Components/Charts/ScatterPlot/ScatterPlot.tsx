import styled from '@emotion/styled';
import {
  axisBottom, axisLeft, brush, deviation, mean, range, scaleBand, scaleLinear, select,
} from 'd3';
import { observer } from 'mobx-react';
import {
  useContext, useCallback, useEffect, useState,
} from 'react';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint, SingleCasePoint } from '../../../Interfaces/Types/DataTypes';
import {
  basicGray, highlightOrange, largeFontSize, OffsetDict, regularFontSize, thirdGray,
} from '../../../Presets/Constants';
import { AcronymDictionary, BloodComponent, HemoOption } from '../../../Presets/DataDict';
import CustomizedAxisBand from '../ChartAccessories/CustomizedAxisBand';

interface DotProps {
  isselected: boolean;
  isbrushed: boolean;
  isHovered: boolean;
}

const ScatterDot = styled('circle')<DotProps>`
  r: 4px;
  opacity: ${(props) => (props.isHovered || props.isselected ? 1 : 0.5)};
  stroke-width: 2px;
  fill: ${(props) => {
    const store = useContext(Store);
    const { hoverStore } = store;
    return props.isHovered
      ? hoverStore.hoverColor
      : props.isbrushed || props.isselected
        ? highlightOrange
        : basicGray;
  }};
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
  const { hoverStore } = store;
  const { currentBrushedPatientGroup, currentSelectSet } = store.provenanceState;
  const svgSelection = select(svg.current);
  const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null);
  const [isFirstRender, updateIsFirstRender] = useState(true);
  const [brushedCaseList, updatebrushedCaseList] = useState<number[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateBrush = (e: any) => {
    updateBrushLoc(e.selection);
  };

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
    .on('end', updateBrush);
  svgSelection.select('.brush-layer').call(brushDef as never);

  useEffect(() => {
    if (isFirstRender) {
      updateIsFirstRender(false);
    } else if (brushLoc) {
      const caseList: SingleCasePoint[] = [];
      data.forEach((dataPoint) => {
        const cx = xAxisVar === 'CELL_SAVER_ML' ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth());
        const cy = yAxisScale()(dataPoint.yVal);
        if (cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
          caseList.push(dataPoint.case);
        }
      });

      //     !!!!!!!this is the code of checking brushed patient

      if (caseList.length === 0) {
        updateBrushLoc(null);
        brushDef.move(svgSelection.select('.brush-layer'), null);
        if (store.provenanceState.currentBrushedPatientGroup.length > 0) {
          store.selectionStore.updateBrush([]);
        }
      } else {
        store.selectionStore.updateBrush(caseList);
      }
    } else if (store.provenanceState.currentBrushedPatientGroup.length > 0) {
      store.selectionStore.updateBrush([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brushLoc]);

  const clearBrush = () => {
    brushDef.move(svgSelection.select('.brush-layer'), null);
  };

  // Clear the brush
  useEffect(() => {
    clearBrush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const newbrushedCaseList = currentBrushedPatientGroup.map((d) => d.CASE_ID);
    stateUpdateWrapperUseJSON(brushedCaseList, newbrushedCaseList, updatebrushedCaseList);
    if (currentBrushedPatientGroup.length === 0) {
      clearBrush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrushedPatientGroup]);

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

  const decideIfSelectSet = (d: ScatterDataPoint) => currentSelectSet.length > 0 && !!currentSelectSet.find((selected) => selected.setValues.includes(`${d.case[selected.setName]}`));

  const generateScatterDots = () => {
    const selectedPatients: JSX.Element[] = [];
    const unselectedPatients: JSX.Element[] = [];
    const brushedSet = new Set(brushedCaseList);
    const medianSet: Record<string, number[]> = {};
    data.forEach((dataPoint, idx) => {
      const cx = xAxisVar === 'CELL_SAVER_ML' ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth());
      // Check if the data point is hovered
      const isHovered = hoverStore.hoveredCaseIds.includes(dataPoint.case.CASE_ID);
      if (medianSet[dataPoint.xVal]) {
        medianSet[dataPoint.xVal].push(dataPoint.yVal);
      } else {
        medianSet[dataPoint.xVal] = [dataPoint.yVal];
      }
      const cy = yAxisScale()(dataPoint.yVal);
      const isSelectSet = decideIfSelectSet(dataPoint);
      const isBrushed = brushedSet.has(dataPoint.case.CASE_ID);

      if (isBrushed || isSelectSet) {
        selectedPatients.push(
          <ScatterDot
            key={`dot-${idx}`}
            cx={cx}
            cy={cy}
            isselected={isSelectSet}
            isbrushed={isBrushed || false}
            isHovered={isHovered}
          />,
        );
      } else {
        unselectedPatients.push(
          <ScatterDot
            key={`dot-${idx}`}
            cx={cx}
            cy={cy}
            isselected={isSelectSet}
            isbrushed={isBrushed || false}
            isHovered={isHovered}
          />,

        );
      }
    });
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
    return unselectedPatients.concat(selectedPatients).concat(lineSet);
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

        {generateScatterDots()}
        <g className="brush-layer" />
      </g>
      <g className="axes">
        <g className="y-axis" />
        <g className="x-axis" transform={`translate(0 ,${height - currentOffset.bottom} )`}>
          {xAxisVar !== 'CELL_SAVER_ML' ? <CustomizedAxisBand scalePadding={scalePadding} scaleDomain={JSON.stringify(xAxisScale().domain())} scaleRange={JSON.stringify(xAxisScale().range())} /> : null}
        </g>
        <text className="x-label" />
        <text className="y-label" />
      </g>

    </>
  );
}

export default observer(ScatterPlot);
