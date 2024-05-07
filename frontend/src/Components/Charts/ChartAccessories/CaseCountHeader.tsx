import { interpolateGreys } from "d3";
import { observer } from "mobx-react";
import { FC, useCallback, useContext } from "react";
import { CaseScaleGenerator } from "../../../HelperFunctions/Scales";
import Store from "../../../Interfaces/Store";
import { CaseRectWidth, DifferentialSquareWidth, largeFontSize, postop_color, preop_color } from "../../../Presets/Constants";

type Props = {
    caseCount: number;
    zeroCaseNum: number;
    yPos: number;
    caseMax: number;
    height: number;
    showComparisonRect: boolean;
    isFalseComparison: boolean;
};

const CaseCountHeader: FC<Props> = ({ showComparisonRect, isFalseComparison, caseCount, yPos, zeroCaseNum, caseMax, height }: Props) => {
    const store = useContext(Store);
    const { showZero } = store.provenanceState;

    const caseScale = useCallback(() => {
        return CaseScaleGenerator(caseMax);
    }, [caseMax]);

    return (<g>
        <rect
            fill={interpolateGreys(caseScale()(store.provenanceState.showZero ? caseCount : (caseCount - zeroCaseNum)))}
            x={-CaseRectWidth - (showComparisonRect ? 10 : 5)}
            y={yPos}
            width={CaseRectWidth}
            height={height}
            strokeWidth={2} />
        {showComparisonRect ?
            <rect
                fill={isFalseComparison ? postop_color : preop_color}
                y={yPos}
                height={height}
                opacity={0.65}
                width={DifferentialSquareWidth}
                x={-10} /> : <></>}
        <text
            fill={caseScale()(store.provenanceState.showZero ? caseCount : (caseCount - zeroCaseNum)) > 0.4 ? "white" : "black"}
            x={-20 - (showComparisonRect ? 5 : 0)}
            y={yPos + 0.5 * height}
            alignmentBaseline={"central"}
            textAnchor={"middle"}
            fontSize={store.configStore.largeFont ? largeFontSize : 12}>
            {showZero ? caseCount : (caseCount - zeroCaseNum)}
        </text>
    </g>);
};

export default observer(CaseCountHeader);