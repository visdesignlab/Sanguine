import { sum } from "d3";
import { HeatMapDataPoint, SingleCasePoint } from "../Interfaces/Types/DataTypes";
import { BloodProductCap } from "../Presets/Constants";

export const generateRegularData = (temporaryDataHolder: any[], showZero: boolean, valueToVisualize: string) => {
    let totalCaseCount = 0;
    let outputData: HeatMapDataPoint[] = [];
    Object.values(temporaryDataHolder).forEach((computedData: any) => {

        let caseIDArray: number[] = [];
        let dataArray: SingleCasePoint[] = computedData.data;
        let zeroNum = 0;

        zeroNum = dataArray.filter((d) => {
            if (!showZero) {
                if (d[valueToVisualize] > 0) {
                    caseIDArray.push(d.CASE_ID);
                }
            }
            else {
                caseIDArray.push(d.CASE_ID);
            }
            return d[valueToVisualize] === 0;
        }).length;

        totalCaseCount += caseIDArray.length;

        let countDict = {} as any;
        const cap: number = BloodProductCap[valueToVisualize];

        if (valueToVisualize === "CELL_SAVER_ML") {
            countDict[-1] = [];
            for (let i = 0; i <= cap; i += 100) {
                countDict[i] = [];
            }
        } else {
            for (let i = 0; i <= cap; i++) {
                countDict[i] = [];
            }
        }

        dataArray.forEach((d: SingleCasePoint) => {

            let transfusionOutput = d[valueToVisualize] as number;
            if (valueToVisualize === "PRBC_UNITS" && transfusionOutput > 100) {
                transfusionOutput = Math.ceil(d[valueToVisualize] / 1000);
            } else if (transfusionOutput > 100 && valueToVisualize === "PLT_UNITS") {
                transfusionOutput = (d[valueToVisualize] - 245);
            }

            if (valueToVisualize === "CELL_SAVER_ML") {
                const roundedAnswer = Math.floor(transfusionOutput / 100) * 100;
                if (transfusionOutput === 0) {
                    countDict[-1].push(d);
                }
                else if (roundedAnswer > cap) {
                    countDict[cap].push(d);
                }
                else {
                    countDict[roundedAnswer].push(d);
                }
            } else {
                if (transfusionOutput > cap) {
                    countDict[cap].push(d);
                } else {
                    countDict[transfusionOutput].push(d);
                }
            }

        });

        outputData.push(
            {
                aggregateAttribute: computedData.aggregateAttribute,
                totalVal: sum(dataArray, d => {
                    if (valueToVisualize === "PRBC_UNITS" && d[valueToVisualize] > 100) {
                        return (d[valueToVisualize] - 999);
                    } else if (d[valueToVisualize] > 100 && valueToVisualize === "PLT_UNITS") {
                        return (d[valueToVisualize] - 245);
                    }
                    return (d[valueToVisualize] as number);
                }),
                caseIDList: caseIDArray,
                zeroCaseNum: zeroNum,
                countDict: countDict,
                caseCount: dataArray.length
            }
        );
    });

    return [totalCaseCount, outputData];

};
