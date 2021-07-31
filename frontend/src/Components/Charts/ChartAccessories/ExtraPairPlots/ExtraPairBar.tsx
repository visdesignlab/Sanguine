import { FC, useCallback } from "react";

import { scaleLinear, max, format, scaleBand } from "d3";
import { ExtraPairWidth } from "../../../../Presets/Constants";
import { observer } from "mobx-react";
import { Tooltip } from "@material-ui/core";


interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
}

export type Props = OwnProps;

const ExtraPairBar: FC<Props> = ({ dataSet, aggregationScaleDomain, aggregationScaleRange, }: Props) => {

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
            {Object.entries(dataSet).map(([val, dataVal]) => {
                return (
                    <Tooltip title={format(".4r")(dataVal)}>
                        <rect
                            x={0}
                            y={aggregationScale()(val)}
                            fill={"#404040"}
                            opacity={0.8}
                            width={valueScale()(dataVal)}
                            height={aggregationScale().bandwidth()} />
                    </Tooltip>
                )
            })}
        </>
    )
}

export default (observer(ExtraPairBar));
