import {
  useCallback, useRef, useEffect,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleLinear, line, min, max, curveCatmullRom, format, scaleBand, select, extent, axisBottom,
} from 'd3';
import { Tooltip } from '@mui/material';
import styled from '@emotion/styled';
import {
  basicGray, ExtraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, thirdGray,
} from '../../../../Presets/Constants';
import { SingleCasePoint, ExtraPairPoint } from '../../../../Interfaces/Types/DataTypes';

const ViolinLine = styled('path')`
    fill: ${basicGray};
    stroke: ${basicGray};
  `;

type Props = {
  dataSet: SingleCasePoint[];
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
  medianSet: ExtraPairPoint['medianSet'];
  kdeMax: number;
  name: string;
  secondaryDataSet?: SingleCasePoint[];
  secondaryMedianSet?: ExtraPairPoint['medianSet'];
};

/**
 * Get the x domain of the KDE for the attribute.
 * @param dataSet - The data set to get the domain from.
 * @returns The x domain of the KDE from the data set.
 */
function getAttributeXDomain(dataSet: ExtraPairPoint['data']) {
  
  const allKdeX = Object.values(dataSet).flatMap((result) => {
    const originalKde = result.kdeArray;
    return originalKde.map((point: { x: number }) => point.x);
  });
  return [min(allKdeX) ?? 0, max(allKdeX) ?? 20];
}

function ExtraPairViolin({
  kdeMax, dataSet, aggregationScaleDomain, aggregationScaleRange, medianSet, name, secondaryDataSet, secondaryMedianSet,
}: Props) {
  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
    const range = JSON.parse(aggregationScaleRange);
    const aggScale = scaleBand().domain(domain).range(range).paddingInner(0.2);
    return aggScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  // Get the x domain dynamically for the attribute
  const attributeXDomain = getAttributeXDomain(dataSet);
  // Set x scale for the entire attribute (Violin plots, etc.)
  const valueScale = scaleLinear()
    .domain(attributeXDomain)
    .range([0, ExtraPairWidth.Violin]);

  const lineFunction = useCallback(() => {
    const calculatedKdeRange = secondaryDataSet ? [-0.25 * aggregationScale().bandwidth(), 0.25 * aggregationScale().bandwidth()] : [-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()];
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

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgSelection = select(svgRef.current);
    const scaleLabel = axisBottom(valueScale).ticks(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svgSelection.select('.axis').call(scaleLabel as any);
  }, [svgRef, valueScale]);

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
      <g ref={svgRef} transform={`translate(0,${aggregationScale().range()[0]})`}>
        <g className="axis" />
      </g>
      <line
        style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }}
        x1={valueScale(name === 'Preop HGB' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        x2={valueScale(name === 'Preop HGB' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        opacity={name === 'RISK' ? 0 : 1}
        y1={aggregationScale().range()[0]}
        y2={aggregationScale().range()[1] - 0.25 * aggregationScale().bandwidth()}
      />
      <g transform={`translate(0,${secondaryDataSet ? aggregationScale().bandwidth() * 0.25 : 0})`}>
        {Object.entries(dataSet).map(([val, result], idx) => {
          const tooltipMessage = medianSet[val] ? `Median ${format('.2f')(medianSet[val])}` : 'No data avalaible.';
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
        {secondaryDataSet ? Object.entries(secondaryDataSet).map(([val, result], idx) => {
          const secondaryTooltipMessage = secondaryMedianSet[val] ? `Median ${format('.2f')(secondaryMedianSet[val])}` : 'No data avalaible.';
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

export default observer(ExtraPairViolin);
