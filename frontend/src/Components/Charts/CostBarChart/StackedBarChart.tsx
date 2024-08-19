import { scaleBand, scaleLinear } from 'd3';
import {
  useCallback, useState, useContext, RefObject,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { observer } from 'mobx-react';
import { CostBarChartDataPoint, ExtraPairPoint } from '../../../Interfaces/Types/DataTypes';
import { basicGray, BloodProductCap, OffsetDict } from '../../../Presets/Constants';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import HeatMapAxis from '../ChartAccessories/HeatMapAxisY';
import { ChartG } from '../../../Presets/StyledSVGComponents';
import SingleStackedBar from './SingleStackedBar';
import CaseCountHeader from '../ChartAccessories/CaseCountHeader';
import { sortHelper } from '../../../HelperFunctions/ChartSorting';
import Store from '../../../Interfaces/Store';
import ComparisonLegend from '../ChartAccessories/ComparisonLegend';
import GeneratorExtraPair from '../ChartAccessories/ExtraPairPlots/GeneratorExtraPair';
import { AcronymDictionary } from '../../../Presets/DataDict';

type Props = {
    xAggregationOption: keyof typeof BloodProductCap;
    data: CostBarChartDataPoint[];
    // secondary Data is the "true" data in interventions
    secondaryData?: CostBarChartDataPoint[];
    svg: RefObject<SVGSVGElement>;
    dimensionWidth: number;
    dimensionHeight: number;
    maximumCost: number;
    maxSavedNegative: number;
    costMode: boolean;
    showPotential: boolean;
    caseCount: number;
    secondaryCaseCount: number;
    outcomeComparison?: keyof typeof AcronymDictionary;
    secondaryExtraPairDataSet?: ExtraPairPoint[];
    extraPairDataSet: ExtraPairPoint[];
    extraPairTotalWidth: number;
};

function StackedBarChart({
  outcomeComparison, caseCount, secondaryCaseCount, xAggregationOption, secondaryData, svg, data, dimensionWidth, dimensionHeight, maximumCost, maxSavedNegative, costMode, showPotential, extraPairDataSet, extraPairTotalWidth, secondaryExtraPairDataSet,
}: Props) {
  const store = useContext(Store);
  const currentOffset = OffsetDict.regular;
  const [caseMax, setCaseMax] = useState(0);
  const [xVals, setXVals] = useState([]);

  useDeepCompareEffect(() => {
    const [tempxVals, newCaseMax] = sortHelper(data, xAggregationOption, store.provenanceState.showZero, secondaryData);
    stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
    setCaseMax(newCaseMax as number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, xAggregationOption, secondaryData]);

  const aggregationScale = useCallback(() => {
    const aggScale = scaleBand()
      .domain(xVals)
      .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
      .paddingInner(0.1);
    return aggScale;
  }, [dimensionHeight, xVals, currentOffset]);

  const valueScale = useCallback(() => {
    const valScale = scaleLinear()
      .domain([maxSavedNegative, maximumCost])
      .range([currentOffset.left + extraPairTotalWidth, dimensionWidth - currentOffset.right - currentOffset.margin]);
    return valScale;
  }, [dimensionWidth, maximumCost, maxSavedNegative, currentOffset, extraPairTotalWidth]);

  return (
    <>
      <HeatMapAxis
        svg={svg}
        currentOffset={currentOffset}
        xVals={xVals}
        dimensionHeight={dimensionHeight}
        extraPairTotalWidth={extraPairTotalWidth}
        xAggregationOption={xAggregationOption}
      />

      {outcomeComparison ? <ComparisonLegend dimensionWidth={dimensionWidth} firstTotal={caseCount} secondTotal={secondaryCaseCount} outcomeComparison={outcomeComparison} /> : null}
      <g className="chart-comp">
        {data.map((dp, idx) => (
          <g key={idx}>
            <SingleStackedBar
              dataPoint={dp}
              howToTransform={(`translate(0,${(aggregationScale()(dp.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)})`).toString()}
              valueScaleDomain={JSON.stringify(valueScale().domain())}
              valueScaleRange={JSON.stringify(valueScale().range())}
              bandwidth={secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()}
              costMode={costMode}
              showPotential={showPotential}
            />
            <ChartG extraPairTotalWidth={extraPairTotalWidth} currentOffset={currentOffset}>
              <CaseCountHeader
                height={(secondaryData ? 0.5 : 1) * aggregationScale().bandwidth()}
                zeroCaseNum={0}
                yPos={(aggregationScale()(dp.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)}
                caseMax={caseMax}
                showComparisonRect={!!secondaryData}
                isFalseComparison
                caseCount={dp.caseCount}
              />
            </ChartG>
          </g>
        ))}
        {secondaryData ? secondaryData.map((dp, idx) => (
          <g key={idx}>
            <SingleStackedBar
              dataPoint={dp}
              howToTransform={(`translate(0,${aggregationScale()(dp.aggregateAttribute) || 0})`).toString()}
              valueScaleDomain={JSON.stringify(valueScale().domain())}
              valueScaleRange={JSON.stringify(valueScale().range())}
              bandwidth={aggregationScale().bandwidth() * 0.5}
              costMode={costMode}
              showPotential={showPotential}
            />
            <ChartG extraPairTotalWidth={extraPairTotalWidth} currentOffset={currentOffset}>
              <CaseCountHeader
                showComparisonRect
                isFalseComparison={false}
                height={0.5 * aggregationScale().bandwidth()}
                zeroCaseNum={0}
                yPos={(aggregationScale()(dp.aggregateAttribute) || 0)}
                caseMax={caseMax}
                caseCount={dp.caseCount}
              />
            </ChartG>
          </g>
        )) : null}
        <g className="extraPairChart">
          <GeneratorExtraPair
            extraPairDataSet={extraPairDataSet}
            secondaryExtraPairDataSet={secondaryExtraPairDataSet || undefined}
            aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
            aggregationScaleRange={JSON.stringify(aggregationScale().range())}
          />
        </g>
        <line
          x1={valueScale()(0)}
          x2={valueScale()(0)}
          y1={dimensionHeight - currentOffset.bottom}
          y2={currentOffset.top}
          opacity={costMode ? 0.8 : 0}
          stroke={basicGray}
          strokeWidth={3}
          strokeDasharray="5,5"
        />
      </g>
    </>
  );
}

export default observer(StackedBarChart);
