import React, {
    FC,
    useEffect,
    useRef,
    useLayoutEffect,
    useState
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { DumbbellDataPoint, SelectSet } from "../../Interfaces/ApplicationState"
import ScatterPlotChart from "./ScatterPlotChart"

interface OwnProps {
    xAxis: string;
    yAxis: string;
    chartId: string;
    store?: Store;
    chartIndex: number
}

export type Props = OwnProps;

const ScatterPlotVisualization: FC<Props> = ({ yAxis, xAxis,chartId, store, chartIndex }: Props) => { 
    const {
        layoutArray,
        filterSelection,
        actualYearRange
    } = store!;
    
    const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState({ result: [] });
    const [dimension, setDimensions] = useState({ width: 0, height: 0 });
    const [yMax, setYMax] = useState(0);
    const [xRange, setXRange] = useState({ xMin: 0, xMax: Infinity });
    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensions({
                height: svgRef.current.clientHeight,
                width: svgRef.current.clientWidth
            });
        }
    }, [layoutArray[chartIndex]]);

    async function fetchChartData() {

        const hemoRes = await fetch(`http://localhost:8000/api/hemoglobin`);
        const hemoDataResult = await hemoRes.json();
        const hemo_data = hemoDataResult.result;
        let tempYMax = 0;
        let tempXMin = Infinity;
        let tempXMax = 0;
    }


    useEffect(() => {
        fetchChartData();
    }, [actualYearRange, filterSelection]);
    return (<div />);
}
export default inject("store")(observer(ScatterPlotVisualization));