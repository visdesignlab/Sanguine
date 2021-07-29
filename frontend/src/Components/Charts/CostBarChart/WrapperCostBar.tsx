import { Container, Grid } from "@material-ui/core";
import axios from "axios";
import { sum } from "d3";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import { DataContext } from "../../../App";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { CostBarChartDataPoint } from "../../../Interfaces/Types/DataTypes";
import { useStyles } from "../../../Presets/StyledComponents";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";
import StackedBarChart from "./StackedBarChart";

type Props = {
    xAggregatedOption: string;
    chartId: string;
    // notation: string;
    layoutW: number;
    layoutH: number;
    comparisonOption?: string;
}

const WrapperCostBar: FC<Props> = ({ xAggregatedOption, chartId, layoutH, layoutW, comparisonOption }: Props) => {
    const store = useContext(Store);
    const hemoData = useContext(DataContext);
    const styles = useStyles();
    const { proceduresSelection, BloodProductCost, currentOutputFilterSet, rawDateRange } = store.state;

    const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState<CostBarChartDataPoint[]>([]);
    const [secondaryData, setSecondaryData] = useState<CostBarChartDataPoint[]>([])
    const [maximumCost, setMaximumCost] = useState(0);
    const [maximumSavedNegative, setMinCost] = useState(0)
    const [costInput, setCostInput] = useState(0)
    const [dimensionHeight, setDimensionHeight] = useState(0)
    const [dimensionWidth, setDimensionWidth] = useState(0)

    const [costMode, setCostMode] = useState(true);
    const [openCostInputModal, setOpenCostInputModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

    const [showPotential, setShowPotential] = useState(false);

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensionHeight(svgRef.current.clientHeight);
            setDimensionWidth(svgRef.current.clientWidth)
            //  setDimensionWidth(w === 1 ? 542.28 : 1146.97)
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    const makeDataObj = (dataItem: any) => {
        console.log(dataItem)
        let newDataObj: CostBarChartDataPoint = {
            aggregateAttribute: dataItem.aggregateAttribute,
            dataArray: [
                dataItem.PRBC_UNITS * (costMode ? BloodProductCost.PRBC_UNITS : 1) / dataItem.caseNum,
                dataItem.FFP_UNITS * (costMode ? BloodProductCost.FFP_UNITS : 1) / dataItem.caseNum,
                dataItem.PLT_UNITS * (costMode ? BloodProductCost.PLT_UNITS : 1) / dataItem.caseNum,
                dataItem.CRYO_UNITS * (costMode ? BloodProductCost.CRYO_UNITS : 1) / dataItem.caseNum,
                (costMode ? (dataItem.SALVAGE_USAGE * BloodProductCost.CELL_SAVER_ML / dataItem.caseNum) : (dataItem.CELL_SAVER_ML * 0.004 / dataItem.caseNum))
            ],
            caseNum: dataItem.caseNum,
            cellSalvageUsage: dataItem.SALVAGE_USAGE / dataItem.caseNum,
            cellSalvageVolume: dataItem.CELL_SAVER_ML / dataItem.caseNum
        }
        return newDataObj
    }

    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        let tempmaxCost = 0;
        let tempMinCost = 0;
        let temporaryDataHolder: any = {};
        let secondaryTemporaryDataHolder: any = {};
        let caseSetReturnedFromQuery = new Set();
        let outputData: CostBarChartDataPoint[] = [];
        let secondaryOutputData: CostBarChartDataPoint[] = [];
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call)
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${store.dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const dataResult = response.data
            if (dataResult) {
                dataResult.forEach((element: any) => {
                    caseSetReturnedFromQuery.add(element.case_id)
                })
                hemoData.forEach((singleCase: any) => {
                    if (!temporaryDataHolder[singleCase[xAggregatedOption]]) {
                        temporaryDataHolder[singleCase[xAggregatedOption]] = {
                            aggregateAttribute: singleCase[xAggregatedOption],
                            PRBC_UNITS: 0,
                            FFP_UNITS: 0,
                            CRYO_UNITS: 0,
                            PLT_UNITS: 0,
                            CELL_SAVER_ML: 0,
                            caseNum: 0,
                            SALVAGE_USAGE: 0
                        }
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]] = {
                            aggregateAttribute: singleCase[xAggregatedOption],
                            PRBC_UNITS: 0,
                            FFP_UNITS: 0,
                            CRYO_UNITS: 0,
                            PLT_UNITS: 0,
                            CELL_SAVER_ML: 0,
                            caseNum: 0,
                            SALVAGE_USAGE: 0
                        }
                    }
                    if (comparisonOption && singleCase[comparisonOption] > 0) {
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].FFP_UNITS += singleCase.FFP_UNITS;
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].PLT_UNITS += singleCase.PLT_UNITS;
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0)
                        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].caseNum += 1
                    } else {
                        temporaryDataHolder[singleCase[xAggregatedOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
                        temporaryDataHolder[singleCase[xAggregatedOption]].FFP_UNITS += singleCase.FFP_UNITS;
                        temporaryDataHolder[singleCase[xAggregatedOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
                        temporaryDataHolder[singleCase[xAggregatedOption]].PLT_UNITS += singleCase.PLT_UNITS;
                        temporaryDataHolder[singleCase[xAggregatedOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
                        temporaryDataHolder[singleCase[xAggregatedOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0)
                        temporaryDataHolder[singleCase[xAggregatedOption]].caseNum += 1
                    }
                }
                )
                console.log(temporaryDataHolder)
                Object.values(temporaryDataHolder).forEach((dataItem: any) => {
                    let newDataObj = makeDataObj(dataItem);

                    const sum_cost = sum(newDataObj.dataArray) + (costMode ? (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0)
                    tempmaxCost = tempmaxCost > sum_cost ? tempmaxCost : sum_cost
                    const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4])
                    if (costMode && !isNaN(costSaved)) {
                        tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
                    }
                    outputData.push(newDataObj)
                })
                if (comparisonOption) {
                    console.log(secondaryTemporaryDataHolder)
                    Object.values(secondaryTemporaryDataHolder).forEach((dataItem: any) => {
                        let newDataObj = makeDataObj(dataItem);

                        const sum_cost = sum(newDataObj.dataArray) || 0 + (costMode ? (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0)
                        tempmaxCost = tempmaxCost > sum_cost ? tempmaxCost : sum_cost
                        const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4])
                        if (costMode && !isNaN(costSaved)) {
                            tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
                        }
                        secondaryOutputData.push(newDataObj)
                    })
                    stateUpdateWrapperUseJSON(secondaryData, secondaryOutputData, setSecondaryData)
                }
                stateUpdateWrapperUseJSON(data, outputData, setData);


                setMinCost(tempMinCost)
                setMaximumCost(tempmaxCost)
                console.log(tempmaxCost, maximumCost, tempMinCost, maximumSavedNegative)
            }
        }).catch(function (thrown) {
            if (axios.isCancel(thrown)) {
                console.log('Request canceled', thrown.message);
            } else {
                // handle error
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proceduresSelection, rawDateRange, xAggregatedOption, currentOutputFilterSet, costMode, BloodProductCost]);

    return (
        <Grid container direction="row" alignItems="center" className={styles.chartWrapper}>
            <Grid item xs={1}>
                <ChartConfigMenu
                    xAggregationOption={xAggregatedOption}
                    yValueOption={""}
                    chartTypeIndexinArray={0}
                    chartId={chartId}
                    requireOutcome={false}
                    requireSecondary={true} />
            </Grid>
            <Grid item xs={11} className={styles.chartWrapper}>
                <Container className={styles.chartWrapper}>
                    <ChartSVG ref={svgRef}>

                        <StackedBarChart
                            xAggregationOption={xAggregatedOption}
                            secondaryData={comparisonOption ? secondaryData : undefined}
                            svg={svgRef}
                            data={data}
                            dimensionWidth={dimensionWidth}
                            dimensionHeight={dimensionHeight}
                            maximumCost={maximumCost}
                            maxSavedNegative={maximumSavedNegative}
                            costMode={costMode}
                            showPotential={showPotential} />

                    </ChartSVG>
                </Container>
            </Grid>
        </Grid>)
}

export default observer(WrapperCostBar)

