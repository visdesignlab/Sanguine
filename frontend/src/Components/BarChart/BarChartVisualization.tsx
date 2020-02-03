import React, { FC, useEffect, useRef, useLayoutEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { select, selectAll } from "d3";
import Bars from './Bars'
import {SingularDataPoint} from '../../Interfaces/ApplicationState'


interface OwnProps{
    xAxis: string;
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const BarChart: FC<Props> = ({ xAxis,yAxis,chartId,store }: Props) => {
    const { layoutArray, filterSelection, perCaseSelected, currentSelectedChart,actualYearRange } = store!
   // const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [yMax,setYMax] = useState(0)

    
    async function fetchChartData() {
        const res = await fetch(`http://localhost:8000/api/summarize_with_year?x_axis=${xAxis}&y_axis=${yAxis}&year_range=${actualYearRange}&filter_selection=${filterSelection.toString()}`);
        const dataResult = await res.json();
        if (dataResult) {
            
            let yMaxTemp = -1;
            let cast_data = (dataResult.result as any).map(function(ob: any) {
              let y_val = perCaseSelected
                ? ob.y_axis / ob.case_count
                : ob.y_axis;

              yMaxTemp = y_val > yMaxTemp ? y_val : yMaxTemp;

              let new_ob: SingularDataPoint = {
                xVal: ob.x_axis,
                yVal: y_val
              };
              return new_ob;
            });
            console.log(dataResult);
            setData({result:cast_data});
            setYMax(yMaxTemp);
        }
        
    }

    useEffect(() => {
        fetchChartData();
    }, []);


  
    return (
        <Bars
        chartId={chartId}
        data={data.result}
        yMax={yMax}
        xAxisName={xAxis}
        yAxisName={yAxis}    
        />
      
    );
}
 

export default inject("store")(observer(BarChart));

// const SVG = styled.svg`
//   height: 100%;
//   width: 100%;
// `;