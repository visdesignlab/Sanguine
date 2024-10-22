import { observer } from 'mobx-react';
import {
  useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { VegaLite } from 'react-vega';
import HelpIcon from '@mui/icons-material/Help';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import {
  FormControl, Tooltip, Switch, IconButton, Menu, MenuItem, Stack,
} from '@mui/material';
import { scaleBand } from 'd3';
import useDeepCompareEffect from 'use-deep-compare-effect';
import {
  BloodProductCap, ExtraPairPadding, ExtraPairWidth, MIN_HEATMAP_BANDWIDTH, OffsetDict, postopColor, preopColor,
} from '../../Presets/Constants';
import { AcronymDictionary, BloodComponentOptions } from '../../Presets/DataDict';
import { ChartWrapperContainer, ChartAccessoryDiv } from '../../Presets/StyledComponents';
import AnnotationForm from './ChartAccessories/AnnotationForm';
import CostInputDialog from '../Modals/CostInputDialog';
import ChartConfigMenu from './ChartAccessories/ChartConfigMenu';
import ExtraPairButtons from './ChartAccessories/ExtraPairButtons';
import ChartStandardButtons from './ChartStandardButtons';
import Store from '../../Interfaces/Store';
import GeneratorExtraPair from './ChartAccessories/ExtraPairPlots/GeneratorExtraPair';
import { generateExtrapairPlotData } from '../../HelperFunctions/ExtraPairDataGenerator';
import { stateUpdateWrapperUseJSON } from '../../Interfaces/StateChecker';
import { CostBarChartDataPoint, SingleCasePoint } from '../../Interfaces/Types/DataTypes';
import { sortHelper } from '../../HelperFunctions/ChartSorting';
import ComparisonLegend from './ChartAccessories/ComparisonLegend';

type TempDataItem = {
  aggregateAttribute: string | number;
  PRBC_UNITS: number;
  FFP_UNITS: number;
  CRYO_UNITS: number;
  PLT_UNITS: number;
  CELL_SAVER_ML: number;
  caseNum: number;
  SALVAGE_USAGE: number;
  caseIDList: Set<number>;
};

type CostBarDataPoint = {
  rowLabel: string;
  value: number;
  bloodProduct: string;
};

type Props = {
  xAggregationOption: keyof typeof BloodProductCap;
  chartId: string;
  annotationText: string;
  layoutW: number;
  layoutH: number;
  comparisonOption?: keyof typeof AcronymDictionary;
  extraPairArrayString: string;
};

function WrapperCostBar({
  annotationText, extraPairArrayString, xAggregationOption, chartId, layoutH, layoutW, comparisonOption,
}: Props) {
  const store = useContext(Store);
  const { filteredCases } = store;
  const {
    proceduresSelection,
    BloodProductCost,
    currentOutputFilterSet,
    rawDateRange,
  } = store.provenanceState;

  const chartDiv = useRef<HTMLDivElement>(null);
  const [vegaHeight, setVegaHeight] = useState(0);
  const [dimensionHeight, setDimensionHeight] = useState(0);
  const [dimensionWidth, setDimensionWidth] = useState(0);
  useLayoutEffect(() => {
    if (chartDiv.current) {
      setDimensionHeight(chartDiv.current.clientHeight);
      setDimensionWidth(chartDiv.current.clientWidth - 10);
    }
  }, [layoutH, layoutW, store.mainCompWidth, chartDiv]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.target.firstElementChild?.clientHeight || 0;
        setVegaHeight(height);
      }
    });
    const target = chartDiv.current?.querySelector('.vega-vis');
    if (target) {
      resizeObserver.observe(target);
    }
    return () => {
      if (target) {
        resizeObserver.unobserve(target);
      }
    };
  }, [xAggregationOption, layoutH, layoutW, store.mainCompWidth, chartDiv]);

  // Bar click listener
  const barClick = (eventType: string, clickedElement: CostBarDataPoint) => {
    store.selectionStore.selectSet(xAggregationOption, clickedElement.rowLabel[0].toString(), true);
  };

  const [showPotential, setShowPotential] = useState(false);
  const [bloodCostToChange, setBloodCostToChange] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openCostInputDialog, setOpenCostInputDialog] = useState(false);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const [data, setData] = useState<CostBarChartDataPoint[]>([]);
  const [secondaryData, setSecondaryData] = useState<CostBarChartDataPoint[]>([]);
  const plotData = useMemo(() => {
    const plotDataTemp = {
      values: data
        .flatMap((d) => ([
          showPotential ? {
            rowLabel: d.aggregateAttribute, value: d.cellSalvageVolume * -0.004 * BloodProductCost.PRBC_UNITS, bloodProduct: 'savings', order: 0,
          } : null,
          {
            rowLabel: d.aggregateAttribute, value: d.PRBC_UNITS, bloodProduct: 'PRBC', type: 'false',
          },
          {
            rowLabel: d.aggregateAttribute, value: d.FFP_UNITS, bloodProduct: 'FFP', type: 'false',
          },
          {
            rowLabel: d.aggregateAttribute, value: d.CRYO_UNITS, bloodProduct: 'CRYO', type: 'false',
          },
          {
            rowLabel: d.aggregateAttribute, value: d.PLT_UNITS, bloodProduct: 'PLT', type: 'false',
          },
          {
            rowLabel: d.aggregateAttribute, value: d.CELL_SAVER_ML, bloodProduct: 'CELL_SAVER', type: 'false',
          },
        ]))
        .filter((d) => d !== null),
    };
    if (secondaryData.length > 0) {
      plotDataTemp.values = plotDataTemp.values.concat(
        secondaryData
          .flatMap((d) => ([
            {
              rowLabel: d.aggregateAttribute, value: d.PRBC_UNITS, bloodProduct: 'PRBC', type: 'true',
            },
            {
              rowLabel: d.aggregateAttribute, value: d.FFP_UNITS, bloodProduct: 'FFP', type: 'true',
            },
            {
              rowLabel: d.aggregateAttribute, value: d.CRYO_UNITS, bloodProduct: 'CRYO', type: 'true',
            },
            {
              rowLabel: d.aggregateAttribute, value: d.PLT_UNITS, bloodProduct: 'PLT', type: 'true',
            },
            {
              rowLabel: d.aggregateAttribute, value: d.CELL_SAVER_ML, bloodProduct: 'CELL_SAVER', type: 'true',
            },
          ])),
      );
    }
    return plotDataTemp;
  }, [BloodProductCost.PRBC_UNITS, data, secondaryData, showPotential]);

  const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
  useEffect(() => {
    if (extraPairArrayString) {
      stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPairArrayString]);
  const extraPairData = useMemo(() => generateExtrapairPlotData(xAggregationOption, filteredCases, extraPairArray, data), [xAggregationOption, filteredCases, extraPairArray, data]);
  const secondaryExtraPairData = generateExtrapairPlotData(xAggregationOption, filteredCases, extraPairArray, secondaryData);
  const extraPairTotalWidth = useMemo(() => extraPairData.map((pair) => ExtraPairWidth[pair.type] + ExtraPairPadding).reduce((a, b) => a + b, 0), [extraPairData]);

  const makeDataObj = (dataItem: TempDataItem) => {
    const newDataObj: CostBarChartDataPoint = {
      aggregateAttribute: dataItem.aggregateAttribute,
      PRBC_UNITS: ((dataItem.PRBC_UNITS * (BloodProductCost.PRBC_UNITS)) / dataItem.caseNum) || 0,
      FFP_UNITS: ((dataItem.FFP_UNITS * (BloodProductCost.FFP_UNITS)) / dataItem.caseNum) || 0,
      PLT_UNITS: ((dataItem.PLT_UNITS * (BloodProductCost.PLT_UNITS)) / dataItem.caseNum) || 0,
      CRYO_UNITS: ((dataItem.CRYO_UNITS * (BloodProductCost.CRYO_UNITS)) / dataItem.caseNum) || 0,
      CELL_SAVER_ML: ((dataItem.SALVAGE_USAGE * BloodProductCost.CELL_SAVER_ML) / dataItem.caseNum) || 0,
      caseCount: dataItem.caseNum,
      cellSalvageUsage: (dataItem.SALVAGE_USAGE / dataItem.caseNum) || 0,
      cellSalvageVolume: (dataItem.CELL_SAVER_ML / dataItem.caseNum) || 0,
      totalVal: 0,
      zeroCaseNum: 0,
      caseIDList: Array.from(dataItem.caseIDList),
    };
    return newDataObj;
  };

  const currentOffset = OffsetDict.regular;
  const [xVals, setXVals] = useState<string[]>([]);
  useDeepCompareEffect(() => {
    const [tempxVals, _] = sortHelper(data, xAggregationOption, store.provenanceState.showZero, secondaryData);
    setXVals(tempxVals);
  }, [data, xAggregationOption, secondaryData]);

  const aggregationScale = useCallback(() => {
    const aggScale = scaleBand()
      .domain(xVals)
      .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
      .paddingInner(0.1);
    return aggScale;
  }, [dimensionHeight, xVals, currentOffset]);

  useDeepCompareEffect(() => {
    let tempmaxCost = 0;
    let tempMinCost = 0;
    const temporaryDataHolder: Record<string, TempDataItem> = {};
    const secondaryTemporaryDataHolder: Record<string, TempDataItem> = {};
    const outputData: CostBarChartDataPoint[] = [];
    const secondaryOutputData: CostBarChartDataPoint[] = [];

    filteredCases.forEach((singleCase: SingleCasePoint) => {
      if (!temporaryDataHolder[singleCase[xAggregationOption]]) {
        temporaryDataHolder[singleCase[xAggregationOption]] = {
          aggregateAttribute: singleCase[xAggregationOption],
          PRBC_UNITS: 0,
          FFP_UNITS: 0,
          CRYO_UNITS: 0,
          PLT_UNITS: 0,
          CELL_SAVER_ML: 0,
          caseNum: 0,
          SALVAGE_USAGE: 0,
          caseIDList: new Set(),
        };
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]] = {
          aggregateAttribute: singleCase[xAggregationOption],
          PRBC_UNITS: 0,
          FFP_UNITS: 0,
          CRYO_UNITS: 0,
          PLT_UNITS: 0,
          CELL_SAVER_ML: 0,
          caseNum: 0,
          SALVAGE_USAGE: 0,
          caseIDList: new Set(),
        };
      }
      if (comparisonOption && singleCase[comparisonOption] as number > 0) {
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].FFP_UNITS += singleCase.FFP_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].PLT_UNITS += singleCase.PLT_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0);
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].caseNum += 1;
        secondaryTemporaryDataHolder[singleCase[xAggregationOption]].caseIDList.add(singleCase.CASE_ID);
      } else {
        temporaryDataHolder[singleCase[xAggregationOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
        temporaryDataHolder[singleCase[xAggregationOption]].FFP_UNITS += singleCase.FFP_UNITS;
        temporaryDataHolder[singleCase[xAggregationOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
        temporaryDataHolder[singleCase[xAggregationOption]].PLT_UNITS += singleCase.PLT_UNITS;
        temporaryDataHolder[singleCase[xAggregationOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
        temporaryDataHolder[singleCase[xAggregationOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0);
        temporaryDataHolder[singleCase[xAggregationOption]].caseNum += 1;
        temporaryDataHolder[singleCase[xAggregationOption]].caseIDList.add(singleCase.CASE_ID);
      }
    });
    let totalCaseCountTemp = 0;
    let secondaryCaseCountTemp = 0;
    Object.values(temporaryDataHolder).forEach((dataItem) => {
      const newDataObj = makeDataObj(dataItem);
      totalCaseCountTemp += newDataObj.caseCount;
      const sumCost = newDataObj.PRBC_UNITS + newDataObj.FFP_UNITS + newDataObj.CRYO_UNITS + newDataObj.PLT_UNITS + newDataObj.CELL_SAVER_ML;
      tempmaxCost = tempmaxCost > sumCost ? tempmaxCost : sumCost;
      const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.CELL_SAVER_ML);
      if (!Number.isNaN(costSaved)) {
        tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
      }
      outputData.push(newDataObj);
    });
    if (comparisonOption) {
      Object.values(secondaryTemporaryDataHolder).forEach((dataItem) => {
        const newDataObj = makeDataObj(dataItem);
        secondaryCaseCountTemp += newDataObj.caseCount;
        const sumCost = newDataObj.PRBC_UNITS + newDataObj.FFP_UNITS + newDataObj.CRYO_UNITS + newDataObj.PLT_UNITS + newDataObj.CELL_SAVER_ML;
        tempmaxCost = tempmaxCost > sumCost ? tempmaxCost : sumCost;
        const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.CELL_SAVER_ML);
        if (!Number.isNaN(costSaved)) {
          tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
        }
        secondaryOutputData.push(newDataObj);
      });
      stateUpdateWrapperUseJSON(secondaryData, secondaryOutputData, setSecondaryData);
    } else {
      // Clear out the secondary data if it is not needed
      stateUpdateWrapperUseJSON(secondaryData, [], setSecondaryData);
    }
    store.chartStore.totalAggregatedCaseCount = totalCaseCountTemp + secondaryCaseCountTemp;
    stateUpdateWrapperUseJSON(data, outputData, setData);
  }, [proceduresSelection, rawDateRange, xAggregationOption, currentOutputFilterSet, BloodProductCost, filteredCases, comparisonOption]);

  const spec = useMemo(() => ({
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { name: 'values' },
    transform: [
      {
        calculate: "indexof(['PRBC', 'FFP', 'PLT', 'CRYO', 'CELL_SAVER'], datum.bloodProduct)",
        as: 'order',
      },
    ],
    encoding: {
      x: {
        field: 'value',
        type: 'quantitative',
        aggregate: 'sum',
        axis: { grid: false, title: 'Cost' },
      },
      y: { field: 'rowLabel', type: 'ordinal', sort: xVals.toReversed() },
      yOffset: comparisonOption ? { field: 'type', type: 'ordinal', scale: { paddingOuter: -8, domain: ['true', 'false'] } } : undefined,
      color: { field: 'bloodProduct', type: 'nominal', legend: null },
      fillOpacity: {
        condition: { param: 'select', value: 1 },
        value: 0.3,
      },
      order: { field: 'order', type: 'ordinal' },
      tooltip: [
        { field: 'rowLabel', type: 'ordinal' },
        { field: 'bloodProduct', type: 'nominal' },
        { field: 'value', type: 'quantitative', format: '$.2f' },
      ],
    },
    layer: [
      {
        mark: 'bar',
        selection: {
          select: { type: 'point', fields: ['rowLabel'] },
          barClick: { type: 'point', fields: ['rowLabel', 'bloodProduct'] },
        },
      },
      ...(comparisonOption ? [
        {
          mark: 'rect',
          encoding: {
            color: {
              condition: { test: "datum.type === 'true'", value: preopColor },
              value: postopColor,
            },
            x: { value: -20 },
            x2: { value: -5 },
            opacity: { value: 0.2 }, // 0.2 because there are 5 copies stacked on top of each other
          },
        },
      ] : []),
    ],
    autosize: {
      type: 'fit',
      contains: 'padding',
    },
    height: { step: Math.max(MIN_HEATMAP_BANDWIDTH(secondaryData), (dimensionHeight - 50) / xVals.length) },
    config: {
      axisY: {
        title: null,
        labelPadding: comparisonOption ? 20 : 0,
      },
      view: {
        stroke: 'transparent',
      },
    },
  }), [xVals, comparisonOption, secondaryData, dimensionHeight]);

  const axisSpec = useMemo(() => ({
    ...spec,
    layer: [
      { ...spec.layer[0], encoding: { ...spec.layer[0].encoding, color: { value: 'transparent' } } },
    ],
    config: {
      ...spec.config,
      axisY: {
        ...spec.config.axisY,
        labelColor: 'transparent',
        backgroundColor: 'white',
        tickColor: 'transparent',
        domainColor: 'transparent',
      },
      background: 'transparent',
    },
  }), [spec]);

  return (
    <ChartWrapperContainer>
      <ChartAccessoryDiv>
        Cost/Saving Chart
        <FormControl style={{ verticalAlign: 'middle' }}>
          {/* <FormHelperText>Potential cost</FormHelperText> */}
          <Tooltip title="Show potential RBC cost without cell salvage">
            <Switch checked={showPotential} onChange={(e) => { setShowPotential(e.target.checked); }} />
          </Tooltip>
        </FormControl>
        <ExtraPairButtons disbleButton={dimensionWidth * 0.6 < extraPairTotalWidth} extraPairLength={extraPairArray.length} chartId={chartId} />
        <ChartConfigMenu
          xAggregationOption={xAggregationOption}
          yValueOption=""
          chartTypeIndexinArray={0}
          chartId={chartId}
          requireOutcome={false}
          requireSecondary
        />
        <Tooltip title="Change blood component cost">
          <IconButton size="small" onClick={handleClick}>
            <MonetizationOnIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={anchorEl !== null}
          onClose={handleClose}
        >
          {BloodComponentOptions.map((bOption) => (
            <MenuItem
              key={bOption.key}
              onClick={() => {
                setOpenCostInputDialog(true);
                setBloodCostToChange(bOption.value);
                handleClose();
              }}
            >
              {bOption.text}
            </MenuItem>
          ))}
        </Menu>
        <IconButton size="small">
          <Tooltip title="Stacked bar chart on the right of the dashed line shows per case cost for each unit types. The bars on the left of the dashed line shows the potential cost on RBC if not using cell salvage.">
            <HelpIcon />
          </Tooltip>
        </IconButton>
        <CostInputDialog bloodComponent={bloodCostToChange} visible={openCostInputDialog} setVisibility={setOpenCostInputDialog} />
        <ChartStandardButtons chartID={chartId} />
      </ChartAccessoryDiv>
      {comparisonOption && (
        <svg height={30}>
          <ComparisonLegend
            dimensionWidth={dimensionWidth}
            interventionDate={undefined}
            firstTotal={data.reduce((a, b) => a + b.caseCount, 0)}
            secondTotal={secondaryData.reduce((a, b) => a + b.caseCount, 0)}
            outcomeComparison={comparisonOption}
          />

        </svg>
      )}
      <div
        ref={chartDiv}
        style={{
          height: `calc(100% - 38px - 40px - 10px${comparisonOption ? ' - 30px' : ''})`,
          width: '100%',
          overflow: 'auto',
          display: 'flex',
        }}
      >
        <svg width={extraPairTotalWidth} height={vegaHeight}>
          <GeneratorExtraPair
            extraPairDataSet={extraPairData}
            secondaryExtraPairDataSet={comparisonOption ? secondaryExtraPairData : undefined}
            aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
            aggregationScaleRange={`[${vegaHeight - 38}, 6]`}
            text
            height={vegaHeight}
            chartId={chartId}
          />
        </svg>
        <Stack>
          <VegaLite
            spec={spec as never}
            data={plotData}
            actions={false}
            signalListeners={{ barClick }}
            width={dimensionWidth - extraPairTotalWidth - 20}
            className="vega-vis"
          />

          {/* Permanent x axis overlay with white background */}
          <div
            style={{
              height: 50,
              width: dimensionWidth - extraPairTotalWidth - 20,
              backgroundColor: 'white',
              position: 'fixed',
              bottom: 45,
            }}
          />
          <VegaLite
            spec={axisSpec as never}
            data={plotData}
            actions={false}
            width={dimensionWidth - extraPairTotalWidth - 20}
            style={{
              position: 'fixed',
              bottom: 50,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </Stack>
      </div>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </ChartWrapperContainer>
  );
}

export default observer(WrapperCostBar);
