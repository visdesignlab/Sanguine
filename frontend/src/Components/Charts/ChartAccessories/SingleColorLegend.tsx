import { FC } from "react";
import { interpolateReds } from "d3";
import { Third_Gray } from "../../../Presets/Constants";

type Props = {
    dimensionWidth: number;
}


const SingleColorLegend: FC<Props> = ({ dimensionWidth }) => {
    return <g>
        <defs>
            <linearGradient id="gradient1" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                <stop offset="0%" stopColor={interpolateReds(0.1)} />
                <stop offset="50%" stopColor={interpolateReds(0.55)} />
                <stop offset="100%" stopColor={interpolateReds(1)} />
            </linearGradient>
        </defs>
        <rect
            x={0.7 * (dimensionWidth)}
            y={0}
            width={0.2 * (dimensionWidth)}
            height={16}
            fill="url(#gradient1)" />
        <text
            x={0.7 * (dimensionWidth) - 2}
            y={8}
            alignmentBaseline={"middle"}
            textAnchor={"end"}
            fontSize="11px"
            fill={Third_Gray}>
            0%
        </text>
        <text
            x={0.9 * (dimensionWidth) + 2}
            y={8}
            alignmentBaseline={"middle"}
            textAnchor={"start"}
            fontSize="11px"
            fill={Third_Gray}>
            100%
        </text>
    </g>
}
export default SingleColorLegend;