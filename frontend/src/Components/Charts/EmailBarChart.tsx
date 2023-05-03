import { observer } from "mobx-react";
import { FC, useContext, useEffect, useRef } from "react";
import { DataContext } from "../../App";
import { Grid } from "@mui/material";
import { ascending, axisBottom, axisLeft, least, max, min, scaleBand, scaleLinear, select, sum, svg } from "d3";
import { Basic_Gray, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, colorProfile } from "../../Presets/Constants";

const LAST_QUARTER = [convertDateToUnixTimestamp('01-Jan-2015'), convertDateToUnixTimestamp('31-Mar-2015')];
const CURRENT_QUARTER = [convertDateToUnixTimestamp('01-Apr-2015'), convertDateToUnixTimestamp('30-Jun-2015')];


type Prop = {
  providerType: string;
  currentSelectedProviderID: string;
  attributeToVisualize: string;
};

const EmailBarChart: FC<Prop> = ({ providerType, currentSelectedProviderID, attributeToVisualize }: Prop) => {

  const MARGIN = { left: 50, top: 5, right: 0, bottom: 20 };

  const DATA_ORDER = ['recom', 'dept', 'best', 'you'];
  const allData = useContext(DataContext);

  const svgRef = useRef(null);


  // const [dataGenerated,setDat]

  const generateProviderData = (dateRange: number[]) => {
    // Gather Data need: deparment average, individual average, selected provider average
    // filter down to cases within certain time span
    const filteredCases = allData.filter((a) => a.DATE > dateRange[0] && a.DATE < dateRange[1]);
    const allProviders: { [key: string]: { [key: string]: number; }; } = {};
    filteredCases.forEach((currentCase) => {
      const providerID = currentCase[providerType].toString();
      if (allProviders[providerID]) {
        allProviders[providerID].totalCase += 1;
        allProviders[providerID].sum += (+currentCase[attributeToVisualize]);
      } else {
        allProviders[providerID] = { totalCase: 1, sum: +currentCase[attributeToVisualize] };
      }
    });
    return allProviders;
  };

  // d3.least(flights, (a, b) => d3.ascending(a.price, b.price))
  const generateVisualizationData = (dataSource: { [key: string]: { [key: string]: number; }; }) => {

    const bestPractice = least(Object.values(dataSource), (a, b) => ascending(Math.abs(determineRecommend() - (a.sum / a.totalCase)), Math.abs(determineRecommend() - (b.sum / b.totalCase)))) || { sum: 0, totalCase: 1 };

    // console.log(bestPractice, dataSource, currentSelectedProviderID);

    const providerEntry = dataSource[currentSelectedProviderID] ? dataSource[currentSelectedProviderID] : { sum: 0, totalCase: 1 };

    return [determineRecommend(),
    sum(Object.values(dataSource), d => d.sum) / sum(Object.values(dataSource), d => d.totalCase),
    bestPractice.sum / bestPractice.totalCase,
    providerEntry.sum / providerEntry.totalCase];
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

      const lengthScale = scaleLinear().domain([0, max(Object.values(currentQuarterData).concat(Object.values(lastQuarterData)), d => d.sum / d.totalCase) || 0]).range([MARGIN.left, svgWidth - MARGIN.right]);

      svgSelection.select('#band-axis')
        .call(axisLeft(bandScale) as any)
        .attr('transform', `translate(${MARGIN.left},0)`);

      svgSelection.select('#length-axis')
        .call(axisBottom(lengthScale) as any)
        .attr('transform', `translate(0,${svgHeight - MARGIN.bottom})`);

      svgSelection.select('#bars');

      // draw current quarter rectangles
      svgSelection.select('#bars')
        .selectAll('rect')
        .data(generateVisualizationData(currentQuarterData))
        .join('rect')
        .attr('x', MARGIN.left)
        .attr('y', (_, i) => bandScale(DATA_ORDER[i]) || 0)
        .attr('width', d => lengthScale(d) - lengthScale(0))
        .attr('height', bandScale.bandwidth())
        .attr('fill', colorProfile[1]);

      svgSelection.select('#prev-bars')
        .selectAll('rect')
        .data(generateVisualizationData(lastQuarterData))
        .join('rect')
        .attr('x', MARGIN.left)
        .attr('y', (_, i) => bandScale(DATA_ORDER[i]) || 0)
        .attr('width', d => lengthScale(d) - lengthScale(0))
        .attr('height', bandScale.bandwidth())
        .attr('fill', Basic_Gray)
        .attr('opacity', 0.2);

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef, allData, providerType, currentSelectedProviderID]);



  return <Grid item xs={6} style={{ minHeight: '20vh', maxHeight: '20vh', minWidth: '40vw', maxWidth: '40vw' }}>
    {attributeToVisualize}
    <svg ref={svgRef} width='100%' height='100%'>
      <g id='band-axis' />
      <g id='length-axis' />
      <g id='bars' />
      <g id='prev-bars' />
    </svg>
  </Grid>;
};

export default observer(EmailBarChart);


function convertDateToUnixTimestamp(dateString: string): number {
  // Parse the date string into a Date object
  const date = new Date(dateString);

  // Get the Unix timestamp in milliseconds by calling the getTime() method
  const unixTimestamp = date.getTime();

  // Convert the timestamp to seconds by dividing by 1000 and rounding down

  // Return the Unix timestamp in seconds
  return unixTimestamp;
}


