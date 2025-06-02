import { BasicAggregatedDataPoint } from '../Interfaces/Types/DataTypes';

export const sortHelper = (data: BasicAggregatedDataPoint[], xAxisVar: string, showZero: boolean, secondaryData?: BasicAggregatedDataPoint[]) => {
  let newCaseMax = 0;
  let dataXVals: string[] = [];
  if (secondaryData) {
    const dataToObj: Record<string, number> = {};

    secondaryData.forEach((d) => {
      const calcualtedCaseCount = d.caseCount - (showZero ? 0 : d.zeroCaseNum);
      dataToObj[d.aggregateAttribute] = calcualtedCaseCount;
      newCaseMax = newCaseMax > calcualtedCaseCount ? newCaseMax : calcualtedCaseCount;
      dataXVals.push(d.aggregateAttribute);
    });
    data.forEach((d) => {
      const calcualtedCaseCount = d.caseCount - (showZero ? 0 : d.zeroCaseNum);
      if (dataToObj[d.aggregateAttribute]) {
        dataToObj[d.aggregateAttribute] += calcualtedCaseCount;
      } else {
        dataToObj[d.aggregateAttribute] = calcualtedCaseCount;
        dataXVals.push(d.aggregateAttribute);
      }
      newCaseMax = newCaseMax > calcualtedCaseCount ? newCaseMax : calcualtedCaseCount;
    });
    dataXVals.sort((a, b) => {
      if (xAxisVar === 'YEAR') {
        return parseInt(a, 10) - parseInt(b, 10);
      }
      return dataToObj[a] - dataToObj[b];
    });
  } else {
    dataXVals = data.sort((a, b) => {
      if (xAxisVar === 'YEAR') {
        return a.aggregateAttribute - b.aggregateAttribute;
      }
      if (showZero) { return a.caseCount - b.caseCount; }
      return (a.caseCount - a.zeroCaseNum) - (b.caseCount - b.zeroCaseNum);
    }).map((dp) => {
      newCaseMax = newCaseMax > dp.caseCount ? newCaseMax : dp.caseCount;
      return dp.aggregateAttribute;
    });
  }
  return [dataXVals, newCaseMax] as [string[], number];
};
