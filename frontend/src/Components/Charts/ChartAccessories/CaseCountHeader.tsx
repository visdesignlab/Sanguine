import { interpolateGreys } from "d3"
import { observer } from "mobx-react"
import { FC, useCallback, useContext } from "react"
import { CaseScaleGenerator } from "../../../HelperFunctions/Scales"
import Store from "../../../Interfaces/Store"
import { CaseRectWidth } from "../../../Presets/Constants"

type Props = {
    caseCount: number;
    zeroCaseNum: number;
    yPos: number;
    caseMax: number;
    height: number;
}

const CaseCountHeader: FC<Props> = ({ caseCount, yPos, zeroCaseNum, caseMax, height }: Props) => {
    const store = useContext(Store)
    const { showZero } = store.state;

    const caseScale = useCallback(() => {
        return CaseScaleGenerator(caseMax)
    }, [caseMax])

    return <g> <rect
        fill={interpolateGreys(caseScale()(store.state.showZero ? caseCount : (caseCount - zeroCaseNum)))}
        x={-CaseRectWidth - 5}
        y={yPos}
        width={CaseRectWidth}
        height={height}
        // stroke={decideSinglePatientSelect(dataPoint) ? highlight_orange : "none"}
        strokeWidth={2}
    />
        <text
            fill={caseScale()(store.state.showZero ? caseCount : (caseCount - zeroCaseNum)) > 0.4 ? "white" : "black"}
            x={-20}
            y={
                yPos +
                0.5 * height
            }
            alignmentBaseline={"central"}
            textAnchor={"middle"}
            fontSize="12px"
        >
            {showZero ? caseCount : (caseCount - zeroCaseNum)}
        </text>
    </g>
}

export default observer(CaseCountHeader)