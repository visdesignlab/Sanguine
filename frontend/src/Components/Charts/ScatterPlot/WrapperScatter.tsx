import { observer } from "mobx-react";
import { FC, useContext, useLayoutEffect, useRef, useState } from "react";
import { DataContext } from "../../../App";
import Store from "../../../Interfaces/Store";
import { ScatterDataPoint, SingleCasePoint } from "../../../Interfaces/Types/DataTypes";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";
import { ChartSVG } from "../../../Presets/StyledSVGComponents";
import ScatterPlot from "./ScatterPlot";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import axios from "axios";
import useDeepCompareEffect from "use-deep-compare-effect";
import AnnotationForm from "../ChartAccessories/AnnotationForm";
import ChartStandardButtons from "../ChartStandardButtons";
import { ProcedureStringGenerator } from "../../../HelperFunctions/ProcedureStringGenerator";
import { ChartWrapperContainer } from "../../../Presets/StyledComponents";
import styled from "@emotion/styled";
import { Basic_Gray } from "../../../Presets/Constants";

type Props = {
    yValueOption: string;
    xAggregationOption: string;
    chartId: string;
    layoutW: number;
    layoutH: number;
    annotationText: string;
};
const WrapperScatter: FC<Props> = ({ annotationText, yValueOption, xAggregationOption, chartId, layoutW, layoutH }: Props) => {

    const hemoData = useContext(DataContext);
    const store = useContext(Store);

    const { proceduresSelection, showZero, rawDateRange } = store.state;

    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(layoutW === 1 ? 542.28 : 1146.97);
    const [height, setHeight] = useState(0);
    const [data, setData] = useState<ScatterDataPoint[]>([]);
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(0);
    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(0);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null);

    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
            setHeight(svgRef.current.clientHeight);
        }
    }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

    useDeepCompareEffect(() => {
        if (previousCancelToken) {
            previousCancelToken.cancel("cancel the call?");
        }

        let transfused_dict = {} as any;
        const cancelToken = axios.CancelToken;
        const call = cancelToken.source();
        setPreviousCancelToken(call);


        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=${xAggregationOption}&date_range=${store.dateRange}&filter_selection=${ProcedureStringGenerator(proceduresSelection)}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        })
            .then(function (response) {
                const transfusedDataResult = response.data;
                transfusedDataResult.forEach((element: any) => {
                    transfused_dict[element.case_id] = {
                        transfused: element.transfused_units || 0
                    };
                });
                let tempYMax = 0;
                let tempYMin = Infinity;
                let tempXMin = Infinity;
                let tempXMax = 0;
                if (hemoData) {
                    let castData: any[] = hemoData.map((ob: SingleCasePoint) => {

                        const yValue = yValueOption === "PREOP_HEMO" ? ob.PREOP_HEMO : ob.POSTOP_HEMO;
                        let xValue;
                        if (transfused_dict[ob.CASE_ID]) {
                            xValue = transfused_dict[ob.CASE_ID].transfused;
                        };

                        if ((yValue && showZero && transfused_dict[ob.CASE_ID]) || (!showZero && yValue && xValue > 0)) {
                            if ((xValue > 100 && xAggregationOption === "PRBC_UNITS")) {
                                xValue -= 999;
                            }
                            if ((xValue > 100 && xAggregationOption === "PLT_UNITS")) {
                                xValue -= 245;
                            }
                            tempYMin = yValue < tempYMin ? yValue : tempYMin;
                            tempYMax = yValue > tempYMax ? yValue : tempYMax;
                            tempXMin = xValue < tempXMin ? xValue : tempXMin;
                            tempXMax = xValue > tempXMax ? xValue : tempXMax;
                            let new_ob: ScatterDataPoint = {
                                xVal: xValue,
                                yVal: yValue,
                                randomFactor: Math.random(),
                                case: ob
                            };
                            return new_ob;
                            //}
                        } else { return undefined; }
                    });

                    castData = castData.filter((d: any) => d);

                    store.chartStore.totalIndividualCaseCount = castData.length;
                    stateUpdateWrapperUseJSON(data, castData, setData);
                    setXMax(tempXMax);
                    setXMin(tempXMin);
                    setYMax(tempYMax);
                    setYMin(tempYMin);
                }
            })
            .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    // handle error
                }
            });
    }, [rawDateRange, proceduresSelection, hemoData, showZero, yValueOption, xAggregationOption]);

    return (<ChartWrapperContainer>
        <ChartAccessoryDiv>
            Scatterplot
            <ChartConfigMenu
                xAggregationOption={xAggregationOption}
                yValueOption={yValueOption}
                chartTypeIndexinArray={2}
                chartId={chartId}
                requireOutcome={false}
                requireSecondary={true} />
            <ChartStandardButtons chartID={chartId} />
        </ChartAccessoryDiv>
        <ChartSVG ref={svgRef}>
            <ScatterPlot
                xAggregationOption={xAggregationOption}
                xMax={xMax}
                xMin={xMin}
                yMax={yMax}
                yMin={yMin}
                yValueOption={yValueOption}
                data={data}
                width={width}
                height={height}
                svg={svgRef} />
        </ChartSVG>
        <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </ChartWrapperContainer>);
};
export default observer(WrapperScatter);

const ChartAccessoryDiv = styled.div({
    textAlign: "right",
    color: Basic_Gray
});