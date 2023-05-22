import { FC, useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react";
import { scaleLinear, line, curveCatmullRom, format, scaleBand, select, axisBottom } from "d3";
import { Basic_Gray, ExtraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, Third_Gray } from "../../../../Presets/Constants";
import { Tooltip } from "@mui/material";
import styled from "@emotion/styled";
import { StandardLine } from "../../../../Presets/StyledSVGComponents";

interface OwnProps {
  dataSet: any[];
  aggregationScaleDomain: string;
  aggregationScaleRange: string;
  medianSet: any;
  kdeMax: number;
  name: string;
  secondaryDataSet?: any[];
  secondaryMedianSet?: any;
}

export type Props = OwnProps;

const ExtraPairViolin: FC<Props> = ({ kdeMax, dataSet, aggregationScaleDomain, aggregationScaleRange, medianSet, name, secondaryDataSet, secondaryMedianSet }: Props) => {

  const aggregationScale = useCallback(() => {
    const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());;
    const range = JSON.parse(aggregationScaleRange);
    const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.2);
    return aggregationScale;
  }, [aggregationScaleDomain, aggregationScaleRange]);

  const valueScale = scaleLinear().domain([0, 18]).range([0, ExtraPairWidth.Violin]);
  if (name === "RISK") {
    valueScale.domain([0, 30]);
  }

  const lineFunction = useCallback(() => {
    const calculatedKdeRange = secondaryDataSet ? [-0.25 * aggregationScale().bandwidth(), 0.25 * aggregationScale().bandwidth()] : [-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()];
    const kdeScale = scaleLinear()
      .domain([-kdeMax, kdeMax])
      .range(calculatedKdeRange);
    const lineFunction = line()
      .curve(curveCatmullRom)
      .y((d: any) => kdeScale(d.y) + 0.5 * aggregationScale().bandwidth())
      .x((d: any) => valueScale(d.x));
    return lineFunction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregationScale, valueScale, kdeMax]);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgSelection = select(svgRef.current);
    const scaleLabel = axisBottom(valueScale).ticks(3);
    svgSelection.select(".axis").call(scaleLabel as any);
  }, [svgRef, valueScale]);

  const generateViolin = (dataPoints: any, pdArray: any, aggregationAttribute: string) => {
    const validDP = dataPoints.filter((d: any) => d);
    if (validDP.length > 5) {
      return <ViolinLine
        d={lineFunction()(pdArray)!}
        transform={`translate(0,${aggregationScale()(aggregationAttribute)!})`}
      />;
    }
    else if (validDP.length === 0) {
      return <line
        opacity={0.75}
        strokeWidth={1.5}
        stroke={Third_Gray}
        x1={0.3 * valueScale.range()[1]}
        x2={0.7 * valueScale.range()[1]}
        y1={aggregationScale().bandwidth() * 0.5 + (aggregationScale()(aggregationAttribute) || 0)}
        y2={aggregationScale().bandwidth() * 0.5 + (aggregationScale()(aggregationAttribute) || 0)} />;
    }
    else {
      const result = dataPoints.map((d: any) => {
        return <circle
          r={2}
          fill={Basic_Gray}
          opacity={d ? 1 : 0}
          cx={valueScale(d)}
          cy={(aggregationScale()(aggregationAttribute) || 0) + Math.random() * aggregationScale().bandwidth() * 0.5 + aggregationScale().bandwidth() * 0.25} />;
      });

      return <g>{result}</g>;
    }
  };


  return (
    <>
      <g ref={svgRef} transform={`translate(0,${aggregationScale().range()[0]})`}>
        <g className="axis" />
      </g>
      <StandardLine
        x1={valueScale(name === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        x2={valueScale(name === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
        opacity={name === "RISK" ? 0 : 1}
        y1={aggregationScale().range()[0]}
        y2={aggregationScale().range()[1] - 0.25 * aggregationScale().bandwidth()} />
      <g transform={`translate(0,${secondaryDataSet ? aggregationScale().bandwidth() * 0.25 : 0})`}>
        {Object.entries(dataSet).map(([val, result]) => {
          const tooltipMessage = medianSet[val] ? `Median ${format(".2f")(medianSet[val])}` : 'No data avalaible.';
          return (
            <g>
              <Tooltip title={tooltipMessage}>
                {generateViolin(result.dataPoints, result.kdeArray, val)}
              </Tooltip>

            </g>
          );
        })}
      </g >
      <g transform={`translate(0,${-aggregationScale().bandwidth() * 0.25})`}>
        {secondaryDataSet ? Object.entries(secondaryDataSet).map(([val, result]) => {
          const secondaryTooltipMessage = secondaryMedianSet[val] ? `Median ${format(".2f")(secondaryMedianSet[val])}` : 'No data avalaible.';
          return (
            <g>
              <Tooltip title={secondaryTooltipMessage}>
                <g>
                  {generateViolin(result.dataPoints, result.kdeArray, val)}
                </g>
              </Tooltip>

            </g>
          );
        }) : <></>}
      </g>
    </>
  );
};



const ViolinLine = styled(`path`)`
    fill: ${Basic_Gray};
    stroke: ${Basic_Gray};
  `;


export default observer(ExtraPairViolin);
