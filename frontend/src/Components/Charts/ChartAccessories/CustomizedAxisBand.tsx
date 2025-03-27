import { useCallback, useContext, useState } from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint } from '../../../Interfaces/Types/DataTypes';

type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;
  chartHeight: number;
  data: ScatterDataPoint[];
};

function CustomizedAxisBand({
  scaleDomain, scaleRange, scalePadding, chartHeight, data,
}: Props) {
  const store = useContext(Store);
  const { hoverStore } = store;

  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  // Add a new handler that updates both the local hoveredColumn state and the store.
  const handleColumnHover = (columnIndex: number | null) => {
    setHoveredColumn(columnIndex);
    if (columnIndex !== null) {
      // Filter the data using dp.xVal because the column represents the x-axis category.
      const pointsInColumn = data.filter((dp: ScatterDataPoint) => dp.xVal === columnIndex);
      // Update the hover store with all case IDs in that column
      store.hoverStore.hoveredCaseIds = pointsInColumn.map(
        (dp: ScatterDataPoint) => dp.case.CASE_ID,
      );
    } else {
      // Clear hovered cases when no column is hovered.
      store.hoverStore.hoveredCaseIds = [];
    }
  };

  return (
    <>
      {scale().domain().map((number, idx) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g
            key={idx}
            onMouseEnter={() => handleColumnHover(idx)}
            onMouseLeave={() => handleColumnHover(null)}
          >
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
            <CustomAxisColumnBackground
              x={x1}
              width={x2 - x1}
              chartHeight={chartHeight}
              fill={hoveredColumn === idx ? hoverStore.backgroundHoverColor : (idx % 2 === 1 ? 'white' : 'black')}
              opacity={hoveredColumn === idx ? 0.5 : 0.05}
            />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
