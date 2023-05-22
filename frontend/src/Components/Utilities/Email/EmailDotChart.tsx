import { observer } from "mobx-react";
import { FC, useContext, useEffect, useRef } from "react";
import { DataContext } from "../../../App";
import { Grid } from "@mui/material";
import { ascending, axisBottom, axisLeft, least, max, mean, scaleBand, scaleLinear, select } from "d3";
import { Basic_Gray, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, colorProfile } from "../../../Presets/Constants";
import { CURRENT_QUARTER, LAST_QUARTER } from "./EmailComponent";




type Prop = {
  providerType: string;
  currentSelectedProviderID: string;
  attributeToVisualize: string;
};

const EmailDotChart: FC<Prop> = ({ providerType, currentSelectedProviderID, attributeToVisualize }: Prop) => {

  const MARGIN = { left: 50, top: 5, right: 0, bottom: 20 };

  const DATA_ORDER = ['recom', 'dept', 'best', 'you'];
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

    return [[determineRecommend()],
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

      svgSelection.select('#band-axis')
        .call(axisLeft(bandScale) as any)
        .attr('transform', `translate(${MARGIN.left},0)`);

      svgSelection.select('#length-axis')
        .call(axisBottom(lengthScale) as any)
        .attr('transform', `translate(0,${svgHeight - MARGIN.bottom})`);

      // svgSelection.select('#bars');



      svgSelection.select('#prev-dots')
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
        // .attr('cy', (_, i) => bandScale(DATA_ORDER[i]) || 0)
        // .attr('width', d => lengthScale(d) - lengthScale(0))
        // .attr('height', bandScale.bandwidth())
        .attr('fill', d => d ? Basic_Gray : 'none')
        .attr('opacity', 0.2);

      // draw current quarter rectangles
      svgSelection.select('#dots')
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
        // .attr('cy', (_, i) => bandScale(DATA_ORDER[i]) || 0)
        // .attr('width', d => lengthScale(d) - lengthScale(0))
        // .attr('height', bandScale.bandwidth())
        .attr('fill', d => d ? colorProfile[1] : 'none');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef, allData, providerType, currentSelectedProviderID]);



  return <Grid item xs={6} style={{ minHeight: '20vh', maxHeight: '20vh', minWidth: '40vw', maxWidth: '40vw' }}>
    {attributeToVisualize}
    <svg ref={svgRef} width='100%' height='100%'>
      <g id='band-axis' />
      <g id='length-axis' />
      <g id='dots' />
      <g id='prev-dots' />
    </svg>
  </Grid>;
};

export default observer(EmailDotChart);



