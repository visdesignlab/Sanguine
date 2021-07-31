import { FC, useCallback } from "react";
import { scaleLinear, format, interpolateGreys, scaleBand } from "d3";
import { observer } from "mobx-react";
import { Basic_Gray, ExtraPairWidth, greyScaleRange } from "../../../../Presets/Constants";
import { Tooltip } from "@material-ui/core";

interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    name: string;
}

export type Props = OwnProps;

const ExtraPairBasic: FC<Props> = ({ name, dataSet, aggregationScaleRange, aggregationScaleDomain }: Props) => {


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain).map((d: number) => d.toString());
        const range = JSON.parse(aggregationScaleRange);

        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);


    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                return (
                    <g>
                        <Tooltip title={`${dataVal.actualVal}/${dataVal.outOfTotal}`}>
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={!isNaN(dataVal.calculated) ? interpolateGreys(valueScale(dataVal.calculated)) : "white"}
                                opacity={0.8}
                                width={ExtraPairWidth.Basic}
                                height={aggregationScale().bandwidth()} />
                        </Tooltip>
                        <line
                            opacity={!isNaN(dataVal.calculated) ? 0 : 1}
                            y1={0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                            y2={0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                            x1={0.35 * ExtraPairWidth.Basic}
                            x2={0.65 * ExtraPairWidth.Basic}
                            strokeWidth={0.5}
                            stroke={Basic_Gray}
                        />
                        <text x={ExtraPairWidth.Basic * 0.5}
                            y={
                                aggregationScale()(val)! +
                                0.5 * aggregationScale().bandwidth()
                            }
                            opacity={!isNaN(dataVal.calculated) ? 1 : 0}
                            fill={valueScale(dataVal.calculated) > 0.4 ? "white" : "black"}
                            alignmentBaseline={"central"}
                            fontSize="12px"
                            textAnchor={"middle"}>{Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? "<1%" : format(".0%")(dataVal.calculated)}</text>
                    </g>
                )
            })}
        </>
    )
}

export default observer(ExtraPairBasic);
