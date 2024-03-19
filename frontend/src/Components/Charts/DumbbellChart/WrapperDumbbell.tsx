/** @jsxImportSource @emotion/react */
import { Button, ButtonGroup, Grid } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useLayoutEffect, useRef, useState } from "react";
import { DataContext } from "../../../App";
import { bloodComponentOutlierHandler } from "../../../HelperFunctions/CaseListProducer";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { DumbbellDataPoint } from "../../../Interfaces/Types/DataTypes";
import { tokenCheckCancel } from "../../../Interfaces/UserManagement";
import { Basic_Gray, BloodProductCap, postop_color, preop_color } from "../../../Presets/Constants";
import { css } from '@emotion/react';
import DumbbellChart from "./DumbbellChart";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";
import AnnotationForm from "../ChartAccessories/AnnotationForm";
import useDeepCompareEffect from "use-deep-compare-effect";
import ChartStandardButtons from "../ChartStandardButtons";
import { ProcedureStringGenerator } from "../../../HelperFunctions/ProcedureStringGenerator";
import { ChartAccessoryDiv, ChartWrapperContainer } from "../../../Presets/StyledComponents";
import styled from '@emotion/styled';

type Props = {
    xAggregationOption: string;
    chartId: string;
    layoutH: number;
    layoutW: number;
    annotationText: string;
};
const WrapperDumbbell: FC<Props> = ({ annotationText, xAggregationOption, chartId, layoutH, layoutW }) => {
    const hemoData = useContext(DataContext);
    const store = useContext(Store);
    const { proceduresSelection, showZero, rawDateRange } = store.provenanceState;
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
            setHeight(svgRef.current.clientHeight);
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    useDeepCompareEffect(() => {

        let caseCount = 0;
        let tempXMin = Infinity;
        let tempXMax = 0;
        let existingCaseID = new Set();
        let dataOutput: (DumbbellDataPoint | undefined)[] = hemoData.map((ob: any) => {
            const preop_hgb = ob.PREOP_HEMO;
            const postop_hgb = ob.POSTOP_HEMO;
            let yAxisVal;
            yAxisVal = ob[xAggregationOption];
            if (yAxisVal !== undefined && preop_hgb > 0 && postop_hgb > 0 && !existingCaseID.has(ob.CASE_ID)) {
                if ((showZero) || (!showZero && yAxisVal > 0)) {
                    yAxisVal = bloodComponentOutlierHandler(yAxisVal, xAggregationOption);
                    tempXMin = preop_hgb < tempXMin ? preop_hgb : tempXMin;
                    tempXMin = postop_hgb < tempXMin ? postop_hgb : tempXMin;
                    tempXMax = preop_hgb > tempXMax ? preop_hgb : tempXMax;
                    tempXMax = postop_hgb > tempXMax ? postop_hgb : tempXMax;
                    existingCaseID.add(ob.CASE_ID);
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
            return undefined;
        });
        let filteredDataOutput = (dataOutput.filter((d) => d)) as DumbbellDataPoint[];
        store.chartStore.totalIndividualCaseCount = caseCount;
        stateUpdateWrapperUseJSON(data, filteredDataOutput, setData);
        setXMin(tempXMin);
        setXMax(tempXMax);
    }, [rawDateRange, proceduresSelection, hemoData, xAggregationOption, showZero]);

    return <Grid container direction="row" alignItems="center" style={{ height: "100%" }}>
        <Grid item xs={1}>
            <DumbbellUtilTitle >Sort By</DumbbellUtilTitle>
            <ButtonGroup variant="outlined" size="small"
                aria-label="small outlined button group"
                orientation="vertical">
                <Button
                    css={sortMode === "Preop" ? ButtonStyles.preopButtonActive : ButtonStyles.preopButtonOutline}
                    onClick={() => { setSortMode("Preop"); }}>
                    Preop
                </Button>
                <Button
                    css={sortMode === "Postop" ? ButtonStyles.postopButtonActive : ButtonStyles.postopButtonOutline}
                    onClick={() => { setSortMode("Postop"); }}>
                    Postop
                </Button>
                <Button
                    css={sortMode === "Gap" ? ButtonStyles.gapButtonActive : ButtonStyles.gapButtonOutline}
                    onClick={() => { setSortMode("Gap"); }}>
                    Gap
                </Button>
            </ButtonGroup>
            <DumbbellUtilTitle>Show</DumbbellUtilTitle>
            <ButtonGroup size="small" orientation="vertical">
                <Button
                    css={showPreop ? ButtonStyles.preopButtonActive : ButtonStyles.preopButtonOutline}
                    onClick={() => { setShowPreop(!showPreop); }}>
                    Preop
                </Button>
                <Button
                    css={showPostop ? ButtonStyles.postopButtonActive : ButtonStyles.postopButtonOutline}
                    onClick={() => { setShowPostop(!showPostop); }}>
                    Postop
                </Button>
                <Button
                    css={showGap ? ButtonStyles.gapButtonActive : ButtonStyles.gapButtonOutline}
                    onClick={() => { setShowGap(!showGap); }}>
                    Gap
                </Button>
            </ButtonGroup>

        </Grid>
        <Grid item xs={11} style={{ height: "100%" }}>
            <ChartWrapperContainer>
                <ChartAccessoryDiv>
                    Dumbbell Chart
                    <ChartConfigMenu
                        xAggregationOption={xAggregationOption}
                        yValueOption={"HGB_VALUE"}
                        chartTypeIndexinArray={1}
                        chartId={chartId}
                        requireOutcome={false}
                        requireSecondary={false} />
                    <ChartStandardButtons chartID={chartId} />
                </ChartAccessoryDiv>
                <ChartSVG ref={svgRef}>
                    <DumbbellChart data={data} svg={svgRef} showGap={showGap} showPostop={showPostop} showPreop={showPreop} sortMode={sortMode} valueToVisualize={xAggregationOption} dimensionWidth={width} dimensionHeight={height} xMin={xMin} xMax={xMax} />

                </ChartSVG>
                <AnnotationForm chartI={chartId} annotationText={annotationText} />
            </ChartWrapperContainer>
        </Grid>
    </Grid>;
};

export default observer(WrapperDumbbell);


const ButtonStyles = {
    preopButtonActive: css({
        fontSize: "xx-small!important",
        backgroundColor: preop_color,
        color: "white",
        '&:hover': {
            backgroundColor: '#2acc74'
        }
    }),
    postopButtonActive: css({
        fontSize: "xx-small!important",
        backgroundColor: postop_color,
        color: "white",
        '&:hover': {
            backgroundColor: '#2a82cc'
        }
    }),
    gapButtonActive: css({
        fontSize: "xx-small!important",
        backgroundColor: Basic_Gray,
        color: "white",
        '&:hover': {
            backgroundColor: '#7b7b7b'
        }
    }),
    preopButtonOutline: css({
        fontSize: "xx-small!important",
        color: preop_color,
        backgroundColor: "white"
    }),
    postopButtonOutline: css({
        fontSize: "xx-small!important",
        color: postop_color,
        backgroundColor: "white"
    }),
    gapButtonOutline: css({
        fontSize: "xx-small!important",
        color: Basic_Gray,
        backgroundColor: "white"
    })
};

const DumbbellUtilTitle = styled.div({
    width: "max-content",
    padding: "2px",
    fontSize: '0.8rem'
});