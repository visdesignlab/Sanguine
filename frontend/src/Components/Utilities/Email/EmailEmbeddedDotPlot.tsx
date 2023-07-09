import { FC, useCallback, useEffect, useRef } from "react";
import { EmbeddedSVGWidth, EmbeddedSVGHeight, EmbeddedSVGMargin, ColorProfile } from "../../../Presets/Constants";
import { observer } from "mobx-react";
import { axisBottom, scaleLinear, scalePoint, select } from "d3";
import { max } from "d3-array";
import { StandardLine } from "../../../Presets/StyledSVGComponents";

type Prop = {
  dataArray: number[];
  standardLine: number;
};
const EmailEmbeddedDotPlot: FC<Prop> = ({ dataArray, standardLine }) => {
  const svgRef = useRef(null);

  const scale = useCallback(() => {
    return scaleLinear().domain([max(dataArray) || 0, 0]).range([EmbeddedSVGMargin.top, EmbeddedSVGHeight - EmbeddedSVGMargin.bottom]);
  }, [dataArray]);

  const dotScale = scalePoint().domain(dataArray.map((_, d) => d.toString())).range([EmbeddedSVGMargin.left, EmbeddedSVGWidth - EmbeddedSVGMargin.right]);

  // useEffect(() => {
  //   if (svgRef && svgRef.current) {
  //     const svgSelection = select(svgRef.current);

  //     svgSelection.select('#band-axis')
  //       .call(axisBottom(dotScale) as any)
  //       .attr('transform', `translate(0,${EmbeddedSVGHeight - EmbeddedSVGMargin.bottom})`)
  //       .selectAll('text')
  //       .remove();

  //     svgSelection.select('#band-axis').selectAll('.tick').remove();

  //     // svgSelection.select('#ver-axis')
  //     //   .call(axisLeft(scale()).ticks(1) as any)
  //     //   .attr('transform', `translate(${EmbeddedSVGMargin.left},0)`)
  //     //   .selectAll('text')
  //     //   .attr('font-size', 'smaller');
  //   }
  // }, [dotScale, scale, svgRef, dataArray]);

  return <svg width={EmbeddedSVGWidth} height={EmbeddedSVGHeight} ref={svgRef} style={{ verticalAlign: 'middle' }}>
    {/* <g id='band-axis' />
    <g id='ver-axis' /> */}
    <line x1={EmbeddedSVGMargin.left} x2={EmbeddedSVGWidth} y1={scale()(0)} y2={scale()(0)} stroke='black' />

    <StandardLine x1={EmbeddedSVGMargin.left} x2={EmbeddedSVGWidth} y1={scale()(standardLine)} y2={scale()(standardLine)} />
    {dataArray.map((dp, i) =>
      <circle key={`dot-${i}`}
        cx={dotScale(i.toString())}
        cy={scale()(dp)}
        r={2}
        fill={ColorProfile[3]} />)
    }
  </svg>;
};

export default observer(EmailEmbeddedDotPlot);
