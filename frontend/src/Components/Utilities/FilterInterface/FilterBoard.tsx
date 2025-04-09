import {
  Box, Button, IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText, Slider, Input, Stack, TextField, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { observer } from 'mobx-react';
import { useContext, useMemo, useState } from 'react';
import ReplayIcon from '@mui/icons-material/Replay';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  AcronymDictionary, BloodComponent, BloodComponentOptions, HemoOption, ScatterYOptions,
} from '../../../Presets/DataDict';
import Store from '../../../Interfaces/Store';
import ComponentRangePicker from './ComponentRangePicker';
import { Title } from '../../../Presets/StyledComponents';
import { defaultState } from '../../../Interfaces/DefaultState';
import OutcomeChipGroup from './OutcomeChipGroup';
import SurgeryUrgencyChipGroup from './SurgeryUrgencyChipGroup';
import { SelectSet } from '../../../Interfaces/Types/SelectionTypes';
import { ManualInfinity } from '../../../Presets/Constants';

function FilterBoard() {
  const store = useContext(Store);

  const {
    rawDateRange, outcomeFilter, surgeryUrgencySelection, currentSelectPatientGroup, currentOutputFilterSet, bloodFilter, surgeonCasesPerformed,
  } = store.provenanceState;
  const [beginDate, setBeginDate] = useState<number | null>(rawDateRange[0]);
  const [endDate, setEndDate] = useState<number | null>(rawDateRange[1]);

  const resetDateFilter = () => {
    setBeginDate(defaultState.rawDateRange[0]);
    setEndDate(defaultState.rawDateRange[1]);
    store.configStore.dateRangeChange(defaultState.rawDateRange);
  };

  function checkIfCanReset(filterInput: Record<string, [number, number]>, type?: typeof BloodComponentOptions | typeof ScatterYOptions) {
    return Object.entries(filterInput)
      .filter(([filterName]) => (type ? type.map((d) => d.key).includes(filterName as BloodComponent | HemoOption) : true))
      .some(([filterName, filterValue]) => (filterValue)[0] > 0 || ((filterValue)[1] < store.filterRange[filterName][1]));
  }

  const enableClearAll = () => {
    if (rawDateRange[0] !== defaultState.rawDateRange[0] || rawDateRange[1] !== defaultState.rawDateRange[1]) {
      return true;
    }
    if (outcomeFilter.length > 0) {
      return true;
    }
    if (!(surgeryUrgencySelection[0] && surgeryUrgencySelection[1] && surgeryUrgencySelection[2])) {
      return true;
    }
    if (currentSelectPatientGroup.length > 0 || currentOutputFilterSet.length > 0) {
      return true;
    }
    if (checkIfCanReset(bloodFilter)) {
      return true;
    }
    return false;
  };

  const fullSurgeonCasesPerformedRange = useMemo(() => {
    const min = 0;
    const max = Math.max(...Object.values(store.surgeonCasesPerformedRange));
    return [min, max] as [number, number];
  }, [store.surgeonCasesPerformedRange]);

  const [minSurgeonCasesPerformed, maxSurgeonCasesPerformed] = useMemo(() => {
    const min = surgeonCasesPerformed[0];
    const max = surgeonCasesPerformed[1] === ManualInfinity ? fullSurgeonCasesPerformedRange[1] : surgeonCasesPerformed[1];
    return [min, max] as [number, number];
  }, [fullSurgeonCasesPerformedRange, surgeonCasesPerformed]);

  return (
    <Box p={1}>
      <List dense>
        <ListItem>
          <Button
            variant="outlined"
            size="small"
            disabled={!enableClearAll()}
            onClick={() => { store.configStore.clearAllFilter(); }}
            sx={{ mx: 'auto' }}
          >
            Clear All Filters
          </Button>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={(
              <Title>
                Pick Date Range
              </Title>
            )}
          />
          <ListItemSecondaryAction>

            <IconButton
              onClick={resetDateFilter}
              disabled={(rawDateRange[0] === defaultState.rawDateRange[0]) && (rawDateRange[1] === defaultState.rawDateRange[1])}
            >
              <Tooltip title="Reset">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <ListItemText
            primary="From:"
          />
          <ListItemButton sx={{ maxWidth: 160 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker
                inputFormat="MM/dd/yyyy"
                value={beginDate}
                renderInput={(params) => <TextField variant="standard" {...params} />}
                onChange={(d: Date | null) => {
                  if (d) {
                    setBeginDate(d.getTime());
                    store.configStore.dateRangeChange([d.getTime(), rawDateRange[1]]);
                  } else {
                    setBeginDate(rawDateRange[0]);
                  }
                }}
              />
            </LocalizationProvider>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemText
            primary="To: "
          />
          <ListItemButton sx={{ maxWidth: 160 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker
                inputFormat="MM/dd/yyyy"
                value={endDate}
                renderInput={(params) => <TextField variant="standard" {...params} />}
                onChange={(d: Date | null) => {
                  if (d) {
                    setEndDate(d.getTime());
                    store.configStore.dateRangeChange([rawDateRange[0], d.getTime()]);
                  } else {
                    setEndDate(rawDateRange[1]);
                  }
                }}
              />
            </LocalizationProvider>
          </ListItemButton>
        </ListItem>

        <ListItem>
          <ListItemText
            primary={(
              <Title>
                Outcome / Intervention Filter
              </Title>
            )}
          />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.configStore.changeOutcomeFilter([]); }}
              disabled={outcomeFilter.length === 0}
            >
              <Tooltip title="Clear">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        <OutcomeChipGroup />

        <ListItem>
          <ListItemText primary={<Title>Surgery Urgency Filter</Title>} />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.configStore.changeSurgeryUrgencySelection([true, true, true]); }}
              disabled={surgeryUrgencySelection[0] && surgeryUrgencySelection[1] && surgeryUrgencySelection[2]}
            >
              <Tooltip title="Clear">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        <SurgeryUrgencyChipGroup />

        <ListItem>
          <ListItemText primary={<Title>Surgeon Cases Performed</Title>} />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.configStore.changeSurgeonCasesPerformed(fullSurgeonCasesPerformedRange); }}
              disabled={surgeonCasesPerformed[0] === fullSurgeonCasesPerformedRange[0] && surgeonCasesPerformed[1] === fullSurgeonCasesPerformedRange[1]}
            >
              <Tooltip title="Clear">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <ListItemText
            secondary={(
              <Stack direction="row" spacing={2}>
                <Input value={minSurgeonCasesPerformed} onChange={(e) => { store.configStore.changeSurgeonCasesPerformed([parseInt(e.target.value, 10), surgeonCasesPerformed[1]]); }} sx={{ width: '75px' }} />
                <Slider
                  value={surgeonCasesPerformed}
                  onChange={(event, value) => { store.configStore.changeSurgeonCasesPerformed(value as [number, number]); }}
                  marks={[
                    defaultState.surgeonCasesPerformed[0],
                    Math.max(...Object.values(store.surgeonCasesPerformedRange)),
                  ].map((d) => ({ value: d, label: d.toString() }))}
                  min={0}
                  max={Math.max(...Object.values(store.surgeonCasesPerformedRange))}
                  step={1}
                  valueLabelDisplay="auto"
                />
                <Input value={maxSurgeonCasesPerformed} onChange={(e) => { store.configStore.changeSurgeonCasesPerformed([surgeonCasesPerformed[0], parseInt(e.target.value, 10)]); }} sx={{ width: '75px' }}/>
              </Stack>
            )}
          />
        </ListItem>

        <ListItem>
          <ListItemText primary={<Title>Selection Filter</Title>} />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.InteractionStore.clearSelectionFilter(); }}
              disabled={currentSelectPatientGroup.length === 0 && currentOutputFilterSet.length === 0}
            >
              <Tooltip title="Clear All">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        {currentSelectPatientGroup.length > 0 ? (
          <ListItem key="PatientgroupSelected">
            <ListItemText primary="Cases Filtered" secondary={currentSelectPatientGroup.length} />
            <ListItemSecondaryAction>

              <IconButton onClick={() => { store.InteractionStore.updateSelectedPatientGroup([]); }}>
                <Tooltip title="Remove">
                  <CloseIcon />
                </Tooltip>
              </IconButton>

            </ListItemSecondaryAction>
          </ListItem>
        ) : null}
        {currentOutputFilterSet.map((selectSet: SelectSet) => (
          <ListItem key={`${selectSet.setName}selected`}>
            <ListItemText
              key={`${selectSet.setName}selected`}
              primary={AcronymDictionary[selectSet.setName as never] ? AcronymDictionary[selectSet.setName as never] : selectSet.setName}
              secondary={selectSet.setValues.sort().join(', ')}
            />
            <ListItemSecondaryAction key={`${selectSet.setName}selected`}>
              <IconButton key={`${selectSet.setName}selected`} onClick={() => { store.InteractionStore.removeFilter(selectSet.setName); }}>
                <Tooltip title="Remove">
                  <CloseIcon key={`${selectSet.setName}selected`} />
                </Tooltip>
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}

        <ListItem>
          <ListItemText primary={<Title>Blood Component Filter</Title>} />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.configStore.resetBloodFilter(BloodComponentOptions); }}
              disabled={!checkIfCanReset(bloodFilter, BloodComponentOptions)}
            >
              <Tooltip title="Reset">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        {BloodComponentOptions.map((d) => (<ComponentRangePicker label={d.key} key={d.key} />))}

        <ListItem>
          <ListItemText primary={<Title>Test Value Filter</Title>} />
          <ListItemSecondaryAction>

            <IconButton
              onClick={() => { store.configStore.resetBloodFilter(ScatterYOptions); }}
              disabled={!checkIfCanReset(bloodFilter, ScatterYOptions)}
            >
              <Tooltip title="Reset">
                <ReplayIcon />
              </Tooltip>
            </IconButton>

          </ListItemSecondaryAction>
        </ListItem>
        {ScatterYOptions.map((d) => (<ComponentRangePicker label={d.key} key={d.key} isTestValue />))}
      </List>
    </Box>
  );
}

export default observer(FilterBoard);
