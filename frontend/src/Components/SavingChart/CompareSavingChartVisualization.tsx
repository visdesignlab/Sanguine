import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { BarChartDataPoint, CostBarChartDataPoint, CostCompareChartDataPoint, ExtraPairPoint, SingleCasePoint } from '../../Interfaces/ApplicationState'
import { BloodProductCap, barChartValuesOptions, barChartAggregationOptions, extraPairOptions, ChartSVG, AcronymDictionary, CostExplain } from "../../PresetsProfile"
import { Icon, Grid, Dropdown, Menu, Button, Form, Modal, Message } from "semantic-ui-react";
import { create as createpd } from "pdfast";
import { sum, median } from "d3";
import axios from 'axios'
import { stateUpdateWrapperUseJSON, generateExtrapairPlotData } from "../../HelperFunctions";
import NotationForm from "../Utilities/NotationForm";
import CompareSavingChart from "./CompareSavingChart";

interface OwnProps {
    aggregatedBy: string;
    valueToCompare: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    //  extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const CompareSavingChartVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, aggregatedBy, chartId, store, valueToCompare }: Props) => {
    const {
        layoutArray,
        proceduresSelection,
        BloodProductCost,
        currentSelectPatientGroupIDs,
        currentOutputFilterSet,
        previewMode,
        dateRange,
        procedureTypeSelection
    } = store!;
    const svgRef = useRef<SVGSVGElement>(null);
    // const [data, setData] = useState<{: BarChartDataPoint[]; perCase: BarChartDataPoint[]; }>({: [], perCase: [] });
    const [data, setData] = useState<
        CostCompareChartDataPoint[]
    >([]);

    const [maximumCost, setMaximumCost] = useState(0);
    const [maximumSaved, setMinCost] = useState(0)
    const [costInput, setCostInput] = useState(0)
    const [dimensionHeight, setDimensionHeight] = useState(0)
    const [dimensionWidth, setDimensionWidth] = useState(0)

    const [costMode, setCostMode] = useState(true);
    const [openCostInputModal, setOpenCostInputModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)


    // useEffect(() => {
    //     if (extraPair) { stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray) }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [extraPair])

    useLayoutEffect(() => {
        if (svgRef.current) {
            setDimensionHeight(svgRef.current.clientHeight);
            setDimensionWidth(svgRef.current.clientWidth)
            //  setDimensionWidth(w === 1 ? 542.28 : 1146.97)
        }
    }, [layoutArray, w]);




    useEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?")
        }
        let tempmaxCost = 0;
        let tempMinCost = 0;
        let temporaryDataHolder: any = {}
        let caseSetReturnedFromQuery = new Set();
        let outputData: CostBarChartDataPoint[] = [];
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call)
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${currentSelectPatientGroupIDs.toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const dataResult = response.data
            if (dataResult) {
                dataResult.forEach((element: any) => {
                    caseSetReturnedFromQuery.add(element.case_id)
                })
                hemoglobinDataSet.forEach((singleCase: any) => {
                    let criteriaMet = true;
                    if (currentOutputFilterSet.length > 0) {
                        for (let selectSet of currentOutputFilterSet) {
                            if (selectSet.setName === aggregatedBy) {
                                if (!selectSet.setValues.includes(singleCase[aggregatedBy])) {
                                    criteriaMet = false;
                                }
                            }
                        }
                    }
                    if (!caseSetReturnedFromQuery.has(singleCase.CASE_ID)) {
                        criteriaMet = false;
                    }
                    else if (!procedureTypeSelection[singleCase.SURGERY_TYPE]) {
                        criteriaMet = false;
                    }
                    if (criteriaMet) {
                        if (!temporaryDataHolder[singleCase[aggregatedBy]]) {
                            temporaryDataHolder[singleCase[aggregatedBy]] = {
                                aggregateAttribute: singleCase[aggregatedBy],
                                CRYO_UNITS_WITH_INTER: 0,
                                PLT_UNITS_WITH_INTER: 0,
                                CELL_SAVER_ML_WITH_INTER: 0,
                                PRBC_UNITS_WITH_INTER: 0,
                                FFP_UNITS_WITH_INTER: 0,
                                CRYO_UNITS_WITHOUT_INTER: 0,
                                PLT_UNITS_WITHOUT_INTER: 0,
                                CELL_SAVER_ML_WITHOUT_INTER: 0,
                                PRBC_UNITS_WITHOUT_INTER: 0,
                                FFP_UNITS_WITHOUT_INTER: 0,
                                CASENUM_WITH_INTER: 0,
                                CASENUM_WITHOUT_INTER: 0,
                                // CRYO_UNITS: 0,
                                // PLT_UNITS: 0,
                                // CELL_SAVER_ML: 0,
                                // caseNum: 0,
                                SALVAGE_USAGE_WITH_INTER: 0,
                                SALVAGE_USAGE_WITHOUT_INTER: 0
                            }
                        }
                        if (singleCase[valueToCompare] > 0) {
                            temporaryDataHolder[singleCase[aggregatedBy]].PRBC_UNITS_WITH_INTER += singleCase.PRBC_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].FFP_UNITS_WITH_INTER += singleCase.FFP_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].CRYO_UNITS_WITH_INTER += singleCase.CRYO_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].PLT_UNITS_WITH_INTER += singleCase.PLT_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].CELL_SAVER_ML_WITH_INTER += singleCase.CELL_SAVER_ML;
                            temporaryDataHolder[singleCase[aggregatedBy]].CASENUM_WITH_INTER += 1;
                            temporaryDataHolder[singleCase[aggregatedBy]].SALVAGE_USAGE_WITH_INTER += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0)
                        } else {
                            temporaryDataHolder[singleCase[aggregatedBy]].PRBC_UNITS_WITHOUT_INTER += singleCase.PRBC_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].FFP_UNITS_WITHOUT_INTER += singleCase.FFP_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].CRYO_UNITS_WITHOUT_INTER += singleCase.CRYO_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].PLT_UNITS_WITHOUT_INTER += singleCase.PLT_UNITS;
                            temporaryDataHolder[singleCase[aggregatedBy]].CELL_SAVER_ML_WITHOUT_INTER += singleCase.CELL_SAVER_ML;
                            temporaryDataHolder[singleCase[aggregatedBy]].CASENUM_WITHOUT_INTER += 1
                            temporaryDataHolder[singleCase[aggregatedBy]].SALVAGE_USAGE_WITHOUT_INTER += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0)
                        }
                    }
                })

                Object.values(temporaryDataHolder).forEach((dataItem: any) => {
                    let newDataObj: CostCompareChartDataPoint = {
                        aggregateAttribute: dataItem.aggregateAttribute,
                        withInterDataArray: [
                            dataItem.PRBC_UNITS_WITH_INTER * (costMode ? BloodProductCost.PRBC_UNITS : 1) / dataItem.CASENUM_WITH_INTER,
                            dataItem.FFP_UNITS_WITH_INTER * (costMode ? BloodProductCost.FFP_UNITS : 1) / dataItem.CASENUM_WITH_INTER,
                            dataItem.PLT_UNITS_WITH_INTER * (costMode ? BloodProductCost.PLT_UNITS : 1) / dataItem.CASENUM_WITH_INTER,
                            dataItem.CRYO_UNITS_WITH_INTER * (costMode ? BloodProductCost.CRYO_UNITS : 1) / dataItem.CASENUM_WITH_INTER,
                            (costMode ? (dataItem.SALVAGE_USAGE_WITH_INTER * BloodProductCost.CELL_SAVER_ML / dataItem.CASENUM_WITH_INTER)
                                : (dataItem.CELL_SAVER_ML_WITH_INTER * 0.004 / dataItem.CASENUM_WITH_INTER))
                        ],
                        dataArray: [dataItem.PRBC_UNITS_WITHOUT_INTER * (costMode ? BloodProductCost.PRBC_UNITS : 1) / dataItem.CASENUM_WITHOUT_INTER,
                        dataItem.FFP_UNITS_WITHOUT_INTER * (costMode ? BloodProductCost.FFP_UNITS : 1) / dataItem.CASENUM_WITHOUT_INTER,
                        dataItem.PLT_UNITS_WITHOUT_INTER * (costMode ? BloodProductCost.PLT_UNITS : 1) / dataItem.CASENUM_WITHOUT_INTER,
                        dataItem.CRYO_UNITS_WITHOUT_INTER * (costMode ? BloodProductCost.CRYO_UNITS : 1) / dataItem.CASENUM_WITHOUT_INTER,
                        (costMode ? (dataItem.SALVAGE_USAGE_WITHOUT_INTER * BloodProductCost.CELL_SAVER_ML / dataItem.CASENUM_WITHOUT_INTER)
                            : (dataItem.CELL_SAVER_ML_WITHOUT_INTER * 0.004 / dataItem.CASENUM_WITHOUT_INTER))],
                        caseNum: dataItem.CASENUM_WITHOUT_INTER,
                        withInterCaseNum: dataItem.CASENUM_WITH_INTER,
                        cellSalvageUsage: dataItem.SALVAGE_USAGE_WITHOUT_INTER / dataItem.CASENUM_WITHOUT_INTER,
                        cellSalvageVolume: dataItem.CELL_SAVER_ML_WITHOUT_INTER / dataItem.CASENUM_WITHOUT_INTER,
                        withInterCellSalvageUsage: dataItem.SALVAGE_USAGE_WITH_INTER / dataItem.CASENUM_WITH_INTER,
                        withInterCellSalvageVolume: dataItem.CELL_SAVER_ML_WITH_INTER / dataItem.CASENUM_WITH_INTER
                    }
                    // const sumCost = sum(newDataObj.dataArray) + (costMode ? (newDataObj.cellSalvageVolume / 200 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0)
                    // const altSumCost = sum(newDataObj.withInterDataArray) + (costMode ? (newDataObj.withInterCellSalvageVolume / 200 * BloodProductCost.PRBC_UNITS - newDataObj.withInterDataArray[4]) : 0)
                    const sumCost = sum(newDataObj.dataArray)
                    const altSumCost = sum(newDataObj.withInterDataArray)
                    const costSaved = (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4])
                    const altCostSaved = (newDataObj.withInterCellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.withInterDataArray[4])
                    tempmaxCost = tempmaxCost > sumCost ? tempmaxCost : sumCost
                    tempmaxCost = tempmaxCost > altSumCost ? tempmaxCost : altSumCost
                    // console.log(costSaved, altCostSaved)
                    if (costMode) {
                        if (!isNaN(costSaved)) {
                            tempMinCost = (tempMinCost > costSaved) ? tempMinCost : costSaved;
                        }
                        if (!isNaN(altCostSaved))
                            tempMinCost = (tempMinCost > altCostSaved) ? tempMinCost : altCostSaved;
                    }
                    outputData.push(newDataObj)
                })
                stateUpdateWrapperUseJSON(data, outputData, setData);

                setMaximumCost(tempmaxCost)
                setMinCost(tempMinCost)
            }
        }).catch(function (thrown) {
            if (axios.isCancel(thrown)) {
                console.log('Request canceled', thrown.message);
            } else {
                // handle error
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proceduresSelection, procedureTypeSelection, dateRange, aggregatedBy, currentOutputFilterSet, currentSelectPatientGroupIDs, costMode, BloodProductCost]);



    const changeAggregation = (e: any, value: any) => {
        actions.changeChart(value.value, "", chartId, "COST")
    }
    const changeMode = (e: any, value: any) => {
        setCostMode(!costMode)
        console.log(costMode)
    }

    const openCostInputForm = (e: any, value: any) => {
        setModalTitle(value.value);
        setCostInput(BloodProductCost[value.value])
        console.log(costInput)
        setOpenCostInputModal(true);


    }



    return (
        <Grid style={{ height: "100%" }} >
            <Grid.Row >
                <Grid.Column verticalAlign="middle" width={1} style={{ display: previewMode ? "none" : null }}>
                    <Menu icon vertical compact size="mini" borderless secondary widths={2} >
                        <Menu.Item>
                            <Dropdown selectOnBlur={false} pointing basic item icon="settings" compact >
                                {/* TODO: The dropdown menu will continue to have the focus on the item, so need to click something else before clicking the same item again.  */}
                                <Dropdown.Menu>
                                    <Dropdown text="Change Aggregation" pointing item compact options={barChartAggregationOptions} onChange={changeAggregation}></Dropdown>
                                    <Dropdown text="Adjust Cost Input" pointing item compact deburr options={barChartValuesOptions} onChange={openCostInputForm}></Dropdown>
                                    <Dropdown.Item text={`Show ${costMode ? "per case" : "cost"}`} onClick={changeMode} />
                                </Dropdown.Menu>

                            </Dropdown>
                        </Menu.Item>

                    </Menu>

                </Grid.Column>
                <Modal autoFocus open={openCostInputModal} closeOnEscape={false} closeOnDimmerClick={false}>
                    <Modal.Header>
                        Set cost for {AcronymDictionary[modalTitle]}
                    </Modal.Header>
                    <Modal.Content>
                        <Form>
                            <Form.Input
                                // value={costInput}
                                // label="Notation"
                                placeholder={costInput}
                                onChange={(e, d) => {
                                    if (!isNaN(parseInt(d.value))) {
                                        setCostInput(parseInt(d.value))
                                    }
                                }
                                }
                            />
                        </Form>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button content="Save" positive onClick={() => {
                            setOpenCostInputModal(false);
                            actions.changeCostInput(modalTitle, costInput);
                        }} />
                        <Button content="Cancel" onClick={() => { setOpenCostInputModal(false) }} />
                    </Modal.Actions>
                </Modal>
                <Grid.Column width={(15) as any}>
                    <ChartSVG ref={svgRef}>
                        <CompareSavingChart
                            chartId={chartId}
                            dimensionWidth={dimensionWidth}
                            dimensionHeight={dimensionHeight}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            maximumCost={maximumCost}
                            maximumSaved={maximumSaved}
                            costMode={costMode}
                            valueToCompare={valueToCompare}
                        // selectedVal={selectedBar}
                        // stripPlotMode={stripPlotMode}
                        // extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>
                    {/* <NotationForm notation={notation} chartId={chartId} /> */}
                    <Message>
                        {`${CostExplain}. The bars are splitted by selected comparison`}
                    </Message>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(CompareSavingChartVisualization));

{/* <Menu.Item fitted onClick={() => { setOpenNotationModal(true) }}>
                            <Icon name="edit" />
                        </Menu.Item> */}

{/* Modal for annotation. */ }
{/**/ }