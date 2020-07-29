import Store from "../../Interfaces/Store";
import { FC, useRef, useState, useEffect, useLayoutEffect } from "react";
import { ExtraPairInterventionPoint, ComparisonDataPoint } from "../../Interfaces/ApplicationState";
import React from "react";
import { inject, observer } from "mobx-react";
import { stateUpdateWrapperUseJSON } from "../../PresetsProfile";
import axios from 'axios';

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    interventionDate: number;
    interventionPlotType: string;
    extraPair?: string;
    hemoglobinDataSet: any[];
    notation: string;
    w: number
}

export type Props = OwnProps;

const ComparisonPlotVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, extraPair, aggregatedBy, valueToVisualize, chartId, store, chartIndex, interventionDate, interventionPlotType }: Props) => {
    const {
        layoutArray,
        filterSelection,
        showZero,
        previewMode,
        currentSelectPatientGroup,
        currentOutputFilterSet,
        rawDateRange,
        dateRange
    } = store!;

    const svgRef = useRef<SVGSVGElement>(null);

    const [extraPairData, setExtraPairData] = useState<ExtraPairInterventionPoint[]>([])

    const [data, setData] = useState<ComparisonDataPoint[]>([]);

    const [yMax, setYMax] = useState(0);

    // const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    const [caseIDList, setCaseIDList] = useState<any>(null)
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);

    const [openNotationModal, setOpenNotationModal] = useState(false)
    const [notationInput, setNotationInput] = useState(notation)
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    useEffect(() => {
        if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    }, [extraPair])

    useLayoutEffect(() => {
        if (svgRef.current) {
            // setDimensions({
            //     height: svgRef.current.clientHeight,
            //     width: svgRef.current.clientWidth
            // });
            // setWidth(svgRef.current.clientWidth);
            setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight);
        }
    }, [layoutArray[chartIndex]]);

    // function fetchChartData() {
    //     hemoglobinDataSet.map((singleCase: any) => {
    //         let metCriteria = true;
    //         if (currentOutputFilterSet.length > 0) {
    //             for (let selectSet of currentOutputFilterSet) {
    //                 if (selectSet.setName === aggregatedBy) {
    //                     if (!selectSet.setValues.includes(aggregateByAttr)) {
    //                         criteriaMet = false;
    //                     }
    //                 }
    //             }
    //         }
    //     })

    // }


    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call.")
        }
        //fetchChartData();
    }, [filterSelection, dateRange, aggregatedBy, showZero, valueToVisualize, currentSelectPatientGroup]);

    return (<></>)
}
export default inject("store")(observer(ComparisonPlotVisualization));