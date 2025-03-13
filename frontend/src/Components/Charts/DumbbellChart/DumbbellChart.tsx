import {
  select, median, range, scaleLinear, scaleOrdinal, axisLeft, ScaleOrdinal,
} from 'd3';
import { observer } from 'mobx-react';
import {
  useCallback, useEffect, useState, useContext,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import {
  OffsetDict, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, DumbbellGroupMinimumWidth, largeFontSize, regularFontSize,
  DumbbellMinimumWidth,
} from '../../../Presets/Constants';
import { AcronymDictionary } from '../../../Presets/DataDict';
import { DumbbellLine } from '../../../Presets/StyledSVGComponents';
import CustomizedAxisOrdinal from '../ChartAccessories/CustomizedAxisOrdinal';
import SingleDumbbell from './SingleDumbbell';
import { DumbbellLayoutElement } from '../../../Interfaces/Types/LayoutTypes';

const sortDataHelper = (originalData: DumbbellDataPoint[], sortModeInput: 'preop' | 'postop' | 'gap', xAxisVar: DumbbellLayoutElement['xAxisVar']) => {
  const copyOfData: DumbbellDataPoint[] = JSON.parse(JSON.stringify(originalData));
  const countOfYVals = copyOfData
    .map((surgeryCase) => surgeryCase.yVal)
    .reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  if (originalData.length > 0) {
    copyOfData.sort((a, b) => {
      if (a.yVal === b.yVal) {
        switch (sortModeInput) {
          case 'postop':
            return a.endXVal - b.endXVal;
          case 'preop':
            return a.startXVal - b.startXVal;
          case 'gap':
            return Math.abs(a.endXVal - a.startXVal) - Math.abs(b.endXVal - b.startXVal);
          default:
            return 0;
        }
      } else {
        if (['SURGEON_PROV_ID', 'ANESTH_PROV_ID'].includes(xAxisVar)) {
          // Sort by count of y values, or if equal counts sort by provider name
          return countOfYVals[b.yVal] - countOfYVals[a.yVal] || a.yVal.toString().localeCompare(b.yVal.toString());
        }
        return a.yVal - b.yVal;
      }
    });
    return copyOfData;
  }
  return [];
};

type Props = {
    data: DumbbellDataPoint[];
    xAxisVar: DumbbellLayoutElement['xAxisVar'];
    dimensionWidth: number,
    dimensionHeight: number;
    svg: React.RefObject<SVGSVGElement>;
    xMin: number;
    xMax: number;
    sortMode: 'preop' | 'postop' | 'gap';
    showPreop: boolean;
    showPostop: boolean;
};
function DumbbellChart({
  data, xAxisVar, dimensionHeight, dimensionWidth, svg, xMax, xMin, showPostop, showPreop, sortMode,
}: Props) {
  const [averageForEachTransfused, setAverage] = useState<Record<number | string, { averageStart: number, averageEnd: number }>>({});
  const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([]);
  const [numberList, setNumberList] = useState<{ num: number, indexEnding: number; }[]>([]);
  const [dataPointDict, setDataPointDict] = useState<{ title: number, length: number; }[]>([]);
  const [resultRange, setResultRange] = useState<number[]>([]);
  const [indices, setIndices] = useState([]);

  const store = useContext(Store);
  const { currentSelectSet } = store.provenanceState;

  const currentOffset = OffsetDict.minimum;
  const svgSelection = select(svg.current);
  const showGap = showPostop && showPreop;

  useEffect(() => {
    const tempNumberList: { num: number, indexEnding: number; }[] = [];
    const tempDataPointDict: { title: number, length: number; }[] = [];
    if (data.length > 0) {
      const tempSortedData = sortDataHelper(data, sortMode, xAxisVar);
      let currentPreopSum: number[] = [];
      let currentPostopSum: number[] = [];
      const averageDict: Record<number | string, { averageStart?: number, averageEnd?: number }> = {};
      if (xAxisVar === 'CELL_SAVER_ML') {
        tempSortedData.forEach((d, i) => {
          currentPreopSum.push(d.startXVal);
          currentPostopSum.push(d.endXVal);
          const roundedAnswer = Math.floor(d.yVal / 100) * 100;
          if (i === tempSortedData.length - 1) {
            tempNumberList.push({ num: roundedAnswer, indexEnding: i });
            averageDict[roundedAnswer] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) };
            tempDataPointDict.push({ title: roundedAnswer, length: currentPreopSum.length });
          } else if (roundedAnswer !== (Math.floor(tempSortedData[i + 1].yVal / 100) * 100)) {
            tempNumberList.push({ num: roundedAnswer, indexEnding: i });
            averageDict[(roundedAnswer).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) };
            tempDataPointDict.push({ title: roundedAnswer, length: currentPreopSum.length });
            currentPostopSum = [];
            currentPreopSum = [];
          }
        });
      } else {
        tempSortedData.forEach((d, i) => {
          currentPreopSum.push(d.startXVal);
          currentPostopSum.push(d.endXVal);
          if (i === tempSortedData.length - 1) {
            tempNumberList.push({ num: d.yVal, indexEnding: i });
            averageDict[d.yVal] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) };
            tempDataPointDict.push({ title: d.yVal, length: currentPreopSum.length });
          } else if (d.yVal !== tempSortedData[i + 1].yVal) {
            tempNumberList.push({ num: d.yVal, indexEnding: i });
            averageDict[(d.yVal).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) };
            tempDataPointDict.push({ title: d.yVal, length: currentPreopSum.length });
            currentPostopSum = [];
            currentPreopSum = [];
          }

          if (i === tempSortedData.length - 1) {
            tempNumberList.push({ num: d.yVal + 1, indexEnding: i + 1 });
            averageDict[(d.yVal + 1).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) };
            tempDataPointDict.push({ title: d.yVal, length: currentPreopSum.length });
          }
        });
      }

      const newIndices = range(0, data.length);
      stateUpdateWrapperUseJSON(indices, newIndices, setIndices);
      stateUpdateWrapperUseJSON(averageForEachTransfused, averageDict, setAverage);
      stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData);
      stateUpdateWrapperUseJSON(dataPointDict, tempDataPointDict, setDataPointDict);
      stateUpdateWrapperUseJSON(numberList, tempNumberList, setNumberList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const tempSortedData = sortDataHelper(data, sortMode, xAxisVar);
    stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  useDeepCompareEffect(() => {
    const spacing: Record<number, number> = {};

    let totalWidth = 0;

    dataPointDict.forEach((d, i) => {
      spacing[i] = Math.max(DumbbellGroupMinimumWidth, DumbbellMinimumWidth * d.length);
      totalWidth += spacing[i];
    });

    svg.current?.setAttribute('width', `${totalWidth + currentOffset.left + currentOffset.right - DumbbellGroupMinimumWidth}`);

    let newResultRange: number[] = [];
    let currentLoc = currentOffset.left;
    dataPointDict.forEach((d, i) => {
      const calculatedRange = range(currentLoc, currentLoc + spacing[i], spacing[i] / (d.length + 1));
      calculatedRange.splice(0, 1);
      if (calculatedRange.length !== d.length) {
        calculatedRange.splice(calculatedRange.length - 1, 1);
      }
      newResultRange = newResultRange.concat(calculatedRange);
      currentLoc += spacing[i];
    });
    stateUpdateWrapperUseJSON(resultRange, newResultRange, setResultRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPointDict, dimensionWidth, currentOffset, sortedData]);

  const testValueScale = useCallback(() => scaleLinear()
    .domain([0.9 * xMin, 1.1 * xMax])
    .range([dimensionHeight - currentOffset.bottom, currentOffset.top]), [xMin, xMax, dimensionHeight, currentOffset]);

  const valueScale = useCallback(() => scaleOrdinal()
    .domain(indices)
    .range(resultRange), [indices, resultRange]);

  const testLabel = axisLeft(testValueScale());

  svgSelection
    .select('.axes')
    .select('.x-label')
    .attr('display', null)
    .attr('y', dimensionHeight - currentOffset.bottom + 20)
    .attr('x', 0.5 * (dimensionWidth))
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'hanging')
    .text(
      AcronymDictionary[xAxisVar] ? AcronymDictionary[xAxisVar] : xAxisVar,
    );
  svgSelection.select('.axes')
    .select('.y-axis')
    .attr('transform', `translate(${currentOffset.left}, 0)`)
    .call(testLabel as never)
    .selectAll('text')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize);

  svgSelection
    .select('.axes')
    .select('.y-label')
    .attr('x', -0.5 * dimensionHeight)
    .attr('y', 0)
    .attr('transform', 'rotate(-90)')
    .attr('alignment-baseline', 'hanging')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .text('Hemoglobin Value');

  const decideIfSelectSet = (d: DumbbellDataPoint) => currentSelectSet.length > 0 && !!currentSelectSet.find((selected) => selected.setValues.includes(`${d.case[selected.setName]}`));

  const generateDumbbells = () => sortedData.map((dataPoint, idx) => {
    const xVal = (valueScale() as unknown as ScaleOrdinal<number, number>)(idx);

    if (xVal) {
      return (
        <SingleDumbbell
          xVal={xVal}
          isSelectSet={decideIfSelectSet(dataPoint)}
          dataPoint={dataPoint}
          showGap={showGap}
          showPostop={showPostop}
          showPreop={showPreop}
          circleYValStart={testValueScale()(dataPoint.startXVal)}
          circleYValEnd={testValueScale()(dataPoint.endXVal)}
          key={`dumbbell-${idx}`}
        />
      );
    }
    return null;
  });

  const paddingFromLeft = 5;
  return (
    <>
      <g className="axes">
        <g className="y-axis" />
        <g className="x-axis" transform={`translate(${paddingFromLeft},${dimensionHeight - currentOffset.bottom})`}>
          <CustomizedAxisOrdinal scaleDomain={JSON.stringify(valueScale().domain())} scaleRange={JSON.stringify(valueScale().range())} numberList={numberList} xAxisVar={xAxisVar} />
        </g>
        <text className="y-label" />
        <text className="x-label" />
      </g>
      <g className="chart-comp" transform={`translate(${paddingFromLeft},0)`}>

        <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_HIGH_STANDARD)} y2={testValueScale()(HGB_HIGH_STANDARD)} style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }} />
        <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_LOW_STANDARD)} y2={testValueScale()(HGB_LOW_STANDARD)} style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }} />

        {generateDumbbells()}
        {numberList.map((numberOb, idx) => {
          if (Object.keys(averageForEachTransfused).length > 0) {
            const x1 = idx === 0 ? (valueScale() as unknown as ScaleOrdinal<number, number>)(0) : (valueScale() as unknown as ScaleOrdinal<number, number>)(numberList[idx - 1].indexEnding + 1);
            const x2 = (valueScale() as unknown as ScaleOrdinal<number, number>)(numberOb.indexEnding);
            const beginY = testValueScale()(averageForEachTransfused[(numberOb.num).toString()].averageStart);
            const endY = testValueScale()(averageForEachTransfused[numberOb.num].averageEnd);
            const interval = idx === 0 ? 0 : (valueScale() as unknown as ScaleOrdinal<number, number>)(numberList[idx - 1].indexEnding);
            let interventionLine;
            if (idx >= 1 && numberOb.num <= numberList[idx - 1].num) {
              interventionLine = <line x1={x1 - 0.5 * (x1 - interval)} x2={x1 - 0.5 * (x1 - interval)} y1={currentOffset.top} y2={dimensionHeight - currentOffset.bottom} style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }} />;
            }
            if (x1 && x2) {
              const toReturn = [];
              if (showPreop) {
                toReturn.push(<DumbbellLine x1={x1} x2={x2} y1={beginY} y2={beginY} ispreop key={`db-line-${idx}`} />);
              }
              if (showPostop) {
                toReturn.push(<DumbbellLine x1={x1} x2={x2} y1={endY} y2={endY} ispreop={false} key={`db-line-${idx}-2`} />);
              }
              return ([
                ...toReturn,
                interventionLine,
              ]);
            } return null;
          } return null;
        })}
      </g>
    </>
  );
}
export default observer(DumbbellChart);
