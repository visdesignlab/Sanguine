import { observer } from 'mobx-react';
import {
  useContext, useMemo, useRef, useState, useCallback,
} from 'react';
import { range } from 'd3';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { sortHelper } from '../../../HelperFunctions/ChartSorting';
import Store from '../../../Interfaces/Store';
import { ExtraPairPoint, HeatMapDataPoint } from '../../../Interfaces/Types/DataTypes';
import {
  BloodProductCap, MIN_HEATMAP_BANDWIDTH, OffsetDict,
} from '../../../Presets/Constants';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { AggregationScaleGenerator, ValueScaleGenerator } from '../../../HelperFunctions/Scales';
import { ChartG, HeatMapDividerLine } from '../../../Presets/StyledSVGComponents';
import DualColorLegend from '../ChartAccessories/DualColorLegend';
import SingleColorLegend from '../ChartAccessories/SingleColorLegend';
import SingleHeatRow from './SingleHeatRow';
import CaseCountHeader from '../ChartAccessories/CaseCountHeader';
import GeneratorExtraPair from '../ChartAccessories/ExtraPairPlots/GeneratorExtraPair';
import ComparisonLegend from '../ChartAccessories/ComparisonLegend';
import HeatMapAxisX from '../ChartAccessories/HeatMapAxisX';
import HeatMapAxisY from '../ChartAccessories/HeatMapAxisY';
import { Aggregation, BloodComponent, Outcome } from '../../../Presets/DataDict';

const outputGradientLegend = (showZero: boolean, dimensionWidth: number) => {
  if (!showZero) {
    return <DualColorLegend dimensionWidth={dimensionWidth} />;
  }
  return <SingleColorLegend dimensionWidth={dimensionWidth} />;
};

type Props = {
    dimensionWidth: number;
    dimensionHeight: number;
    xAxisVar: BloodComponent;
    yAxisVar: Aggregation;
    chartId: string;
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    extraPairDataSet: ExtraPairPoint[];
    extraPairTotalWidth: number;
    interventionDate?: number;
    secondaryData?: HeatMapDataPoint[];
    secondaryExtraPairDataSet?: ExtraPairPoint[];
    firstTotal: number;
    secondTotal: number;
    outcomeComparison?: Outcome;
};

function HeatMap({
  outcomeComparison, interventionDate, secondaryExtraPairDataSet, dimensionHeight, secondaryData, dimensionWidth, yAxisVar, xAxisVar, chartId, data, svg, extraPairDataSet, extraPairTotalWidth, firstTotal, secondTotal,
}: Props) {
  const store = useContext(Store);
  const currentOffset = OffsetDict.regular;
  const [xVals, setXVals] = useState<[]>([]);
  const [caseMax, setCaseMax] = useState(0);

  useDeepCompareEffect(() => {
    const [tempxVals, newCaseMax] = sortHelper(data, yAxisVar, store.provenanceState.showZero, secondaryData);
    stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
    setCaseMax(newCaseMax as number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, store.provenanceState.showZero, yAxisVar, secondaryData]);

  const chartHeight = useMemo(() => Math.max(
    dimensionHeight,
    data.length * MIN_HEATMAP_BANDWIDTH(secondaryData) + OffsetDict.regular.top + OffsetDict.regular.bottom,
  ), [data.length, dimensionHeight, secondaryData]);

  const aggregationScale = useCallback(() => AggregationScaleGenerator(xVals, chartHeight, currentOffset), [xVals, currentOffset, chartHeight]);

  const valueScale = useCallback(() => {
    let outputRange;
    if (xAxisVar === 'CELL_SAVER_ML') {
      outputRange = [-1].concat(range(0, BloodProductCap[xAxisVar] + 100, 100));
    } else {
      outputRange = range(0, BloodProductCap[xAxisVar] + 1);
    }
    return ValueScaleGenerator(outputRange, currentOffset, dimensionWidth, extraPairTotalWidth);
  }, [dimensionWidth, extraPairTotalWidth, xAxisVar, currentOffset]);

  const innerSvg = useRef<SVGSVGElement | null>(null);

  return (
    <g>
      <foreignObject
        style={{
          width: '100%', height: `${dimensionHeight - currentOffset.bottom - currentOffset.top}px`, overflow: 'scroll', overflowY: 'scroll',
        }}
        transform={`translate(0,${currentOffset.top})`}
      >
        <svg style={{ height: `${chartHeight - currentOffset.top}px`, width: '100%' }} ref={innerSvg}>
          <HeatMapAxisY
            svg={innerSvg}
            currentOffset={currentOffset}
            xVals={xVals}
            dimensionHeight={chartHeight}
            extraPairTotalWidth={extraPairTotalWidth}
            yAxisVar={yAxisVar}
          />
          <g>
            {data.map((dataPoint, idx) => (
              <g key={idx}>
                <SingleHeatRow
                  bandwidth={secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()}
                  valueScaleDomain={JSON.stringify(valueScale().domain())}
                  valueScaleRange={JSON.stringify(valueScale().range())}
                  dataPoint={dataPoint}
                  howToTransform={`translate(0,${(aggregationScale()(dataPoint.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)})`}
                />
                <ChartG currentOffset={currentOffset} extraPairTotalWidth={extraPairTotalWidth}>
                  <CaseCountHeader
                    caseCount={dataPoint.caseCount}
                    yPos={(aggregationScale()(dataPoint.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)}
                    height={(secondaryData ? 0.5 : 1) * aggregationScale().bandwidth()}
                    zeroCaseNum={dataPoint.zeroCaseNum}
                    showComparisonRect={!!secondaryData}
                    isFalseComparison
                    caseMax={caseMax}
                  />
                </ChartG>
              </g>
            ))}
            {secondaryData ? secondaryData.map((dataPoint, idx) => (
              <g key={idx}>
                <SingleHeatRow
                  bandwidth={aggregationScale().bandwidth() * 0.5}
                  valueScaleDomain={JSON.stringify(valueScale().domain())}
                  valueScaleRange={JSON.stringify(valueScale().range())}
                  dataPoint={dataPoint}
                  howToTransform={`translate(0,${(aggregationScale()(dataPoint.aggregateAttribute) || 0)})`}
                />
                <ChartG currentOffset={currentOffset} extraPairTotalWidth={extraPairTotalWidth}>
                  <CaseCountHeader
                    showComparisonRect
                    isFalseComparison={false}
                    caseCount={dataPoint.caseCount}
                    yPos={aggregationScale()(dataPoint.aggregateAttribute) || 0}
                    height={0.5 * aggregationScale().bandwidth()}
                    zeroCaseNum={dataPoint.zeroCaseNum}
                    caseMax={caseMax}
                  />
                </ChartG>
              </g>
            )) : null}
          </g>
          <g className="extraPairChart">
            <GeneratorExtraPair
              extraPairDataSet={extraPairDataSet}
              secondaryExtraPairDataSet={secondaryExtraPairDataSet || undefined}
              aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
              aggregationScaleRange={JSON.stringify(aggregationScale().range())}
              height={chartHeight}
              text
              chartId={chartId}
            />

          </g>
        </svg>
      </foreignObject>

      {/* Render after chart to render on top */}
      <HeatMapAxisX
        svg={svg}
        currentOffset={currentOffset}
        isValueScaleBand
        dimensionHeight={dimensionHeight}
        dimensionWidth={dimensionWidth}
        extraPairTotalWidth={extraPairTotalWidth}
        xAxisVar={xAxisVar}
        valueScaleDomain={JSON.stringify(valueScale().domain())}
        valueScaleRange={JSON.stringify(valueScale().range())}
        yAxisVar={yAxisVar}
      />

      {/* Make the top elements render on top */}
      <rect fill="#FFFFFF" width={dimensionWidth} height={currentOffset.top} />
      <HeatMapDividerLine dimensionHeight={chartHeight} currentOffset={currentOffset} />

      <g className="legend" transform="translate(0,5)">
        {outputGradientLegend(store.provenanceState.showZero, dimensionWidth)}
      </g>

      {secondaryData ? (
        <ComparisonLegend
          dimensionWidth={dimensionWidth}
          interventionDate={interventionDate}
          firstTotal={firstTotal}
          secondTotal={secondTotal}
          outcomeComparison={outcomeComparison}
        />
      ) : null}
    </g>
  );
}

export default observer(HeatMap);
