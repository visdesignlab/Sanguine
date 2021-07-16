import { format, interpolateGreys, interpolateReds, scaleBand } from "d3";
import { FC, useCallback } from "react";
import { HeatmapColorScale, HeatmapGreyScale, ValueScaleGeneratorFromDomainRange } from "../../../HelperFunctions/Scales";
import { HeatMapDataPoint } from "../../../Interfaces/Types/DataTypes";
import { Basic_Gray } from "../../../Presets/Constants";
import { HeatMapRect } from "../../../Presets/StyledSVGComponents";

type Props = {
    valueScaleDomain: string;
    valueScaleRange: string;
    showZero: boolean;
    dataPoint: HeatMapDataPoint;
    howToTransform: string;
    bandwidth: number;
}
const SingleHeatRow: FC<Props> = ({ dataPoint, valueScaleDomain, valueScaleRange, showZero, howToTransform, bandwidth }: Props) => {

    const valueScale = useCallback(() => {
        return ValueScaleGeneratorFromDomainRange(valueScaleDomain, valueScaleRange)
    }, [valueScaleDomain, valueScaleRange]);

    return (
        <>
            {valueScale().domain().map(point => {
                if (dataPoint.countDict[point]) {
                    const output = dataPoint.countDict[point].length
                    const caseCount = showZero ? dataPoint.caseCount : dataPoint.caseCount - dataPoint.zeroCaseNum
                    // let content = output/caseCount
                    let disables = false;
                    let colorFill = output === 0 ? "white" : interpolateReds(HeatmapColorScale(output / caseCount))
                    if (!showZero && point as any === 0) {
                        colorFill = output === 0 ? "white" : interpolateGreys(HeatmapGreyScale(output / (dataPoint.caseCount)))
                        disables = true;
                        /// content = output/dataPoint.caseCount
                    }

                    const outputContent = (output / caseCount < 0.01 && output > 0) ? "<1%" : format(".0%")(output / caseCount)

                    return (
                        [
                            // <Popup content={outputContent}
                            //     key={dataPoint.aggregateAttribute + '-' + point}
                            //     disabled={disables || caseCount === 0}
                            //     trigger={
                            //         <HeatRect
                            //             fill={colorFill}
                            //             x={valueScale()(point)}
                            //             transform={howToTransform}
                            //             width={valueScale().bandwidth()}
                            //             height={bandwidth}
                            //             isselected={isSelected}
                            //             //   isfiltered={isFiltered}
                            //             onClick={(e) => {
                            //                 actions.updateBrushPatientGroup(dataPoint.countDict[point], e.shiftKey ? "ADD" : "REPLACE", {
                            //                     setName: aggregatedBy,
                            //                     setValues: [dataPoint.aggregateAttribute],
                            //                     //setPatientIds: [dataPoint.patientIDList]
                            //                 })

                            //             }} />}
                            // />
                            <g>
                                <HeatMapRect
                                    fill={colorFill}
                                    x={valueScale()(point)}
                                    transform={howToTransform}
                                    width={valueScale().bandwidth()}
                                    height={bandwidth}

                                //  isselected={isSelected}
                                //   isfiltered={isFiltered}
                                // onClick={(e) => {
                                //     actions.updateBrushPatientGroup(dataPoint.countDict[point], e.shiftKey ? "ADD" : "REPLACE", {
                                //         setName: aggregatedBy,
                                //         setValues: [dataPoint.aggregateAttribute],
                                //         //setPatientIds: [dataPoint.patientIDList]
                                //     })
                                //}} 
                                />
                                <text>
                                    <tspan className="tooltiptext"
                                        x={valueScale()(point)}
                                        transform={howToTransform}>
                                        {outputContent}
                                    </tspan>
                                </text>
                            </g>
                            ,
                            <line transform={howToTransform}
                                strokeWidth={0.5}
                                stroke={Basic_Gray}
                                opacity={output === 0 ? 1 : 0}
                                y1={0.5 * bandwidth}
                                y2={0.5 * bandwidth}
                                x1={valueScale()(point)! + 0.35 * valueScale().bandwidth()}
                                x2={valueScale()(point)! + 0.65 * valueScale().bandwidth()} />]
                    )
                } else {
                    return <></>
                }
            })}
        </>
    )
}

export default SingleHeatRow