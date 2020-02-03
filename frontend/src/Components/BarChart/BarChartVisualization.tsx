import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { select, selectAll } from "d3";
import Bars from './Bars'

interface OwnProps{
    xAxis: string;
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ xAxis,yAxis,chartId,store }: Props) => {
    const { layoutArray, filterSelection, perCaseSelected, currentSelectedChart,actualYearRange } = store!
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [data, setData] = useState({ result: [] })
    
    async function fetchChartData() {
        const res = await fetch(`http://localhost:8000/api/summarize_with_year?x_axis=${xAxis}&y_axis=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`);
        const dataResult = await res.json();
        console.log(dataResult)
        setData(dataResult);
    }

    useEffect(() => {
        fetchChartData();
    }, []);

    useLayoutEffect(() => {
      if (svgRef.current) {
        setDimensions({
          height: svgRef.current.clientHeight,
          width: svgRef.current.clientWidth
        });
      }
    }, []);
    console.log(layoutArray)
    return (<div>
        <Bars width={dimensions.width} height={dimensions.height} data={data.result}/>
    </div>)
}
 

export default inject("store")(observer(BarChart));