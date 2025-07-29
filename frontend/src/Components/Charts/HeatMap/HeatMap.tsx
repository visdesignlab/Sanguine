import { observer } from 'mobx-react';
import {
  useContext, useMemo, useRef, useState, useCallback,
} from 'react';
import { range } from 'd3';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { sortHelper } from '../../../HelperFunctions/ChartSorting';
import Store from '../../../Interfaces/Store';
import { AttributePlotData, HeatMapDataPoint } from '../../../Interfaces/Types/DataTypes';
import {
  BloodProductCap, MIN_HEATMAP_BANDWIDTH, OffsetDict, backgroundSelectedColor, backgroundHoverColor,
} from '../../../Presets/Constants';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { AggregationScaleGenerator, ValueScaleGenerator } from '../../../HelperFunctions/Scales';
import { ChartG, HeatMapDividerLine } from '../../../Presets/StyledSVGComponents';
import DualColorLegend from '../ChartAccessories/DualColorLegend';
import SingleColorLegend from '../ChartAccessories/SingleColorLegend';
import SingleHeatRow from './SingleHeatRow';
import CaseCountHeader from '../ChartAccessories/CaseCountHeader';
import GeneratorAttributePlot, { AttributePlotLabels } from '../ChartAccessories/AttributePlots/GeneratorAttributePlot';
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
  attributePlotData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[];
  attributePlotTotalWidth: number;
  interventionDate?: number;
  secondaryData?: HeatMapDataPoint[];
  secondaryAttributePlotData?: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[];
  firstTotal: number;
  secondTotal: number;
  outcomeComparison?: Outcome;
};

function HeatMap({
  outcomeComparison, interventionDate, secondaryAttributePlotData, dimensionHeight, secondaryData, dimensionWidth, yAxisVar, xAxisVar, chartId, data, svg, attributePlotData, attributePlotTotalWidth, firstTotal, secondTotal,
}: Props) {
  const store = useContext(Store);
  const { interactionStore } = store;
  const currentOffset = OffsetDict.regular;
  const [xVals, setXVals] = useState<[]>([]);
  const [caseMax, setCaseMax] = useState(0);
  const [sortAttribute, setSortAttribute] = useState<string | null>(null);
  const [sortDescending, setSortDescending] = useState(true);

  useDeepCompareEffect(() => {
    const [tempxVals, newCaseMax] = sortHelper(data, yAxisVar, store.provenanceState.showZero, secondaryData);
    stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
    setCaseMax(newCaseMax as number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, store.provenanceState.showZero, yAxisVar, secondaryData]);

  const sortedData = useMemo(() => {
    // If not sorting by attribute, return original data
    if (!sortAttribute) return data;

    // Find the plot data for the attribute
    const plot = attributePlotData.find((p) => p.attributeName === sortAttribute);
    if (!plot) return data;

    // A map of values of the attribute to sort by
    const sortAttributeMap = plot.attributeData;
    const medianSet = plot.type === 'Violin' ? plot.medianSet : undefined;

    // Helper to get the value for sorting
    function getSortValue(val: any, rowKey?: string): number {
      if (plot?.type === 'Violin' && medianSet && rowKey && medianSet[rowKey] !== undefined) {
        return medianSet[rowKey];
      }
      // If it's an object with attributeCaseCount and rowCaseCount, use the percentage
      if (
        val
        && typeof val === 'object'
        && typeof val.attributeCaseCount === 'number'
        && typeof val.rowCaseCount === 'number'
        && val.rowCaseCount > 0
      ) {
        return val.attributeCaseCount / val.rowCaseCount;
      }
      // If it's a number, use it directly
      if (typeof val === 'number') return val;
      // If it's an object with a value property, use that
      if (val && typeof val === 'object') {
        if ('value' in val && typeof val.value === 'number') return val.value;
        if ('median' in val && typeof val.median === 'number') return val.median;
        const numVal = Object.values(val).find((v) => typeof v === 'number');
        if (typeof numVal === 'number') return numVal;
      }
      // Fallback to 0
      return 0;
    }

    // Sort 'data' based on the sortAttribute, and return.
    const attributeSortedData = [...data].sort((a, b) => {
      const aVal = getSortValue(sortAttributeMap[a.aggregateAttribute], a.aggregateAttribute);
      const bVal = getSortValue(sortAttributeMap[b.aggregateAttribute], b.aggregateAttribute);
      return sortDescending ? bVal - aVal : aVal - bVal;
    });
    return attributeSortedData;
  }, [data, sortAttribute, sortDescending, attributePlotData]);

  // Use sortedData to generate xVals for the aggregation scale
  const sortedXVals = useMemo(
    () => sortedData.map((d) => d.aggregateAttribute),
    [sortedData],
  );

  const chartHeight = useMemo(() => Math.max(
    dimensionHeight,
    data.length * MIN_HEATMAP_BANDWIDTH(secondaryData) + OffsetDict.regular.top + OffsetDict.regular.bottom,
  ), [data.length, dimensionHeight, secondaryData]);

  const aggregationScale = useCallback(
    () => AggregationScaleGenerator(sortedXVals, chartHeight, currentOffset),
    [sortedXVals, chartHeight, currentOffset],
  );

  const valueScale = useCallback(() => {
    let outputRange;
    if (xAxisVar === 'CELL_SAVER_ML') {
      outputRange = [-1].concat(range(0, BloodProductCap[xAxisVar] + 100, 100));
    } else {
      outputRange = range(0, BloodProductCap[xAxisVar] + 1);
    }
    return ValueScaleGenerator(outputRange, currentOffset, dimensionWidth, attributePlotTotalWidth);
  }, [dimensionWidth, attributePlotTotalWidth, xAxisVar, currentOffset]);

  const innerSvg = useRef<SVGSVGElement | null>(null);
  const svgHeight = chartHeight - currentOffset.top;

  // Checks if current row is hovered based on the attribute value.
  function rowHovered(attribute: string, value: string) {
    return interactionStore.hoveredAttribute?.[0] === attribute && interactionStore.hoveredAttribute?.[1] === value;
  }
  // Checks if current row is selected based on any of the selected attributes.
  function rowSelected(attribute: string, value: string) {
    return interactionStore.selectedAttributes
      ?.some(([attrName, attrValue]) => attrName === attribute && attrValue === value)
      ?? false;
  }

  // Sets the selected attribute in the store.
  function handleRowClick(attribute: string, value: string) {
    // If the row is already selected, deselect the row.
    if (rowSelected(attribute, value)) {
      interactionStore.deselectAttribute([attribute, value]);
    } else {
      interactionStore.addSelectedAttribute([attribute, value]);
    }
  }

  // Sets the hovered attribute in the store.
  function handleHover(attribute: string, value: string) {
    interactionStore.hoveredAttribute = [attribute, value];
  }

  // Removes the hovered attribute from the store.
  function handleHoverLeave() {
    interactionStore.hoveredAttribute = undefined;
  }

  const handleSortClick = useCallback((attributeName: string) => {
    console.log(`Sorting by ${attributeName} in ${sortDescending ? 'descending' : 'ascending'} order`);
    setSortAttribute((prevAttr) => {
      // If we've previously sorted by this attribute, toggle the sort direction.
      if (prevAttr === attributeName) {
        console.log(`Toggling sort direction for ${attributeName}`);
        setSortDescending((prevDesc) => !prevDesc);
        return prevAttr;
      }
      setSortDescending(true); // default to descending on new attribute
      return attributeName;
    });
  }, []);

  // Calculates the height of each row based on whether secondary data is present.
  const rowHeight = useMemo(() => (secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()), [secondaryData, aggregationScale]);

  return (
    <g>
      <foreignObject
        style={{
          width: dimensionWidth, height: `${dimensionHeight - currentOffset.bottom - currentOffset.top}px`, overflow: 'scroll', overflowY: 'scroll',
        }}
        transform={`translate(0,${currentOffset.top})`}
      >
        <svg style={{ height: `${svgHeight}px`, width: '100%' }} ref={innerSvg}>
          <g>
            {sortedData.map((dataPoint, idx) => {
              // Calculate vertical placement and height for each primary row
              const rowY = (aggregationScale()(dataPoint.aggregateAttribute) || 0)
                + (secondaryData ? aggregationScale().bandwidth() * 0.5 : 0);

              // For this row, is the row selected or hovered?
              const isSelected = rowSelected(yAxisVar, dataPoint.aggregateAttribute);
              const isHovered = rowHovered(yAxisVar, dataPoint.aggregateAttribute);
              return (
                /** On hover of a row, hover store is updated. */
                <g key={idx} transform={`translate(0, ${rowY})`} onMouseEnter={() => { handleHover(yAxisVar, dataPoint.aggregateAttribute); }} onMouseLeave={() => { handleHoverLeave(); }} onClick={() => { handleRowClick(yAxisVar, dataPoint.aggregateAttribute); }}>
                  {/** Invisible row hover rectangle with padding for event capture */}
                  <rect
                    x={0}
                    y={0}
                    width={dimensionWidth}
                    height={rowHeight + 2}
                    fill="transparent"
                  />
                  {/** Background row hover highlight rectangle for display */}
                  <rect
                    x={0}
                    y={0}
                    width={dimensionWidth}
                    height={rowHeight}
                    fill={isSelected ? backgroundSelectedColor : isHovered ? backgroundHoverColor : 'transparent'}
                  />
                  <SingleHeatRow
                    bandwidth={rowHeight}
                    valueScaleDomain={JSON.stringify(valueScale().domain())}
                    valueScaleRange={JSON.stringify(valueScale().range())}
                    dataPoint={dataPoint}
                    // Now rendered at y=0 within this transformed group
                    howToTransform="translate(0,0)"
                  />
                  <ChartG currentOffset={currentOffset} attributePlotTotalWidth={attributePlotTotalWidth}>
                    <CaseCountHeader
                      caseCount={dataPoint.caseCount}
                      yPos={0}
                      height={rowHeight}
                      zeroCaseNum={dataPoint.zeroCaseNum}
                      showComparisonRect={!!secondaryData}
                      isFalseComparison
                      caseMax={caseMax}
                    />
                  </ChartG>
                </g>
              );
            })}
            {secondaryData ? secondaryData.map((dataPoint, idx) => {
              // Calculate vertical placement and height for each primary row
              const rowY = (aggregationScale()(dataPoint.aggregateAttribute) || 0)
                + (aggregationScale().bandwidth() * 0.5);

              // For this secondary row, is the row selected or hovered?
              const isSelected = rowSelected(yAxisVar, dataPoint.aggregateAttribute);
              const isHovered = rowHovered(yAxisVar, dataPoint.aggregateAttribute);
              return (
                <g key={idx} onMouseEnter={() => { handleHover(yAxisVar, dataPoint.aggregateAttribute); }} onMouseLeave={() => { handleHoverLeave(); }} onClick={() => { handleRowClick(yAxisVar, dataPoint.aggregateAttribute); }}>

                  {/** Background row hover highlight rectangle for display */}
                  <rect
                    x={0}
                    y={rowY - rowHeight}
                    width={dimensionWidth}
                    height={rowHeight}
                    fill={isSelected ? backgroundSelectedColor : isHovered ? backgroundHoverColor : 'transparent'}
                  />
                  <SingleHeatRow
                    bandwidth={aggregationScale().bandwidth() * 0.5}
                    valueScaleDomain={JSON.stringify(valueScale().domain())}
                    valueScaleRange={JSON.stringify(valueScale().range())}
                    dataPoint={dataPoint}
                    howToTransform={`translate(0,${(aggregationScale()(dataPoint.aggregateAttribute) || 0)})`}
                  />
                  <ChartG currentOffset={currentOffset} attributePlotTotalWidth={attributePlotTotalWidth}>
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
              );
            }) : null}
            {/** Row labels rendered on top */}
            <HeatMapAxisY
              svg={innerSvg}
              currentOffset={currentOffset}
              xVals={sortedXVals}
              dimensionHeight={chartHeight}
              attributePlotTotalWidth={attributePlotTotalWidth}
              yAxisVar={yAxisVar}
            />
          </g>
          <g>
            <GeneratorAttributePlot
              attributePlotData={attributePlotData}
              secondaryAttributePlotData={secondaryAttributePlotData || undefined}
              aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
              aggregationScaleRange={JSON.stringify(aggregationScale().range())}
            />
          </g>
        </svg>
      </foreignObject>
      <g>
        <AttributePlotLabels attributePlotData={attributePlotData} dimensionHeight={dimensionHeight} currentOffset={currentOffset} chartId={chartId} onSortClick={handleSortClick} />
      </g>

      {/* Render after chart to render on top */}
      <HeatMapAxisX
        svg={svg}
        currentOffset={currentOffset}
        isValueScaleBand
        dimensionHeight={dimensionHeight}
        dimensionWidth={dimensionWidth}
        attributePlotTotalWidth={attributePlotTotalWidth}
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
