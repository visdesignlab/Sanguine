/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import { scaleOrdinal } from 'd3';
import Tooltip from '@mui/material/Tooltip';
import {
  basicGray, secondaryGray, backgroundSelectedColor, backgroundHoverColor,
} from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { usePrivateProvLabel } from '../../Hooks/PrivateModeLabeling';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAxisVar, chartHeight,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { bin: number, indexEnding: number; }[];
  xAxisVar: string;
  chartHeight: number;
}) {
  const store = useContext(Store);

  // Used for keeping track of currently hovered and selected columns for background highlighting.
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[] | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    const sc = scaleOrdinal<any, number>()
      .domain(domain)
      .range(range);

    return sc;
  }, [scaleDomain, scaleRange]);

  // Gets the provider name depending on the private mode setting
  const getLabel = usePrivateProvLabel();

  // Hover handler using the helper function.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      if (selectedColumns && !selectedColumns.includes(columnValue)) {
        setHoveredColumn(columnValue);
      }
      store.interactionStore.hoveredAttribute = [xAxisVar, columnValue];
    }
  };

  // Click handler using the helper function.
  const handleColumnClick = (columnValue: number) => {
    // If the column is already selected, deselect it.
    if (selectedColumns && selectedColumns.includes(columnValue)) {
      // Deselect this column.
      setSelectedColumns((prevSelectedColumns) => prevSelectedColumns?.filter((col) => col !== columnValue) || null);
      store.interactionStore.deselectAttribute([xAxisVar, columnValue]);
      return;
    }
    // Sets the selected column locally (for background highlighting).
    setSelectedColumns((prevSelectedColumns) => [...(prevSelectedColumns || []), columnValue]);

    // Adds all cases matching the selected column to the store's selected case IDs.
    store.interactionStore.addSelectedAttribute([xAxisVar, columnValue]);
  };

  // Update locally selected columns when the store's selected attributes change.
  useEffect(() => {
    const storeAttrs = store.interactionStore.selectedAttributes;
    if (!storeAttrs) {
      setSelectedColumns(null);
    } else {
    // Only keep those attributes that match this axis, pull out their values
      const cols = storeAttrs
        .filter(([attrName]) => attrName === xAxisVar)
        .map(([, value]) => value as number);
      // Set the selected columns to the store's selected attributes
      setSelectedColumns(cols.length > 0 ? cols : null);
    }
  }, [store.interactionStore.selectedAttributes, xAxisVar]);

  return (
    <>
      {numberList.map((numberOb, idx) => {
        const s = scale();
        const x1 = idx === 0
          ? 2 * s(0) - s(1)
          : 1 + s(numberList[idx - 1].indexEnding + 1) - 0.5 * (s(numberList[idx - 1].indexEnding + 1) - s(numberList[idx - 1].indexEnding));

        const x2 = idx === numberList.length - 1
          ? (s.range().at(-1) as number) + 30
          : -1 + s(numberOb.indexEnding) + 0.5 * (s(numberOb.indexEnding + 1) - s(numberOb.indexEnding));

        if (x1 && x2) {
          const binLabel = getLabel(numberOb.bin, xAxisVar);
          return (
            <g
              key={idx}
              onMouseEnter={() => handleColumnHover(numberOb.bin)}
              onMouseLeave={() => {
                setHoveredColumn(null);
                store.interactionStore.clearHoveredAttribute();
              }}
              onClick={() => handleColumnClick(numberOb.bin)}
            >
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
              <CustomAxisColumnBackground
                x={x1}
                width={x2 - x1}
                chartHeight={chartHeight}
                fill={
                  selectedColumns?.includes(numberOb.bin)
                    ? backgroundSelectedColor
                    : hoveredColumn === numberOb.bin
                      ? backgroundHoverColor
                      : idx % 2 === 1
                        ? 'white'
                        : 'black'
                }
                opacity={selectedColumns?.includes(numberOb.bin) || hoveredColumn === numberOb.bin ? 0.5 : 0.05}
              />
              <Tooltip title={binLabel} arrow>
                <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>
                  {binLabel}
                </AxisText>
              </Tooltip>
            </g>
          );
        }
        return null;
      })}
    </>
  );
}

export default observer(CustomizedAxisOrdinal);
