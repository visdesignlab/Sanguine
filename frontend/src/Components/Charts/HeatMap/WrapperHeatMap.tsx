import axios from "axios";
import { observer } from "mobx-react";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FC } from "react";
import { generateRegularData } from "../../../HelperFunctions/ChartDataGenerator";
import { generateExtrapairPlotData } from "../../../HelperFunctions/ExtraPairDataGenerator";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { BloodProductCap, ExtraPairPadding, ExtraPairWidth, OffsetDict } from "../../../Presets/Constants";
import Store from "../../../Interfaces/Store";
import { ExtraPairPoint, HeatMapDataPoint, SingleCasePoint } from "../../../Interfaces/Types/DataTypes";
import { tokenCheckCancel } from "../../../Interfaces/UserManagement";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import HeatMap from "./HeatMap";
import ExtraPairButtons from "../ChartAccessories/ExtraPairButtons";
import useDeepCompareEffect from 'use-deep-compare-effect'
import { DataContext } from "../../../App";
import { Grid, Container } from "@material-ui/core";
import { useStyles } from "../../../Presets/StyledComponents";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";

type Props = {
    layoutW: number;
    layoutH: number;
    chartId: string;
    extraPairArrayString: string;
    xAggregationOption: string;
    yValueOption: string;
    chartTypeIndexinArray: number;
    outcomeComparison?: string;
}
const WrapperHeatMap: FC<Props> = ({ outcomeComparison, layoutH, layoutW, chartId, extraPairArrayString, xAggregationOption, yValueOption, chartTypeIndexinArray }: Props) => {
    const hemoData = useContext(DataContext)
    const store = useContext(Store);
    const styles = useStyles();
    const { surgeryUrgencySelection, rawDateRange, proceduresSelection } = store.state;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([]);
    const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
    const [data, setData] = useState<HeatMapDataPoint[]>([]);
    const [secondaryData, setSecondaryData] = useState<HeatMapDataPoint[]>([]);
    const [secondaryExtraPairData, setSecondaryExtraPairData] = useState<ExtraPairPoint[]>([]);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)
    const [extraPairTotalWidth, setExtraPairTotalWidth] = useState(0);


    useEffect(() => {
        if (extraPairArrayString) {
            stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArrayString])

    useDeepCompareEffect(() => {
        const newExtraPairData = generateExtrapairPlotData(xAggregationOption, hemoData, extraPairArray, data, yValueOption, store.state.BloodProductCost);
        if (outcomeComparison) {
            const newSecondaryExtraPairData = generateExtrapairPlotData(xAggregationOption, hemoData, extraPairArray, secondaryData, yValueOption, store.state.BloodProductCost);
            stateUpdateWrapperUseJSON(secondaryExtraPairData, newSecondaryExtraPairData, setSecondaryExtraPairData)
        }
        let totalWidth = newExtraPairData.length > 0 ? (newExtraPairData.length + 1) * ExtraPairPadding : 0;
        newExtraPairData.forEach((d) => {
            totalWidth += (ExtraPairWidth[d.type])
        })
        setExtraPairTotalWidth(totalWidth)
        stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraPairArray, data, hemoData, secondaryData, outcomeComparison]);

    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
            setHeight(svgRef.current.clientHeight);
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    useDeepCompareEffect(() => {
        console.log("called")
        tokenCheckCancel(previousCancelToken)
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);

        //replace case_ids
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${store.dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                if (response.data) {
                    // const temporaryDataHolder = produceAvailableCasesForNonIntervention(response.data, hemoData, store.state.surgeryUrgencySelection, store.state.outcomeFilter, xAggregationOption)
                    let caseSetReturnedFromQuery = new Set();
                    let temporaryDataHolder: any = {};
                    let secondaryTemporaryDataHolder: any = {};
                    response.data.forEach((element: any) => {
                        caseSetReturnedFromQuery.add(element.case_id);
                    })
                    hemoData.forEach((singleCase: SingleCasePoint) => {
                        if (caseSetReturnedFromQuery.has(singleCase.CASE_ID)) {
                            //   caseDictionary[singleCase.CASE_ID] = true;
                            if (!temporaryDataHolder[singleCase[xAggregationOption]]) {
                                temporaryDataHolder[singleCase[xAggregationOption]] = {
                                    aggregateAttribute: singleCase[xAggregationOption],
                                    data: [],
                                    patientIDList: new Set(),
                                }
                                secondaryTemporaryDataHolder[singleCase[xAggregationOption]] = {
                                    aggregateAttribute: singleCase[xAggregationOption],
                                    data: [],
                                    patientIDList: new Set(),
                                }
                            }

                            if (outcomeComparison && singleCase[outcomeComparison] > 0) {
                                secondaryTemporaryDataHolder[singleCase[xAggregationOption]].data.push(singleCase);
                                secondaryTemporaryDataHolder[singleCase[xAggregationOption]].patientIDList.add(singleCase.PATIENT_ID);
                            }
                            else {
                                temporaryDataHolder[singleCase[xAggregationOption]].data.push(singleCase);
                                temporaryDataHolder[singleCase[xAggregationOption]].patientIDList.add(singleCase.PATIENT_ID);
                            }
                        }
                    })
                    const [caseCount, outputData] = generateRegularData(temporaryDataHolder, store.state.showZero, yValueOption);
                    const [secondCaseCount, secondOutputData] = generateRegularData(secondaryTemporaryDataHolder, store.state.showZero, yValueOption);
                    stateUpdateWrapperUseJSON(data, outputData, setData);
                    stateUpdateWrapperUseJSON(secondaryData, secondOutputData, setSecondaryData);
                    store.chartStore.totalAggregatedCaseCount = (caseCount as number) + (secondCaseCount as number)
                }
            })
            .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });
    }, [proceduresSelection, surgeryUrgencySelection, store.state.outcomeFilter,
        rawDateRange,
        store.state.showZero,
        xAggregationOption,
        yValueOption,
        outcomeComparison,
        // currentSelectPatientGroupIDs, 
        // currentOutputFilterSet,
        hemoData])

    return (
        <Grid container direction="row" alignItems="center" className={styles.chartWrapper}>

            <Grid item xs={1}>
                {/* <Menu icon vertical compact size="mini" borderless secondary widths={2} style={{}}> */}
                <div>
                    <ExtraPairButtons disbleButton={width * 0.6 < extraPairTotalWidth} extraPairLength={extraPairArray.length} chartId={chartId} />
                    <ChartConfigMenu
                        xAggregationOption={xAggregationOption}
                        yValueOption={yValueOption}
                        chartTypeIndexinArray={chartTypeIndexinArray}
                        chartId={chartId}

                        requireOutcome={true}
                        requireSecondary={true} />
                </div>
            </Grid>
            <Grid item xs={11} className={styles.chartWrapper}>
                <Container className={styles.chartWrapper}>
                    <ChartSVG ref={svgRef}>
                        <HeatMap
                            dimensionHeight={height}
                            dimensionWidth={width}
                            data={data}
                            svg={svgRef}
                            extraPairTotalWidth={extraPairTotalWidth}
                            xAggregationOption={xAggregationOption}
                            yValueOption={yValueOption}
                            chartId={chartId}
                            extraPairDataSet={extraPairData}
                            secondaryExtraPairDataSet={outcomeComparison ? secondaryExtraPairData : undefined}
                            secondaryData={outcomeComparison ? secondaryData : undefined}
                        />
                    </ChartSVG>
                </Container>
            </Grid>

        </Grid>)
}

export default observer(WrapperHeatMap)