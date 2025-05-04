/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  median, min, max, mean, sum,
} from 'd3';
import { create as createpd } from 'pdfast';
import {
  SingleCasePoint, BasicAggregatedDatePoint, ExtraPairPoint,
} from '../Interfaces/Types/DataTypes';
import { processExtraAttributeData } from './ChartDataGenerator';

const outcomeDataGenerate = (aggregatedBy: string, name: string, label: string, data: BasicAggregatedDatePoint[], hemoglobinDataSet: SingleCasePoint[]) => {
  const temporaryDataHolder: any = {};
  const newData = {} as any;
  const caseDictionary = {} as any;
  data.forEach((dataPoint: BasicAggregatedDatePoint) => {
    temporaryDataHolder[dataPoint.aggregateAttribute] = [];
    caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
    newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount };
  });
  hemoglobinDataSet.forEach((ob: any) => {
    if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
      temporaryDataHolder[ob[aggregatedBy]].push(ob[name]);
    }
  });
  for (const [key, value] of Object.entries(temporaryDataHolder)) {
    newData[key].calculated = mean(value as any);
    newData[key].actualVal = sum(value as any);
  }
  return ({
    name, label, data: newData, type: 'Basic',
  }) as ExtraPairPoint;
};

// Generate the data for the extra attribute plot(s) specifically. (Taken from WrapperHeatMap.tsx, to be re-used in CostBarChart.tsx)
export const generateExtraAttributeData = (filteredCases: SingleCasePoint[], yAxisVar: string, outcomeComparison: string | undefined, interventionDate: number | undefined, showZero: boolean, xAxisVar: string) => {
  // Initializing sets for extra attribute data (and second set for outcome comparison)
  const extraAttributeData: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
  const outcomeExtraAttributeData: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};

  // For every case, add it to the correct dataset.
  filteredCases.forEach((singleCase: SingleCasePoint) => {
    // If the case has not been added, initialize it.
    if (!extraAttributeData[singleCase[yAxisVar]]) {
      extraAttributeData[singleCase[yAxisVar]] = {
        aggregateAttribute: singleCase[yAxisVar],
        data: [],
        patientIDList: new Set(),
      };
      outcomeExtraAttributeData[singleCase[yAxisVar]] = {
        aggregateAttribute: singleCase[yAxisVar],
        data: [],
        patientIDList: new Set(),
      };
    }

    // Determine which dataset the case should belong to and add it.
    if ((outcomeComparison && singleCase[outcomeComparison] as number > 0) || (interventionDate && new Date(singleCase.CASE_DATE) < new Date(interventionDate))) {
      outcomeExtraAttributeData[singleCase[yAxisVar]].data.push(singleCase);
      outcomeExtraAttributeData[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
    } else {
      extraAttributeData[singleCase[yAxisVar]].data.push(singleCase);
      extraAttributeData[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
    }
  });

  // Get the case count and data for the temporary and secondary (outcome comparison).
  const [caseCount, extraAttributeChartData] = processExtraAttributeData(extraAttributeData, showZero, xAxisVar as 'PRBC_UNITS' | 'FFP_UNITS' | 'PLT_UNITS' | 'CRYO_UNITS' | 'CELL_SAVER_ML');
  const [secondCaseCount, outcomeAttributeChartData] = processExtraAttributeData(outcomeExtraAttributeData, showZero, xAxisVar as 'PRBC_UNITS' | 'FFP_UNITS' | 'PLT_UNITS' | 'CRYO_UNITS' | 'CELL_SAVER_ML');
  return [caseCount, secondCaseCount, extraAttributeChartData, outcomeAttributeChartData];
};

/**
 * Compute an attribute-wide min and max.
 * @param input - The object to compute the min and max over.
 * @returns The min and max of the object.
 */
function getAttributeMinMax(input: Record<string, number[]>): { attributeMin: number, attributeMax: number } {
  const attributeData = Object.values(input).flat();
  return { attributeMin: min(attributeData)!, attributeMax: max(attributeData)! };
}

export const generateExtrapairPlotData = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: BasicAggregatedDatePoint[]) => {
  const newExtraPairData: ExtraPairPoint[] = [];
  if (extraPairArray.length > 0) {
    extraPairArray.forEach((variable: string) => {
      const newData = {} as any;
      const caseDictionary = {} as any;
      const medianData = {} as any;
      let kdeMaxTemp: any = 0;
      switch (variable) {
        case 'TOTAL_TRANS':
          // let newDataBar = {} as any;
          data.forEach((dataPoint) => {
            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal;
          });
          newExtraPairData.push({
            name: 'TOTAL_TRANS', label: 'Total', data: newData, type: 'BarChart',
          });
          break;
        case 'PER_CASE':
          // let newDataPerCase = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
          });
          newExtraPairData.push({
            name: 'PER_CASE', label: 'Per Case', data: newData, type: 'BarChart',
          });
          break;
        case 'ZERO_TRANS':
          // let newDataPerCase = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = { actualVal: dataPoint.zeroCaseNum, calculated: dataPoint.zeroCaseNum / dataPoint.caseCount, outOfTotal: dataPoint.caseCount };
          });
          newExtraPairData.push({
            name: 'ZERO_TRANS', label: 'Zero %', data: newData, type: 'Basic',
          });
          break;

        case 'DEATH':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'DEATH', 'Death', data, hemoglobinDataSet));
          break;
        case 'VENT':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'VENT', 'Vent', data, hemoglobinDataSet));
          break;
        case 'ECMO':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'ECMO', 'ECMO', data, hemoglobinDataSet));
          break;
        case 'STROKE':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'STROKE', 'Stroke', data, hemoglobinDataSet));
          break;
        case 'AMICAR':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'AMICAR', 'Amicar', data, hemoglobinDataSet));
          break;
        case 'B12':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'B12', 'B12', data, hemoglobinDataSet));
          break;
        case 'TXA':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'TXA', 'TXA', data, hemoglobinDataSet));
          break;
        case 'IRON':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'IRON', 'Iron', data, hemoglobinDataSet));
          break;

        case 'DRG_WEIGHT':
        case 'PREOP_HEMO':
        case 'POSTOP_HEMO': {
          // let newData = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = [];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });
          hemoglobinDataSet.forEach((ob: any) => {
            const resultValue = ob[variable];
            if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
              newData[ob[aggregatedBy]].push(resultValue);
            }
          });

          // Compute the attribute-wide min and max for 'POSTOP_HEMO'
          const { attributeMin, attributeMax } = getAttributeMinMax(newData);

          for (const prop in newData) {
            if (Object.hasOwn(newData, prop)) {
              medianData[prop] = median(newData[prop]);

              // Create the KDE for the attribute using the computed min and max
              let pd = createpd(newData[prop], { width: 2, min: attributeMin, max: attributeMax });
              pd = [{ x: 0, y: 0 }].concat(pd);

              if ((newData[prop] as any).length > 5) {
                kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
              }

              const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
              pd = pd.concat(reversePd);
              newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
            }
          }
          newExtraPairData.push({
            name: variable, label: variable, data: newData, type: 'Violin', medianSet: medianData, kdeMax: kdeMaxTemp,
          });
          break;
        }
        default:
          break;
      }
    });
  }
  return newExtraPairData;
};
