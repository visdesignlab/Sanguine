import axios from "axios";
import { observer } from "mobx-react";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FC } from "react";
import { Grid, Menu } from "semantic-ui-react";
import { produceAvailableCasesForNonIntervention } from "../../../HelperFunctions/CaseListProducer";
import { generateRegularData } from "../../../HelperFunctions/ChartDataGenerator";
import { generateExtrapairPlotData } from "../../../HelperFunctions/ExtraPairDataGenerator";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { ExtraPairPoint, HeatMapDataPoint, SingleCasePoint } from "../../../Interfaces/Types/DataTypes";
import { tokenCheckCancel } from "../../../Interfaces/UserManagement";
import { ChartWrapperGrid } from "../../../Presets/StyledComponents";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import ChartButtonWrapper from "../ChartButtonWrapper";
import HeatMapButtons from "../ChartAccessories/HeatMapButtons";
import HeatMap from "./HeatMap";
import ExtraPairButtons from "../ChartAccessories/ExtraPairButtons";
import useDeepCompareEffect from 'use-deep-compare-effect'

type Props = {
    layoutW: number;
    layoutH: number;
    chartId: string;
    extraPairArrayString: string;
    xAggregationOption: string;
    yValueOption: string;
    chartTypeIndexinArray: number;
    hemoglobinDataSet: SingleCasePoint[];
}
const WrapperHeatMap: FC<Props> = ({ layoutH, layoutW, chartId, extraPairArrayString, xAggregationOption, yValueOption, chartTypeIndexinArray, hemoglobinDataSet }: Props) => {
    const store = useContext(Store);
    const { surgeryUrgencySelection, rawDateRange } = store.state;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([]);
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
    const [data, setData] = useState<HeatMapDataPoint[]>([]);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    useEffect(() => {
        if (extraPairArrayString) {
            stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArrayString])

    useEffect(() => {
        const newExtraPairData = generateExtrapairPlotData(xAggregationOption, hemoglobinDataSet, extraPairArray, data, yValueOption, store.state.BloodProductCost)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArray, data, hemoglobinDataSet]);

    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
            // setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    useDeepCompareEffect(() => {
        console.log("called")
        tokenCheckCancel(previousCancelToken)
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);

        //replace case_ids
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${store.dateRange}&filter_selection=${store.state.proceduresSelection.toString()}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                if (response.data) {
                    const temporaryDataHolder = produceAvailableCasesForNonIntervention(response.data, hemoglobinDataSet, store.state.surgeryUrgencySelection, store.state.outcomeFilter, xAggregationOption)
                    const [caseCount, outputData] = generateRegularData(temporaryDataHolder, store.state.showZero, yValueOption)
                    stateUpdateWrapperUseJSON(data, outputData, setData);
                    store.chartStore.totalAggregatedCaseCount = caseCount as number
                }
            })
            .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });
    }, [store.proceduresSelection,
        surgeryUrgencySelection,
    store.state.outcomeFilter,
        rawDateRange,
    store.state.showZero,
        xAggregationOption,
        yValueOption,
        // currentSelectPatientGroupIDs, 
        // currentOutputFilterSet,
        hemoglobinDataSet])

    return (
        <ChartWrapperGrid>
            <Grid.Row>
                <Grid.Column
                    verticalAlign="middle"
                    width={1}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2} style={{}}>
                        <ExtraPairButtons extraPairArrayString={extraPairArrayString} chartId={chartId} />
                        <HeatMapButtons xAggregationOption={xAggregationOption} yValueOption={yValueOption} chartTypeIndexinArray={chartTypeIndexinArray} chartId={chartId} />
                    </Menu>
                </Grid.Column>
                <Grid.Column width={15}>
                    <ChartSVG ref={svgRef}>
                        <HeatMap
                            dimensionHeight={height}
                            dimensionWidth={width}
                            data={data}
                            svg={svgRef}
                            xAggregationOption={xAggregationOption}
                            yValueOption={yValueOption}
                            chartId={chartId}
                            extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>
                </Grid.Column>
            </Grid.Row>
        </ChartWrapperGrid>)
}

export default observer(WrapperHeatMap)