import {
  useCallback, useRef, useEffect,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleLinear, line, min, max, curveCatmullRom, format, scaleBand, select, axisBottom,
} from 'd3';
import { Tooltip } from '@mui/material';
import styled from '@emotion/styled';
import {
  basicGray, AttributePlotWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, thirdGray,
} from '../../../../Presets/Constants';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateViolin = (dataPoints: (number)[], pdArray: any, aggregationAttribute: string) => {
    const validDP = dataPoints.filter((d) => d);
    if (validDP.length > 5) {
      return (
        <ViolinLine
          d={lineFunction()(pdArray)!}
          transform={`translate(0,${aggregationScale()(aggregationAttribute)!})`}
        />
      );
    }
    if (validDP.length === 0) {
      return (
        <line
          opacity={0.75}
          strokeWidth={1.5}
          stroke={thirdGray}
          x1={0.3 * valueScale.range()[1]}
          x2={0.7 * valueScale.range()[1]}
          y1={aggregationScale().bandwidth() * 0.5 + (aggregationScale()(aggregationAttribute) || 0)}
          y2={aggregationScale().bandwidth() * 0.5 + (aggregationScale()(aggregationAttribute) || 0)}
        />
      );
    }

    const result = dataPoints.map((d, idx) => (
      <circle
        key={idx}
        r={2}
        fill={basicGray}
        opacity={d ? 1 : 0}
        cx={valueScale(d)}
        cy={(aggregationScale()(aggregationAttribute) || 0) + Math.random() * aggregationScale().bandwidth() * 0.5 + aggregationScale().bandwidth() * 0.25}
      />
    ));

    return <g>{result}</g>;
  };

  return (
    <>
      <line
        style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }}
        x1={valueScale(plotData.attributeName === 'PREOP_HEMO' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        x2={valueScale(plotData.attributeName === 'PREOP_HEMO' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        opacity={plotData.attributeName === 'DRG_WEIGHT' ? 0 : 1}
        y1={aggregationScale().range()[0]}
        y2={aggregationScale().range()[1] - 0.25 * aggregationScale().bandwidth()}
      />
      <g transform={`translate(0,${secondaryPlotData ? aggregationScale().bandwidth() * 0.25 : 0})`}>
        {Object.entries(plotData).map(([val, result], idx) => {
          const tooltipMessage = plotData.medianSet[val] ? `Median ${format('.2f')(plotData.medianSet[val])}` : 'No data avalaible.';
          return (
            <g key={idx}>
              <Tooltip title={tooltipMessage}>
                {generateViolin(result.dataPoints as never, result.kdeArray, val)}
              </Tooltip>

            </g>
          );
        })}
      </g>
      <g transform={`translate(0,${-aggregationScale().bandwidth() * 0.25})`}>
        {secondaryPlotData ? Object.entries(secondaryPlotData).map(([val, result], idx) => {
          const secondaryTooltipMessage = secondaryPlotData.medianSet[val] ? `Median ${format('.2f')(secondaryPlotData.medianSet[val])}` : 'No data avalaible.';
          return (
            <g key={idx}>
              <Tooltip title={secondaryTooltipMessage}>
                <g>
                  {generateViolin(result.dataPoints as never, result.kdeArray, val)}
                </g>
              </Tooltip>

            </g>
          );
        }) : null}
      </g>
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
