import { axisBottom, axisLeft, max, scaleBand, scaleLinear, select } from "d3";
import { observer } from "mobx-react";
import { FC, useCallback, useEffect, useRef } from "react";
import { EmbeddedSVGHeight, EmbeddedSVGMargin, EmbeddedSVGWidth } from "../../../Presets/Constants";

type Prop = {
  curData: number;
  compareData: number;
};

const EmailEmbeddedBarChart: FC<Prop> = ({ curData, compareData }) => {

  const svgRef = useRef(null);
  const scale = useCallback(() => {
    return scaleLinear().domain([max([curData, compareData]) || 0, 0]).range([EmbeddedSVGMargin.bottom, EmbeddedSVGHeight - EmbeddedSVGMargin.bottom]).nice();
  }, [curData, compareData]);

  const bandScale = scaleBand().domain(['you', 'compare']).range([EmbeddedSVGMargin.left, EmbeddedSVGWidth - EmbeddedSVGMargin.right]).padding(0.3);


  useEffect(() => {
    if (svgRef && svgRef.current) {
      const svgSelection = select(svgRef.current);

      svgSelection.select('#band-axis')
        .call(axisBottom(bandScale) as any)
        .attr('transform', `translate(0,${EmbeddedSVGHeight - EmbeddedSVGMargin.bottom})`)
        .selectAll('text')
        .remove();

      // svgSelection.select('#ver-axis')
      //   .call(axisLeft(scale()).ticks(1) as any)
      //   .attr('transform', `translate(${EmbeddedSVGMargin.left},0)`)
      //   .selectAll('text')
      //   .remove();
    }
  }, [bandScale, scale, svgRef]);

  return <svg width={EmbeddedSVGWidth} height={EmbeddedSVGHeight} ref={svgRef} style={{ verticalAlign: 'middle' }}>
    <g id='band-axis' />
    <g id='ver-axis' />
    <rect x={bandScale('you')} y={scale()(curData)} width={bandScale.bandwidth()} height={scale()(0) - scale()(curData)} fill='blue' />
    <rect x={bandScale('compare')} y={scale()(compareData)} width={bandScale.bandwidth()} height={scale()(0) - scale()(compareData)} fill='grey' />
  </svg>;
};

export default observer(EmailEmbeddedBarChart);
