import { Box, Button, ButtonGroup, Container, Grid, IconButton, Menu, MenuItem } from "@material-ui/core";
import axios from "axios";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DataContext } from "../../../App";
import { bloodComponentOutlierHandler } from "../../../HelperFunctions/CaseListProducer";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { DumbbellDataPoint, SingleCasePoint } from "../../../Interfaces/Types/DataTypes";
import { tokenCheckCancel } from "../../../Interfaces/UserManagement";
import { Basic_Gray, BloodProductCap, postop_color, preop_color } from "../../../Presets/Constants";
import { useButtonStyles, useStyles } from "../../../Presets/StyledComponents";
import React from "react";
import DumbbellChart from "./DumbbellChart";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";

type Props = {
    xAggregationOption: string;
    chartId: string;
    layoutH: number;
    layoutW: number;

}
const WrapperDumbbell: FC<Props> = ({ xAggregationOption, chartId, layoutH, layoutW }) => {
    const hemoData = useContext(DataContext);
    const store = useContext(Store);
    const styles = useStyles();
    const buttonStyles = useButtonStyles();
    const { proceduresSelection, showZero, rawDateRange } = store.state;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [xMin, setXMin] = useState(Infinity);
    const [xMax, setXMax] = useState(0);
    const [sortMode, setSortMode] = useState("Postop");
    const [showPreop, setShowPreop] = useState(true);
    const [showGap, setShowGap] = useState(true);
    const [showPostop, setShowPostop] = useState(true);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null);
    const [data, setData] = useState<DumbbellDataPoint[]>([]);




    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
            // setWidth(w === 1 ? 542.28 : 1146.97)
            setHeight(svgRef.current.clientHeight)
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    useEffect(() => {
        tokenCheckCancel(previousCancelToken);
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call)

        let requestingAxis = xAggregationOption;
        if (!BloodProductCap[xAggregationOption]) {
            requestingAxis = "FFP_UNITS";
        }

        //replace case_ids
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=${requestingAxis}&date_range=${store.dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const transfusionDataResponse = response.data;
            let caseIDSet = new Set();
            let transfused_dict = {} as any;
            transfusionDataResponse.forEach((v: any) => {
                caseIDSet.add(v.case_id);
                transfused_dict[v.case_id] = {
                    transfused: v.transfused_units
                };
            });
            let caseCount = 0;
            let tempXMin = Infinity;
            let tempXMax = 0;
            let existingCaseID = new Set();
            let dataOutput: (DumbbellDataPoint | undefined)[] = hemoData.map((ob: any) => {
                const preop_hgb = ob.PREOP_HGB;
                const postop_hgb = ob.POSTOP_HGB;
                let yAxisVal;
                if (transfused_dict[ob.CASE_ID]) {
                    yAxisVal = BloodProductCap[xAggregationOption] ? transfused_dict[ob.CASE_ID].transfused : ob[xAggregationOption];
                };
                if (yAxisVal !== undefined && preop_hgb > 0 && postop_hgb > 0 && !existingCaseID.has(ob.CASE_ID)) {
                    if ((showZero) || (!showZero && yAxisVal > 0)) {
                        yAxisVal = bloodComponentOutlierHandler(yAxisVal, xAggregationOption)
                        tempXMin = preop_hgb < tempXMin ? preop_hgb : tempXMin;
                        tempXMin = postop_hgb < tempXMin ? postop_hgb : tempXMin;
                        tempXMax = preop_hgb > tempXMax ? preop_hgb : tempXMax;
                        tempXMax = postop_hgb > tempXMax ? postop_hgb : tempXMax;
                        existingCaseID.add(ob.CASE_ID)
                        caseCount++;
                        let new_ob: DumbbellDataPoint = {
                            case: ob,
                            startXVal: preop_hgb,
                            endXVal: postop_hgb,
                            yVal: yAxisVal,
                        };
                        return new_ob;
                    }
                }
            })
            let filteredDataOutput = (dataOutput.filter((d) => d)) as DumbbellDataPoint[];
            store.chartStore.totalIndividualCaseCount = caseCount;
            stateUpdateWrapperUseJSON(data, filteredDataOutput, setData);
            setXMin(tempXMin);
            setXMax(tempXMax);
        }).catch(function (thrown) {
            if (axios.isCancel(thrown)) {
                console.log('Request canceled', thrown.message);
            } else {
                // handle error
            }
        });
    }, [rawDateRange, proceduresSelection, hemoData, xAggregationOption, showZero])

    return <Grid container direction="row" alignItems="center" className={styles.chartWrapper}>
        <Grid item xs={1}>

            <div style={{ width: "max-content", padding: "2px" }}>Sort By</div>
            <ButtonGroup variant="outlined" size="small" orientation="vertical">
                <Button
                    className={sortMode === "Preop" ? buttonStyles.preopButtonActive : buttonStyles.preopButtonOutline}
                    onClick={() => { setSortMode("Preop") }}>
                    Preop
                </Button>
                <Button
                    className={sortMode === "Postop" ? buttonStyles.postopButtonActive : buttonStyles.postopButtonOutline}
                    onClick={() => { setSortMode("Postop") }}>
                    Postop
                </Button>
                <Button
                    className={sortMode === "Gap" ? buttonStyles.gapButtonActive : buttonStyles.gapButtonOutline}
                    onClick={() => { setSortMode("Gap") }}>
                    Gap
                </Button>
            </ButtonGroup>
            <div style={{ width: "max-content", padding: "2px" }}>Show</div>
            <ButtonGroup size="small" orientation="vertical">
                <Button
                    className={showPreop ? buttonStyles.preopButtonActive : buttonStyles.preopButtonOutline}
                    onClick={() => { setShowPreop(!showPreop) }}>
                    Preop
                </Button>
                <Button
                    className={showPostop ? buttonStyles.postopButtonActive : buttonStyles.postopButtonOutline}
                    onClick={() => { setShowPostop(!showPostop) }}>
                    Postop
                </Button>
                <Button
                    className={showGap ? buttonStyles.gapButtonActive : buttonStyles.gapButtonOutline}
                    onClick={() => { setShowGap(!showGap) }}>
                    Gap
                </Button>
            </ButtonGroup>
            <ChartConfigMenu
                xAggregationOption={xAggregationOption}
                yValueOption={"HGB_VALUE"}
                chartTypeIndexinArray={1}
                chartId={chartId}
                requireOutcome={false}
                requireSecondary={false} />
        </Grid>
        <Grid item xs={11} className={styles.chartWrapper}>
            <Container className={styles.chartWrapper}>
                <ChartSVG ref={svgRef}>

                    <DumbbellChart data={data} svg={svgRef} showGap={showGap} showPostop={showPostop} showPreop={showPreop} sortMode={sortMode} valueToVisualize={xAggregationOption} dimensionWidth={width} dimensionHeight={height} xMin={xMin} xMax={xMax} />

                </ChartSVG>
            </Container>
        </Grid>
    </Grid>
}

export default observer(WrapperDumbbell)