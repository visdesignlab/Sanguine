import { HeatMapDataPoint, Surgery } from '../Interfaces/Types/DataTypes';
import { BloodProductCap } from '../Presets/Constants';
import { BloodComponent } from '../Presets/DataDict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateRegularData = (temporaryDataHolder: Record<string | number, { data: Surgery[], aggregateAttribute: string | number, patientIDList: Set<number> }>, showZero: boolean, valueToVisualize: BloodComponent) => {
  let totalCaseCount = 0;
  const outputData: HeatMapDataPoint[] = [];
  Object.values(temporaryDataHolder).forEach((computedData) => {
    const caseIDArray: string[] = [];
    const dataArray = computedData.data;
    let zeroNum = 0;

    totalCaseCount += caseIDArray.length;

    const countDict: Record<number, Surgery[]> = {};
    const cap: number = BloodProductCap[valueToVisualize];

    if (valueToVisualize === 'cell_saver_ml') {
      countDict[-1] = [];
      for (let i = 0; i <= cap; i += 100) {
        countDict[i] = [];
      }
    } else {
      for (let i = 0; i <= cap; i += 1) {
        countDict[i] = [];
      }
    }

    dataArray.forEach((d) => {
      const sumTransfusion = d.transfusions.reduce((acc, transfusion) => {
        let value = transfusion[valueToVisualize] || 0;
        if (valueToVisualize === 'rbc_units' && value > 100) {
          value -= 999;
        } if (valueToVisualize === 'plt_units' && value > 100) {
          value -= 245;
        }
        // eslint-disable-next-line no-param-reassign
        acc += value;
        return acc;
      }, 0);
      if (!showZero) {
        if (sumTransfusion > 0) {
          caseIDArray.push(d.case_id);
        }
      } else {
        caseIDArray.push(d.case_id);
      }
      zeroNum += sumTransfusion === 0 ? 1 : 0;

      let transfusionOutput = sumTransfusion as number;
      if (valueToVisualize === 'rbc_units' && transfusionOutput > 100) {
        transfusionOutput = Math.ceil(sumTransfusion / 1000);
      } else if (transfusionOutput > 100 && valueToVisualize === 'plt_units') {
        transfusionOutput = (sumTransfusion - 245);
      }

      if (valueToVisualize === 'cell_saver_ml') {
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

    outputData.push(
      {
        aggregateAttribute: computedData.aggregateAttribute,
        totalVal: -2,
        caseIDList: caseIDArray,
        zeroCaseNum: zeroNum,
        countDict,
        caseCount: dataArray.length,
      },
    );
  });

  return [totalCaseCount, outputData];
};
