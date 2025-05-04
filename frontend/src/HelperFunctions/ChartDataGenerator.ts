import { sum } from 'd3';
import { HeatMapDataPoint, SingleCasePoint } from '../Interfaces/Types/DataTypes';
import { BloodProductCap } from '../Presets/Constants';
import { BloodComponent } from '../Presets/DataDict';

// Returns the total case count and the output data for .
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processExtraAttributeData = (extraAttributeData: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }>, showZero: boolean, valueToVisualize: BloodComponent) => {
  let totalCaseCount = 0;
  const outputData: HeatMapDataPoint[] = [];

  // For each datapoint ...
  Object.values(extraAttributeData).forEach((computedData) => {
    // Initialize the caseID array and data array.
    const caseIDArray: number[] = [];
    const dataArray: SingleCasePoint[] = computedData.data;
    let zeroNum = 0;

    // Filter data to count zeros if showZero is true.
    zeroNum = dataArray.filter((d) => {
      if (!showZero) {
        if (d[valueToVisualize] > 0) {
          caseIDArray.push(d.CASE_ID);
        }
      } else {
        caseIDArray.push(d.CASE_ID);
      }
      return d[valueToVisualize] === 0;
    }).length;

    // Increase total case count.
    totalCaseCount += caseIDArray.length;

    const countDict: Record<number, SingleCasePoint[]> = {};
    const cap: number = BloodProductCap[valueToVisualize];

    // For CELL_SAVER_ML, use special bucket starting at -1 followed by groups in increments of 100.
    if (valueToVisualize === 'CELL_SAVER_ML') {
      countDict[-1] = [];
      for (let i = 0; i <= cap; i += 100) {
        countDict[i] = [];
      }
    } else {
      // For other components, create groups in single unit increments.
      for (let i = 0; i <= cap; i += 1) {
        countDict[i] = [];
      }
    }

    // Process each data point to assign it to the correct bucket in countDict.
    dataArray.forEach((d: SingleCasePoint) => {
      let transfusionOutput = d[valueToVisualize] as number;
      // Adjust the output for PRBC_UNITS or PLT_UNITS when above 100.
      if (valueToVisualize === 'PRBC_UNITS' && transfusionOutput > 100) {
        transfusionOutput = Math.ceil(d[valueToVisualize] / 1000);
      } else if (transfusionOutput > 100 && valueToVisualize === 'PLT_UNITS') {
        transfusionOutput = (d[valueToVisualize] - 245);
      }

      // For CELL_SAVER_ML, round down to nearest 100 and handle special cases.
      if (valueToVisualize === 'CELL_SAVER_ML') {
        const roundedAnswer = Math.floor(transfusionOutput / 100) * 100;
        if (transfusionOutput === 0) {
          countDict[-1].push(d);
        } else if (roundedAnswer > cap) {
          countDict[cap].push(d);
        } else {
          countDict[roundedAnswer].push(d);
        }
      } else if (transfusionOutput > cap) {
        countDict[cap].push(d);
      } else {
        countDict[transfusionOutput].push(d);
      }
    });

    // Prepare the output data point.
    outputData.push(
      {
        aggregateAttribute: computedData.aggregateAttribute,
        // Sum the total value for the attribute, adjusting for PRBC_UNITS and PLT_UNITS tresholds
        totalVal: sum(dataArray, (d) => {
          if (valueToVisualize === 'PRBC_UNITS' && d[valueToVisualize] > 100) {
            return (d[valueToVisualize] - 999);
          } if (d[valueToVisualize] > 100 && valueToVisualize === 'PLT_UNITS') {
            return (d[valueToVisualize] - 245);
          }
          return (d[valueToVisualize] as number);
        }),
        caseIDList: caseIDArray,
        zeroCaseNum: zeroNum,
        countDict,
        caseCount: dataArray.length,
      },
    );
  });

  return [totalCaseCount, outputData];
};
