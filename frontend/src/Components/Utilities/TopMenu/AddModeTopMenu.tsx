import { observer } from 'mobx-react';
import React, { useState, useContext } from 'react';
import {
  Button, ButtonGroup, FormControl, InputLabel, Select, TextField,
} from '@mui/material';
import styled from '@emotion/styled';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  AcronymDictionary, addOptions, OutcomeOptions, typeDiction,
} from '../../../Presets/DataDict';
import Store from '../../../Interfaces/Store';
import { LayoutElement } from '../../../Interfaces/Types/LayoutTypes';
import { DropdownGenerator } from '../../../HelperFunctions/DropdownGenerator';
import { BloodProductCap, ManualInfinity } from '../../../Presets/Constants';
import { PaddedToolBar, CenterAlignedDiv } from '../../../Presets/StyledComponents';

const StyledFormControl = styled(FormControl)({
  // margin: '1rem',
  minWidth: '200px!important',
});

type Props = { addingChartType: number; };

function AddModeTopMenu({ addingChartType }: Props) {
  const store = useContext(Store);

  const [xAggreSelection, setXAggreSelection] = useState<keyof typeof AcronymDictionary | ''>('');
  const [yValueSelection, setYValueSelection] = useState<keyof typeof BloodProductCap | ''>('');
  const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<keyof typeof AcronymDictionary | ''>('');
  const [interventionDate, setInterventionDate] = useState<number | null>(null);

  const cancelChartAddHandler = () => {
    store.configStore.topMenuBarAddMode = false;
    setXAggreSelection('');
    setYValueSelection('');
  };

  const interventionHandler = (date: number | null) => {
    if (date) {
      setInterventionDate(date);
    } else {
      setInterventionDate(null);
    }
  };

  const checkValidInput = () => (xAggreSelection.length > 0 && yValueSelection.length > 0 && addingChartType > 0) || (xAggreSelection.length > 0 && addingChartType === 0);

  const confirmChartAddHandler = () => {
    if (checkValidInput()) {
      if (!(addingChartType === 4 && (!interventionDate))) {
        const newChart: LayoutElement = {
          aggregatedBy: xAggreSelection,
          valueToVisualize: yValueSelection as keyof typeof BloodProductCap,
          i: store.provenanceState.nextAddingIndex.toString(),
          w: 1,
          h: 1,
          x: 0,
          y: ManualInfinity,
          plotType: typeDiction[addingChartType],
          notation: '',
          outcomeComparison: outcomeComparisonSelection as keyof typeof AcronymDictionary || undefined,
          interventionDate: interventionDate || undefined,
        };
        if (
          typeDiction[addingChartType] === 'HEATMAP' || typeDiction[addingChartType] === 'COST') {
          newChart.extraPair = JSON.stringify([]);
        }

        store.chartStore.addNewChart(newChart);
        store.configStore.topMenuBarAddMode = false;
        setInterventionDate(null);
        setXAggreSelection('');
        setYValueSelection('');
        setOutcomeComparisonSelection('');
      }
    }
  };

  const outputRegularOptions = (titleOne: string, titleTwo: string, titleOneRequied: boolean) => (
    <>

      <CenterAlignedDiv>
        <StyledFormControl variant="standard" required={titleOneRequied}>
          <InputLabel>
            {titleOne}
            {titleOneRequied ? '' : ' (Optional)'}
          </InputLabel>
          <Select
            value={yValueSelection}
            label={`${titleOne}${titleOneRequied ? '' : ' (Optional)'}`}
            onChange={(e) => { setYValueSelection(e.target.value as keyof typeof BloodProductCap); }}
          >
            {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][0] : [], !titleOneRequied)}
          </Select>
        </StyledFormControl>
      </CenterAlignedDiv>

      <CenterAlignedDiv>
        <StyledFormControl required variant="standard">
          <InputLabel>{titleTwo}</InputLabel>
          <Select
            label={titleTwo}
            value={xAggreSelection}
            onChange={(e) => { setXAggreSelection(e.target.value as keyof typeof AcronymDictionary); }}
          >
            {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][1] : [])}
          </Select>
        </StyledFormControl>

      </CenterAlignedDiv>

    </>
  );

  const addBarChartMenuRewrite = [
    // For #0 Cost and Saving Chart

    outputRegularOptions('Select Comparison', 'Aggregated by', false),

    // For #1 Dumbbell Chart

    outputRegularOptions('Select Value to Show', 'Arranged by', true),

    // for #2 Scatter Plot

    outputRegularOptions('Select Value to Show', 'Arranged by', true),

    // for #3 Heat Map

    [outputRegularOptions('Select Value to Show', 'Aggregated by', true),
      <>

        <CenterAlignedDiv>
          <StyledFormControl variant="standard" disabled={!!interventionDate}>
            <InputLabel>Outcome (Optional)</InputLabel>
            <Select
              value={outcomeComparisonSelection}
              label="Outcome (Optional)"
              onChange={(e) => { setOutcomeComparisonSelection(e.target.value as keyof typeof AcronymDictionary); }}
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
              onChange={interventionHandler}
            />
          </LocalizationProvider>

        </CenterAlignedDiv>
      </>,
    ],
  ];

  return (
    <PaddedToolBar style={{ justifyContent: 'space-evenly' }}>
      {addBarChartMenuRewrite[addingChartType]}
      {/* <Divider orientation="vertical" flexItem /> */}

      <CenterAlignedDiv>
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
      </CenterAlignedDiv>

    </PaddedToolBar>
  );
}

export default observer(AddModeTopMenu);
