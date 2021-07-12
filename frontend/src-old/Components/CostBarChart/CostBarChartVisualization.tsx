import React, { FC, useEffect, useRef, useLayoutEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { CostBarChartDataPoint } from '../../Interfaces/ApplicationState'
import { barChartValuesOptions, barChartAggregationOptions, ChartSVG, AcronymDictionary, CostExplain } from "../../PresetsProfile"
import { Grid, Dropdown, Menu, Button, Form, Modal, Message, Checkbox } from "semantic-ui-react";
import { sum } from "d3";
import axios from 'axios'
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import CostBarChart from "./CostBarChart";

interface OwnProps {
    aggregatedBy: string;
    // valueToVisualize: string;
    chartId: string;
    store?: Store;
    chartIndex: number;
    //  extraPair?: string;
    hemoglobinDataSet: any;
    notation: string;
    w: number
}

export type Props = OwnProps;

const CostBarChartVisualization: FC<Props> = ({ w, notation, hemoglobinDataSet, aggregatedBy, chartId, store, chartIndex }: Props) => {
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
        CostBarChartDataPoint[]
    >([]);

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
                                PRBC_UNITS: 0,
                                FFP_UNITS: 0,
                                CRYO_UNITS: 0,
                                PLT_UNITS: 0,
                                CELL_SAVER_ML: 0,
                                caseNum: 0,
                                SALVAGE_USAGE: 0
                            }
                        }
                        temporaryDataHolder[singleCase[aggregatedBy]].PRBC_UNITS += singleCase.PRBC_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].FFP_UNITS += singleCase.FFP_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].CRYO_UNITS += singleCase.CRYO_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].PLT_UNITS += singleCase.PLT_UNITS;
                        temporaryDataHolder[singleCase[aggregatedBy]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
                        temporaryDataHolder[singleCase[aggregatedBy]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0)
                        temporaryDataHolder[singleCase[aggregatedBy]].caseNum += 1
                    }
                })

                Object.values(temporaryDataHolder).forEach((dataItem: any) => {
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
                    // const sum_cost = sum(newDataObj.dataArray) 
                    const sum_cost = sum(newDataObj.dataArray) + (costMode ? (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0)
                    tempmaxCost = tempmaxCost > sum_cost ? tempmaxCost : sum_cost
                    const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4])
                    if (costMode && !isNaN(costSaved)) {
                        tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
                    }
                    outputData.push(newDataObj)
                })
                stateUpdateWrapperUseJSON(data, outputData, setData);
                setMinCost(tempMinCost)
                setMaximumCost(tempmaxCost)
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
        setShowPotential(false)
        console.log(costMode)
    }

    const openCostInputForm = (e: any, value: any) => {
        setModalTitle(value.value);
        setCostInput(BloodProductCost[value.value])
        console.log(costInput)
        setOpenCostInputModal(true);


    }

    const report = (e: any, value: any) => {
        setShowPotential(value.checked)
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
                        <CostBarChart
                            chartId={chartId}
                            dimensionWidth={dimensionWidth}
                            dimensionHeight={dimensionHeight}
                            data={data}
                            svg={svgRef}
                            aggregatedBy={aggregatedBy}
                            maximumCost={maximumCost}
                            maxSavedNegative={maximumSavedNegative}
                            costMode={costMode}
                            showPotential={showPotential}
                        // selectedVal={selectedBar}
                        // stripPlotMode={stripPlotMode}
                        // extraPairDataSet={extraPairData}
                        />
                    </ChartSVG>
                    {/* <NotationForm notation={notation} chartId={chartId} /> */}
                    <Message>
                        <p>{CostExplain}</p>
                        <Checkbox label="Show potential RBC cost without cell salvage" onChange={report} checked={showPotential} disabled={!costMode} />
                    </Message>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}


export default inject("store")(observer(CostBarChartVisualization));