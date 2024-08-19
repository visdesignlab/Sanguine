import {
  FormControl, IconButton, Menu, MenuItem, Switch, Tooltip,
} from '@mui/material';
import { sum } from 'd3';
import { observer } from 'mobx-react';
import {
  useContext, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import HelpIcon from '@mui/icons-material/Help';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { generateExtrapairPlotData } from '../../../HelperFunctions/ExtraPairDataGenerator';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { CostBarChartDataPoint, ExtraPairPoint, SingleCasePoint } from '../../../Interfaces/Types/DataTypes';
import { BloodProductCap, ExtraPairPadding, ExtraPairWidth } from '../../../Presets/Constants';
import { ChartSVG } from '../../../Presets/StyledSVGComponents';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import ExtraPairButtons from '../ChartAccessories/ExtraPairButtons';
import StackedBarChart from './StackedBarChart';
import { AcronymDictionary, BloodComponentOptions } from '../../../Presets/DataDict';
import CostInputDialog from '../../Modals/CostInputDialog';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv, ChartWrapperContainer } from '../../../Presets/StyledComponents';

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

type Props = {
    xAggregatedOption: keyof typeof BloodProductCap;
    chartId: string;
    annotationText: string;
    layoutW: number;
    layoutH: number;
    comparisonOption?: keyof typeof AcronymDictionary;
    extraPairArrayString: string;
};

function WrapperCostBar({
  annotationText, extraPairArrayString, xAggregatedOption, chartId, layoutH, layoutW, comparisonOption,
}: Props) {
  const store = useContext(Store);
  const { filteredCases } = store;

  const {
    proceduresSelection, BloodProductCost, currentOutputFilterSet, rawDateRange,
  } = store.provenanceState;

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<CostBarChartDataPoint[]>([]);
  const [secondaryData, setSecondaryData] = useState<CostBarChartDataPoint[]>([]);
  const [maximumCost, setMaximumCost] = useState(0);
  const [maximumSavedNegative, setMinCost] = useState(0);
  const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [extraPairArray, setExtraPairArray] = useState<string[]>([]);

  const [dimensionHeight, setDimensionHeight] = useState(0);
  const [dimensionWidth, setDimensionWidth] = useState(0);
  const [extraPairTotalWidth, setExtraPairTotalWidth] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [costMode, setCostMode] = useState(true);
  const [bloodCostToChange, setBloodCostToChange] = useState('');
  const [secondaryExtraPairData, setSecondaryExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [showPotential, setShowPotential] = useState(false);
  const [totalCaseCount, setTotalCaseCount] = useState(0);
  const [secondaryCaseCount, setSecondaryCaseCount] = useState(0);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const [openCostInputDialog, setOpenCostInputDialog] = useState(false);

  useEffect(() => {
    if (extraPairArrayString) {
      stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPairArrayString]);

  useDeepCompareEffect(() => {
    const newExtraPairData = generateExtrapairPlotData(xAggregatedOption, filteredCases, extraPairArray, data);
    if (comparisonOption) {
      const newSecondaryExtraPairData = generateExtrapairPlotData(xAggregatedOption, filteredCases, extraPairArray, secondaryData);
      stateUpdateWrapperUseJSON(secondaryExtraPairData, newSecondaryExtraPairData, setSecondaryExtraPairData);
    }
    let totalWidth = newExtraPairData.length > 0 ? (newExtraPairData.length + 1) * ExtraPairPadding : 0;
    newExtraPairData.forEach((d) => {
      totalWidth += (ExtraPairWidth[d.type]);
    });
    setExtraPairTotalWidth(totalWidth);
    stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPairArray, data, filteredCases, secondaryData, comparisonOption]);

  useLayoutEffect(() => {
    if (svgRef.current) {
      setDimensionHeight(svgRef.current.clientHeight);
      setDimensionWidth(svgRef.current.clientWidth);
    }
  }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

  const makeDataObj = (dataItem: TempDataItem) => {
    const newDataObj: CostBarChartDataPoint = {
      aggregateAttribute: dataItem.aggregateAttribute,
      dataArray: [
        ((dataItem.PRBC_UNITS * (costMode ? BloodProductCost.PRBC_UNITS : 1)) / dataItem.caseNum) || 0,
        ((dataItem.FFP_UNITS * (costMode ? BloodProductCost.FFP_UNITS : 1)) / dataItem.caseNum) || 0,
        ((dataItem.PLT_UNITS * (costMode ? BloodProductCost.PLT_UNITS : 1)) / dataItem.caseNum) || 0,
        ((dataItem.CRYO_UNITS * (costMode ? BloodProductCost.CRYO_UNITS : 1)) / dataItem.caseNum) || 0,
        (costMode ? (((dataItem.SALVAGE_USAGE * BloodProductCost.CELL_SAVER_ML) / dataItem.caseNum) || 0) : (((dataItem.CELL_SAVER_ML * 0.004) / dataItem.caseNum) || 0)),
      ],
      caseCount: dataItem.caseNum,
      cellSalvageUsage: (dataItem.SALVAGE_USAGE / dataItem.caseNum) || 0,
      cellSalvageVolume: (dataItem.CELL_SAVER_ML / dataItem.caseNum) || 0,
      totalVal: 0,
      zeroCaseNum: 0,
      caseIDList: Array.from(dataItem.caseIDList),
    };
    return newDataObj;
  };

  useDeepCompareEffect(() => {
    let tempmaxCost = 0;
    let tempMinCost = 0;
    const temporaryDataHolder: Record<string, TempDataItem> = {};
    const secondaryTemporaryDataHolder: Record<string, TempDataItem> = {};
    const outputData: CostBarChartDataPoint[] = [];
    const secondaryOutputData: CostBarChartDataPoint[] = [];

    filteredCases.forEach((singleCase: SingleCasePoint) => {
      if (!temporaryDataHolder[singleCase[xAggregatedOption]]) {
        temporaryDataHolder[singleCase[xAggregatedOption]] = {
          aggregateAttribute: singleCase[xAggregatedOption],
          PRBC_UNITS: 0,
          FFP_UNITS: 0,
          CRYO_UNITS: 0,
          PLT_UNITS: 0,
          CELL_SAVER_ML: 0,
          caseNum: 0,
          SALVAGE_USAGE: 0,
          caseIDList: new Set(),
        };
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]] = {
          aggregateAttribute: singleCase[xAggregatedOption],
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
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].FFP_UNITS += singleCase.FFP_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].PLT_UNITS += singleCase.PLT_UNITS;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0);
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].caseNum += 1;
        secondaryTemporaryDataHolder[singleCase[xAggregatedOption]].caseIDList.add(singleCase.CASE_ID);
      } else {
        temporaryDataHolder[singleCase[xAggregatedOption]].PRBC_UNITS += singleCase.PRBC_UNITS;
        temporaryDataHolder[singleCase[xAggregatedOption]].FFP_UNITS += singleCase.FFP_UNITS;
        temporaryDataHolder[singleCase[xAggregatedOption]].CRYO_UNITS += singleCase.CRYO_UNITS;
        temporaryDataHolder[singleCase[xAggregatedOption]].PLT_UNITS += singleCase.PLT_UNITS;
        temporaryDataHolder[singleCase[xAggregatedOption]].CELL_SAVER_ML += singleCase.CELL_SAVER_ML;
        temporaryDataHolder[singleCase[xAggregatedOption]].SALVAGE_USAGE += (singleCase.CELL_SAVER_ML > 0 ? 1 : 0);
        temporaryDataHolder[singleCase[xAggregatedOption]].caseNum += 1;
        temporaryDataHolder[singleCase[xAggregatedOption]].caseIDList.add(singleCase.CASE_ID);
      }
    });
    let totalCaseCountTemp = 0;
    let secondaryCaseCountTemp = 0;
    Object.values(temporaryDataHolder).forEach((dataItem) => {
      const newDataObj = makeDataObj(dataItem);
      totalCaseCountTemp += newDataObj.caseCount;
      const sumCost = sum(newDataObj.dataArray) + (costMode ? (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0);
      tempmaxCost = tempmaxCost > sumCost ? tempmaxCost : sumCost;
      const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]);
      if (costMode && !Number.isNaN(costSaved)) {
        tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
      }
      outputData.push(newDataObj);
    });
    if (comparisonOption) {
      Object.values(secondaryTemporaryDataHolder).forEach((dataItem) => {
        const newDataObj = makeDataObj(dataItem);
        secondaryCaseCountTemp += newDataObj.caseCount;
        const sumCost = sum(newDataObj.dataArray) + (costMode ? (newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]) : 0);
        tempmaxCost = tempmaxCost > sumCost ? tempmaxCost : sumCost;
        const costSaved = -(newDataObj.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - newDataObj.dataArray[4]);
        if (costMode && !Number.isNaN(costSaved)) {
          tempMinCost = tempMinCost < costSaved ? tempMinCost : costSaved;
        }
        secondaryOutputData.push(newDataObj);
      });
      stateUpdateWrapperUseJSON(secondaryData, secondaryOutputData, setSecondaryData);
    }
    store.chartStore.totalAggregatedCaseCount = totalCaseCountTemp + secondaryCaseCountTemp;
    setTotalCaseCount(totalCaseCountTemp);
    setSecondaryCaseCount(secondaryCaseCountTemp);
    stateUpdateWrapperUseJSON(data, outputData, setData);
    setMinCost(tempMinCost);
    setMaximumCost(tempmaxCost);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proceduresSelection, rawDateRange, xAggregatedOption, currentOutputFilterSet, costMode, BloodProductCost, filteredCases]);

  return (
    <ChartWrapperContainer>
      <ChartAccessoryDiv>
        Cost and Saving Chart
        <FormControl style={{ verticalAlign: 'middle' }}>
          {/* <FormHelperText>Potential cost</FormHelperText> */}
          <Tooltip title="Show potential RBC cost without cell salvage">
            <Switch checked={showPotential} onChange={(e) => { setShowPotential(e.target.checked); }} />
          </Tooltip>
        </FormControl>
        <ExtraPairButtons disbleButton={dimensionWidth * 0.6 < extraPairTotalWidth} extraPairLength={extraPairArray.length} chartId={chartId} />
        <ChartConfigMenu
          xAggregationOption={xAggregatedOption}
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
          open={open}
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
      <ChartSVG ref={svgRef}>
        <StackedBarChart
          xAggregationOption={xAggregatedOption}
          secondaryData={comparisonOption ? secondaryData : undefined}
          svg={svgRef}
          data={data}
          caseCount={totalCaseCount}
          secondaryCaseCount={secondaryCaseCount}
          outcomeComparison={comparisonOption}
          dimensionWidth={dimensionWidth}
          dimensionHeight={dimensionHeight}
          maximumCost={maximumCost}
          maxSavedNegative={maximumSavedNegative}
          costMode={costMode}
          extraPairDataSet={extraPairData}
          secondaryExtraPairDataSet={comparisonOption ? secondaryExtraPairData : undefined}
          extraPairTotalWidth={extraPairTotalWidth}
          showPotential={showPotential}
        />

      </ChartSVG>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </ChartWrapperContainer>
  );
}

export default observer(WrapperCostBar);
