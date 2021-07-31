import { FC, useCallback } from "react";

import { scaleLinear, max, format, scaleBand } from "d3";
import { ExtraPairWidth } from "../../../../Presets/Constants";
import { observer } from "mobx-react";
import { Tooltip } from "@material-ui/core";


interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    secondaryDataSet?: any[];
}

export type Props = OwnProps;

const ExtraPairBar: FC<Props> = ({ secondaryDataSet, dataSet, aggregationScaleDomain, aggregationScaleRange, }: Props) => {

    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());;
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = useCallback(() => {
        const valueScale = scaleLinear().domain([0, max(Object.values(dataSet))]).range([0, ExtraPairWidth.BarChart])
        return valueScale
    }, [dataSet])

    return (
        <>
            <g transform={`translate(0,${secondaryDataSet ? aggregationScale().bandwidth() * 0.5 : 0})`}>
                {Object.entries(dataSet).map(([val, dataVal]) => {
                    return (
                        <Tooltip title={format(".4r")(dataVal)}>
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale()(dataVal)}
                                height={(secondaryDataSet ? 0.5 : 1) * aggregationScale().bandwidth()} />
                        </Tooltip>
                    )
                })}
            </g>
            <g>
                {secondaryDataSet ? Object.entries(secondaryDataSet).map(([val, dataVal]) => {
                    return (
                        <Tooltip title={format(".4r")(dataVal)}>
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale()(dataVal)}
                                height={aggregationScale().bandwidth() * 0.5} />
                        </Tooltip>
                    )
                }) : <></>}
            </g>
        </>
    )
}

export default (observer(ExtraPairBar));
