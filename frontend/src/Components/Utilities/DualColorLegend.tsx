import React, {
    FC,
} from "react";
import { inject, observer } from "mobx-react";
import {
    interpolateGreys,
    interpolateReds,
} from "d3";
import { LegendFontSize, third_gray } from "../../PresetsProfile";

interface OwnProps {
    dimensionWidth: number;
}
export type Props = OwnProps;

const DualColorLegend: FC<Props> = ({ dimensionWidth }) => {
    return <g>
        <defs>
            <linearGradient id="gradient1" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                <stop offset="0%" stopColor={interpolateReds(0.1)} />
                <stop offset="50%" stopColor={interpolateReds(0.55)} />
                <stop offset="100%" stopColor={interpolateReds(1)} />
            </linearGradient>
            <linearGradient id="gradient2" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
                <stop offset="0%" stopColor={interpolateGreys(0.25)} />
                <stop offset="50%" stopColor={interpolateGreys(0.525)} />
                <stop offset="100%" stopColor={interpolateGreys(0.8)} />
            </linearGradient>
        </defs>
        <rect
            x={0.7 * (dimensionWidth)}
            y={10}
            width={0.2 * (dimensionWidth)}
            height={7.5}
            fill="url(#gradient1)" />
        <rect
            x={0.7 * (dimensionWidth)}
            y={17.5}
            width={0.2 * (dimensionWidth)}
            height={7.5}
            fill="url(#gradient2)" />
        <text
            x={0.7 * (dimensionWidth)}
            y={17.5}
            alignmentBaseline={"middle"}
            textAnchor={"end"}
            fontSize={LegendFontSize}
            fill={third_gray}>
            0%
        </text>
        <text
            x={0.9 * (dimensionWidth)}
            y={17.5}
            alignmentBaseline={"middle"}
            textAnchor={"start"}
            fontSize={LegendFontSize}
            fill={third_gray}>
            100%
        </text>
        <text
            x={0.8 * (dimensionWidth)}
            y={25}
            alignmentBaseline={"hanging"}
            textAnchor={"middle"}
            fontSize={LegendFontSize}
            fill={third_gray}>
            % out of all patients
        </text>
        <text
            x={0.8 * (dimensionWidth)}
            y={7.5}
            alignmentBaseline={"baseline"}
            textAnchor={"middle"}
            fontSize={LegendFontSize}
            fill={third_gray}>
            % out of patients with 1+ transfusions
        </text>

    </g>
}
export default inject("store")(observer(DualColorLegend));