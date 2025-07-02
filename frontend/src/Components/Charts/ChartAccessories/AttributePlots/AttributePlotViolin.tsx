import {
  useCallback, useRef, useEffect,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleLinear, line, min, max, curveCatmullRom, format, scaleBand, select, axisBottom,
} from 'd3';
import styled from '@emotion/styled';
import {
  basicGray, AttributePlotWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, thirdGray,
} from '../../../../Presets/Constants';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';
import { AttributePlotTooltip } from './AttributePlotTooltip';

const ViolinLine = styled('path')`
    fill: ${basicGray};
    stroke: ${basicGray};
  `;
/**
 * Get the x domain of the KDE for the attribute.
 * @param dataSet - The data set to get the domain from.
 * @returns The x domain of the KDE from the data set.
 */
function getAttributeXDomain(dataSet: AttributePlotData<'Violin'>['attributeData']) {
  const allKdeX = Object.values(dataSet).flatMap((result) => result.kdeArray.map((point: { x: number }) => point.x));
  return [min(allKdeX) ?? 0, max(allKdeX) ?? 20];
}

function AttributePlotViolin({
  plotData,
  secondaryPlotData,
  aggregationScaleDomain,
  aggregationScaleRange,
}: {
  plotData: AttributePlotData<'Violin'>;
  secondaryPlotData?: AttributePlotData<'Violin'>;
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
}) {
  const kdeMax = secondaryPlotData ? Math.max(plotData.kdeMax || 0, secondaryPlotData.kdeMax || 0) : (plotData.kdeMax || 0);
  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);
    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.2);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  // Get the x domain dynamically for the attribute
  const attributeXDomain = getAttributeXDomain(plotData.attributeData);
  // Set x scale for the entire attribute (Violin plots, etc.)
  const valueScale = scaleLinear()
    .domain(attributeXDomain)
    .range([0, AttributePlotWidth.Violin]);

  const lineFunction = useCallback(() => {
    const calculatedKdeRange = secondaryPlotData ? [-0.25 * aggregationScale().bandwidth(), 0.25 * aggregationScale().bandwidth()] : [-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()];
    const kdeScale = scaleLinear()
      .domain([-kdeMax, kdeMax])
      .range(calculatedKdeRange);
    const lineFunc = line()
      .curve(curveCatmullRom)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .y((d: any) => kdeScale(d.y) + 0.5 * aggregationScale().bandwidth())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .x((d: any) => valueScale(d.x));
    return lineFunc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregationScale, valueScale, kdeMax]);

  /**
   * Render a single violin plot based on data count
   */
  const generateViolin = (
    dataPoints: number[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kdeArray: any,
    rowKey: string,
  ) => {
    const count = dataPoints.filter((d) => d).length;
    const y0 = aggregationScale()(rowKey)!;
    const bandwidth = aggregationScale().bandwidth();

    // Greater than 5 points: Smooth KDE path
    if (count > 5) {
      return (
        <ViolinLine
          d={lineFunction()(kdeArray)!}
          transform={`translate(0,${y0})`}
        />
      );
    }
    // 0 points: Draw a line in the middle of the bandwidth
    if (count === 0) {
      const yC = y0 + 0.5 * bandwidth;
      const x1 = 0.3 * valueScale.range()[1];
      const x2 = 0.7 * valueScale.range()[1];
      return (
        <line
          opacity={0.75}
          strokeWidth={1.5}
          stroke={thirdGray}
          x1={x1}
          x2={x2}
          y1={yC}
          y2={yC}
        />
      );
    }

    // 1–5 points: jitter small circles
    return (
      <g>
        {dataPoints.map((d, idx) => (d ? (
          <circle
            key={idx}
            r={2}
            fill={basicGray}
            cx={valueScale(d)}
            cy={y0 + bandwidth * (0.25 + Math.random() * 0.5)}
          />
        ) : null))}
      </g>
    );
  };

  /**
   * Render one full layer of violins, shifted vertically by offset.
   */
  const generateViolins = (
    attributeData: AttributePlotData<'Violin'>['attributeData'],
    offset: number,
  ) => (
    <g transform={`translate(0,${offset})`}>
      {Object.entries(attributeData).map(([rowName, { dataPoints, kdeArray }]) => {
        const median = plotData.medianSet[rowName];
        const title = median
          ? `Median ${format('.2f')(median)}`
          : 'No data available.';
        return (
          <g key={rowName}>
            <AttributePlotTooltip title={title}>
              {generateViolin(dataPoints, kdeArray, rowName)}
            </AttributePlotTooltip>
          </g>
        );
      })}
    </g>
  );

  return (
    <>
      {/* HGB standard reference vertical line */}
      <line
        style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }}
        x1={valueScale(
          plotData.attributeName === 'PREOP_HEMO'
            ? HGB_HIGH_STANDARD
            : HGB_LOW_STANDARD,
        )}
        x2={valueScale(
          plotData.attributeName === 'PREOP_HEMO'
            ? HGB_HIGH_STANDARD
            : HGB_LOW_STANDARD,
        )}
        opacity={plotData.attributeName === 'DRG_WEIGHT' ? 0 : 1}
        y1={aggregationScale().range()[0]}
        y2={aggregationScale().range()[1] - 0.25 * aggregationScale().bandwidth()}
      />

      {/* Primary violins */}
      {generateViolins(
        plotData.attributeData,
        secondaryPlotData ? aggregationScale().bandwidth() * 0.25 : 0,
      )}

      {/* Optional outcome-comparison 'secondary' violins */}
      {secondaryPlotData
        && generateViolins(
          secondaryPlotData.attributeData,
          -aggregationScale().bandwidth() * 0.25,
        )}
    </>
  );
}

export default observer(AttributePlotViolin);

export function AttributePlotViolinAxis({
  yPos, // Vertical positioning
  xPos, // Horizontal positioning
}: {
  yPos: number;
  xPos: number;
}) {
  const valueScale = scaleLinear().domain([0, 18]).range([0, AttributePlotWidth.Violin]);

  const axisRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svgSelection = select(axisRef.current);
    const scaleLabel = axisBottom(valueScale).ticks(3);
    svgSelection.select('.axis').call(scaleLabel as never);
  }, [axisRef, valueScale]);

  return (
    <g ref={axisRef} transform={`translate(${xPos},${yPos})`}>
      <g className="axis" />
    </g>
  );
}
