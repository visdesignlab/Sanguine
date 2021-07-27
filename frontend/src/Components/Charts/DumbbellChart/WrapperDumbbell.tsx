import axios from "axios";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DataContext } from "../../../App";
import Store from "../../../Interfaces/Store";
import { tokenCheckCancel } from "../../../Interfaces/UserManagement";

type Props = {
    xAggregationOption: string;
    yValueOption: string;
    chartId: string;
    chartTypeIndexArray: number;
    layoutH: number;
    layoutW: number;

}
const WrapperDumbbell: FC<Props> = ({ xAggregationOption, yValueOption, chartId, chartTypeIndexArray, layoutH, layoutW }) => {
    const hemoData = useContext(DataContext);
    const store = useContext(Store);
    const { proceduresSelection } = store.state;
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [previousCancelToken, setPreviousCancelToken] = useState<any>(null)

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

        //replace case_ids
        axios.get(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=${yValueOption}&date_range=${store.dateRange}&filter_selection=${proceduresSelection.toString()}&case_ids=${[].toString()}`, {
            cancelToken: call.token
        }).then(function (response) {
            const transfusionDataResponse = response.data;
            let caseIDSet = new Set();
            transfusionDataResponse.forEach((v: any) => {
                caseIDSet.add(v.case_id);

            })
        })
    })

    return <></>
}

export default observer(WrapperDumbbell)