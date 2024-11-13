import { observer } from 'mobx-react';
import React, {
  useState, useContext, Fragment, useEffect,
} from 'react';
import {
  Button, ButtonGroup, FormControl, InputLabel, Select, TextField, Toolbar,
} from '@mui/material';
import styled from '@emotion/styled';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  addOptions, ChartType, Outcome, OutcomeOptions,
} from '../../../Presets/DataDict';
import Store from '../../../Interfaces/Store';
import { LayoutElement, xAxisOption, yAxisOption } from '../../../Interfaces/Types/LayoutTypes';
import { DropdownGenerator } from '../../../HelperFunctions/DropdownGenerator';
import { ManualInfinity } from '../../../Presets/Constants';
import { CenterAlignedDiv } from '../../../Presets/StyledComponents';

const StyledFormControl = styled(FormControl)({
  minWidth: '200px!important',
});

function AddModeTopMenu({ chartType, sx }: { chartType: ChartType; sx: React.CSSProperties }) {
  const store = useContext(Store);

  const [xAxisSelection, setxAxisSelection] = useState<xAxisOption | '' >('');
  const [yAxisSelection, setYAxisSelection] = useState<yAxisOption | ''>('');
  const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<Outcome | ''>('');
  const [interventionDate, setInterventionDate] = useState<number | null>(null);

  const [xDisabled, setXDisabled] = useState(false);
  const [yDisabled, setYDisabled] = useState(false);

  // Automatically set the axis values if the chart type has a fixed option
  useEffect(() => {
    if (!store.configStore.topMenuBarAddMode) {
      return;
    }
    setXDisabled(chartType === 'COST');
    setYDisabled(chartType === 'DUMBBELL');

    if (chartType === 'DUMBBELL') {
      setYAxisSelection('HGB_VALUE');
    } else if (chartType === 'COST') {
      setxAxisSelection('COST');
    }
  }, [chartType, store.configStore.topMenuBarAddMode]);

  const resetFields = () => {
    setxAxisSelection('');
    setYAxisSelection('');
    setOutcomeComparisonSelection('');
    setInterventionDate(null);
  };

  const cancelChartAddHandler = () => {
    store.configStore.topMenuBarAddMode = false;
    resetFields();
  };

  const checkValidInput = () => (xAxisSelection.length > 0 && yAxisSelection.length > 0);

  const confirmChartAddHandler = () => {
    if (checkValidInput()) {
      const newChart: Partial<LayoutElement> = {
        i: store.provenanceState.nextAddingIndex.toString(),
        x: 0,
        y: ManualInfinity,
        w: 1,
        h: 1,
        annotationText: '',
        chartType,
        extraPair: chartType === 'HEATMAP' || chartType === 'COST' ? JSON.stringify([]) : undefined,
      };
      newChart.xAxisVar = xAxisSelection as xAxisOption;
      newChart.yAxisVar = yAxisSelection as yAxisOption;

      if (newChart.chartType === 'HEATMAP' || newChart.chartType === 'COST') {
        newChart.extraPair = JSON.stringify([]);
        newChart.outcomeComparison = outcomeComparisonSelection || undefined;
        newChart.interventionDate = interventionDate || undefined;
      }

      store.chartStore.addNewChart(newChart as LayoutElement);
      resetFields();
      store.configStore.topMenuBarAddMode = false;
    }
  };

  return (
    <Toolbar style={{ justifyContent: 'space-evenly' }} sx={sx}>
      <Fragment key={1}>
        <CenterAlignedDiv>
          <StyledFormControl required variant="standard" disabled={xDisabled}>
            <InputLabel>
              X Axis Values
            </InputLabel>
            <Select
              value={xAxisSelection}
              label="X Axis Values"
              onChange={(e) => { setxAxisSelection(e.target.value as xAxisOption); }}
            >
              {DropdownGenerator(addOptions[chartType].x)}
            </Select>
          </StyledFormControl>
        </CenterAlignedDiv>

        <CenterAlignedDiv>
          <StyledFormControl required variant="standard" disabled={yDisabled}>
            <InputLabel>Y Axis Values</InputLabel>
            <Select
              label="Y Axis Values"
              value={yAxisSelection}
              onChange={(e) => { setYAxisSelection(e.target.value as yAxisOption); }}
            >
              {DropdownGenerator(addOptions[chartType].y)}
            </Select>
          </StyledFormControl>

        </CenterAlignedDiv>
      </Fragment>

      {(chartType === 'HEATMAP' || chartType === 'COST') && (
        <Fragment key={2}>
          <CenterAlignedDiv>
            <StyledFormControl variant="standard" disabled={!!interventionDate}>
              <InputLabel>Outcome (Optional)</InputLabel>
              <Select
                value={outcomeComparisonSelection}
                label="Outcome Comparison (Optional)"
                onChange={(e) => { setOutcomeComparisonSelection(e.target.value as Outcome); }}
              >
                {DropdownGenerator(OutcomeOptions, true)}
              </Select>
            </StyledFormControl>
          </CenterAlignedDiv>

          <CenterAlignedDiv>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker
                inputFormat="MM/dd/yyyy"
                renderInput={(params) => <TextField style={{ minWidth: '250px' }} variant="standard" {...params} />}
                label="Comparison Date (Optional)"
                minDate={store.provenanceState.rawDateRange[0]}
                maxDate={store.provenanceState.rawDateRange[1]}
                disabled={!!outcomeComparisonSelection}
                value={interventionDate}
                onChange={(value: unknown) => { setInterventionDate((value as Date).getTime()); }}
              />
            </LocalizationProvider>

          </CenterAlignedDiv>
        </Fragment>
      )}

      <ButtonGroup disableElevation variant="contained" color="primary">
        <Button
          disabled={!checkValidInput()}
          onClick={confirmChartAddHandler}
        >
          Confirm
        </Button>
        <Button
          onClick={cancelChartAddHandler}
        >
          Cancel
        </Button>
      </ButtonGroup>
    </Toolbar>
  // eslint-disable-next-line react/jsx-no-useless-fragment
  );
}

export default observer(AddModeTopMenu);
