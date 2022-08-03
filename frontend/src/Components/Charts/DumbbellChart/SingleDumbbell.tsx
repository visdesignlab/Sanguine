/** @jsxImportSource @emotion/react */
import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { FC } from "react";
import { DumbbellDataPoint } from "../../../Interfaces/Types/DataTypes";
import { allCss } from "../../../Presets/StyledComponents";
import { DumbbellCircle, DumbbellRect } from "../../../Presets/StyledSVGComponents";


type Props = {
    xVal: number;
    dataPoint: DumbbellDataPoint;
    isSelectSet: boolean;
    showPreop: boolean;
    showPostop: boolean;
    showGap: boolean;
    circleYValStart: number;
    circleYValEnd: number;
};

const SingleDumbbell: FC<Props> = ({ xVal, dataPoint, isSelectSet, showGap, showPostop, showPreop, circleYValStart, circleYValEnd }: Props) => {
    const clickDumbbellHandler = (d: DumbbellDataPoint) => {
        console.log(d);
    };
    const yValCalculation = circleYValStart > circleYValEnd ? circleYValEnd : circleYValStart;
    const rectHeight = Math.abs(circleYValStart - circleYValEnd);
    return (
        <Tooltip
            title={<div css={allCss.tooltipFont}>{`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}</div>}
            arrow
            placement="top">
            <g >
                <DumbbellRect
                    x={xVal - 1}
                    y={yValCalculation}
                    height={rectHeight}
                    isselected={isSelectSet}
                    display={showGap ? undefined : "none"}
                />
                <DumbbellCircle
                    cx={xVal}
                    cy={circleYValStart}
                    onClick={() => {
                        clickDumbbellHandler(dataPoint);
                    }}
                    isSelectSet={isSelectSet}
                    ispreop={true}
                    display={showPreop ? undefined : "none"}
                />
                <DumbbellCircle
                    cx={
                        xVal
                    }
                    cy={circleYValEnd}
                    onClick={() => {
                        clickDumbbellHandler(dataPoint);
                    }}
                    isSelectSet={isSelectSet}
                    ispreop={false}
                    display={showPostop ? undefined : "none"}
                />
            </g>
        </Tooltip>);
};

export default observer(SingleDumbbell);