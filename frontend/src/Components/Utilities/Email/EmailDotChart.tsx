import { observer } from "mobx-react";
import { FC, useContext, useEffect, useRef } from "react";
import { DataContext } from "../../../App";
import { Grid } from "@mui/material";
import { ascending, axisBottom, axisLeft, least, max, mean, scaleBand, scaleLinear, select } from "d3";
import { Basic_Gray, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, ColorProfile, highlight_orange } from "../../../Presets/Constants";
import { CURRENT_QUARTER, LAST_QUARTER } from "./EmailComponent";
import { AcronymDictionary } from "../../../Presets/DataDict";




type Prop = {
  providerType: string;
  currentSelectedProviderID: string;
  attributeToVisualize: string;
};

const EmailDotChart: FC<Prop> = ({ providerType, currentSelectedProviderID, attributeToVisualize }: Prop) => {

  const MARGIN = { left: 50, top: 5, right: 10, bottom: 20 };

  const DATA_ORDER = ['dept', 'best', 'you'];
  const allData = useContext(DataContext);

  const svgRef = useRef(null);


  // const [dataGenerated,setDat]

  const generateProviderData = (dateRange: number[]) => {
    // Gather Data need: deparment average, individual average, selected provider average
    // filter down to cases within certain time span
    const filteredCases = allData.filter((a) => a.DATE > dateRange[0] && a.DATE < dateRange[1]);
    const allProviders: { [key: string]: number[]; } = {};
    filteredCases.forEach((currentCase) => {
      const providerID = currentCase[providerType].toString();
      if (allProviders[providerID]) {
        // allProviders[providerID].totalCase += 1;
        allProviders[providerID].push(+currentCase[attributeToVisualize]);
      } else {
        allProviders[providerID] = [+currentCase[attributeToVisualize]];
      }
    });
    return allProviders;
  };

  // d3.least(flights, (a, b) => d3.ascending(a.price, b.price))
  const generateVisualizationData = (dataSource: { [key: string]: number[]; }) => {

    const bestPractice = least(Object.values(dataSource), (a, b) => ascending(Math.abs(determineRecommend() - (mean(a) || 0)), Math.abs(determineRecommend() - (mean(b) || 0)))) || [];

    // console.log(bestPractice, dataSource, currentSelectedProviderID);

    const providerEntry = dataSource[currentSelectedProviderID] ? dataSource[currentSelectedProviderID] : [];;

    return [
      Object.values(dataSource).flat(),
      bestPractice,
      providerEntry];
  };

  const determineRecommend = () => {
    if (attributeToVisualize === 'PREOP_HGB') {
      return HGB_HIGH_STANDARD;
    } if (attributeToVisualize === 'POSTOP_HGB') {
      return HGB_LOW_STANDARD;
    } return 0;
  };

  useEffect(() => {
    if (svgRef.current && providerType && currentSelectedProviderID) {

      const svgSelection = select(svgRef.current);
      const svgWidth = (svgSelection.node() as any).clientWidth;
      const svgHeight = (svgSelection.node() as any).clientHeight;
      const currentQuarterData = generateProviderData(CURRENT_QUARTER);
      const lastQuarterData = generateProviderData(LAST_QUARTER);

      const bandScale = scaleBand().domain(DATA_ORDER).range([MARGIN.top, svgHeight - MARGIN.bottom]).padding(0.1);

      const lengthScale = scaleLinear().domain([0, max(Object.values(currentQuarterData).concat(Object.values(lastQuarterData)).flat()) || 0]).range([MARGIN.left, svgWidth - MARGIN.right]);

      // add shading for recommend
      svgSelection.select('.recommend')
        .selectAll('rect')
        .data([determineRecommend()])
        .join('rect')
        .attr('x', d => lengthScale(d - 1))
        .attr('y', MARGIN.top)
        .attr('width', d => lengthScale(d) - lengthScale(d - 1))
        .attr('height', svgHeight - MARGIN.bottom - MARGIN.top)
        .attr('fill', highlight_orange)
        .attr('opacity', 0.3);


      svgSelection.select('.band-axis')
        .call(axisLeft(bandScale) as any)
        .attr('transform', `translate(${MARGIN.left},0)`)
        .select('path')
        .remove();

      svgSelection.select('.length-axis')
        .call(axisBottom(lengthScale) as any)
        .attr('transform', `translate(0,${svgHeight - MARGIN.bottom})`);

      svgSelection.select('.prev-dots')
        .selectAll('g')
        .data(generateVisualizationData(lastQuarterData))
        .join('g')
        .attr('transform', (_, i) => `translate(0,${bandScale(DATA_ORDER[i]) || 0})`)
        .selectAll('circle')
        .data(d => d)
        .join('circle')
        .attr('cx', d => lengthScale(d) - lengthScale(0))
        .attr('cy', bandScale.bandwidth() * .5)
        .attr('r', 4)
        .attr('fill', d => d ? Basic_Gray : 'none')
        .attr('opacity', 0.2);

      // draw current quarter rectangles
      svgSelection.select('.dots')
        .selectAll('g')
        .data(generateVisualizationData(currentQuarterData))
        .join('g')
        .attr('transform', (_, i) => `translate(0,${bandScale(DATA_ORDER[i]) || 0})`)
        .selectAll('circle')
        .data(d => d)
        .join('circle')
        .attr('cx', d => lengthScale(d) - lengthScale(0))
        .attr('cy', bandScale.bandwidth() * .5)
        .attr('r', 4)
        .attr('opacity', 0.6)
        .attr('fill', d => d ? ColorProfile[3] : 'none');

      const legendG = svgSelection.select('.legend')
        .selectAll('g')
        .data([0, 1])
        // .data(['Current Quarter', 'Last Quarter'])
        .join('g');

      legendG.selectAll('circle')
        .data(d => [d])
        .join('circle')
        .attr('cx', svgWidth - 80)
        .attr('cy', d => d * 10 + 4)
        .attr('r', 4)
        .attr('opacity', d => d ? 0.4 : 0.6)
        .attr('fill', d => d ? Basic_Gray : ColorProfile[3]);

      legendG.selectAll('text')
        .data(d => [d])
        .join('text')
        .attr('x', svgWidth - 75)
        .attr('y', d => d * 10 + 4)
        .attr('font-size', 'x-small')
        .attr('alignment-baseline', 'middle')
        .text(d => d ? 'Last Quarter' : 'Current Quarter');

    }




    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef, allData, providerType, currentSelectedProviderID]);



  return <Grid item xs={6} style={{ minHeight: '20vh', maxHeight: '20vh', minWidth: '40vw', maxWidth: '40vw' }}>
    {AcronymDictionary[attributeToVisualize] || attributeToVisualize}
    <svg ref={svgRef} width='100%' height='100%'>
      <g className='band-axis' />
      <g className='length-axis' />
      <g className='dots' />
      <g className='prev-dots' />
      <g className='recommend' />
      <g className='legend' />
    </svg>
  </Grid>;
};

export default observer(EmailDotChart);



