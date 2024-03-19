import { Button, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, TextField, Tooltip } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import { AcronymDictionary } from "../../../Presets/DataDict";
import Store from "../../../Interfaces/Store";
import ComponentRangePicker from "./ComponentRangePicker";
import { Title, UtilityContainer } from "../../../Presets/StyledComponents";
import { BloodComponentOptions, ScatterYOptions } from "../../../Presets/DataDict";
import ReplayIcon from '@mui/icons-material/Replay';
import { defaultState } from "../../../Interfaces/DefaultState";
import OutcomeChipGroup from "./OutcomeChipGroup";
import SurgeryUrgencyChipGroup from "./SurgeryUrgencyChipGroup";
import { SelectSet } from "../../../Interfaces/Types/SelectionTypes";
import { DesktopDatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';


const FilterBoard: FC = () => {

    const store = useContext(Store);

    const { rawDateRange, outcomeFilter, surgeryUrgencySelection, currentSelectPatientGroup, currentOutputFilterSet, bloodComponentFilter, testValueFilter } = store.provenanceState;
    const [beginDate, setBeginDate] = useState<number | null>(rawDateRange[0]);
    const [endDate, setEndDate] = useState<number | null>(rawDateRange[1]);

    const resetDateFilter = () => {
        setBeginDate(defaultState.rawDateRange[0]);
        setEndDate(defaultState.rawDateRange[1]);
        store.configStore.dateRangeChange(defaultState.rawDateRange);
    };

    const checkIfCanReset = (filterInput: any) => {

        let canReset = false;

        Object.entries(filterInput).forEach(([filterName, filterValue]) => {

            if ((filterValue as any)[0] > 0 || ((filterValue as any)[1] < store.configStore.filterRange[filterName])) {
                canReset = true;
            }
        });
        return canReset;
    };

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
        if (checkIfCanReset(testValueFilter)) {
            return true;
        }
        if (checkIfCanReset(bloodComponentFilter)) {
            return true;
        }
        return false;
    };

    return (
        <UtilityContainer>
            < List dense >
                <ListItem>
                    <Button variant="outlined" size="small" disabled={!enableClearAll()} onClick={() => { store.configStore.clearAllFilter(); }}>Clear All Filter Settings</Button>
                </ListItem>
                <ListItem>
                    <ListItemText primary={<Title>
                        Pick Date Range
                    </Title>} />
                    <ListItemSecondaryAction>

                        <IconButton onClick={resetDateFilter}
                            disabled={(rawDateRange[0] === defaultState.rawDateRange[0]) && (rawDateRange[1] === defaultState.rawDateRange[1])}>
                            <Tooltip title="Reset">
                                <ReplayIcon />
                            </Tooltip>
                        </IconButton>

                    </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Date From" secondary={
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DesktopDatePicker
                                inputFormat="MM/dd/yyyy"
                                value={beginDate}
                                renderInput={(params) => <TextField variant="standard" {...params} />}
                                onChange={(d) => {
                                    if (d) {
                                        setBeginDate(d);
                                        store.configStore.dateRangeChange([d, rawDateRange[1]]);
                                    } else {
                                        setBeginDate(rawDateRange[0]);
                                    }
                                }} />
                        </LocalizationProvider>} />
                </ListItem>
                <ListItem>
                    <ListItemText primary="To" secondary={
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DesktopDatePicker
                                inputFormat="MM/dd/yyyy"
                                value={endDate}
                                renderInput={(params) => <TextField variant="standard" {...params} />}
                                onChange={(d) => {
                                    if (d) {
                                        setEndDate(d);
                                        store.configStore.dateRangeChange([rawDateRange[0], d]);
                                    } else {
                                        setEndDate(rawDateRange[1]);
                                    }
                                }} />
                        </LocalizationProvider>} />
                </ListItem>

                <ListItem>
                    <ListItemText primary={<Title>
                        Outcome / Intervention Filter
                    </Title>} />
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
                    <ListItemText primary={<Title>Selection Filter</Title>} />
                    <ListItemSecondaryAction>

                        <IconButton onClick={() => { store.selectionStore.clearSelectionFilter(); }}
                            disabled={currentSelectPatientGroup.length === 0 && currentOutputFilterSet.length === 0}>
                            <Tooltip title="Clear All">
                                <ReplayIcon />
                            </Tooltip>
                        </IconButton>

                    </ListItemSecondaryAction>
                </ListItem>
                {
                    currentSelectPatientGroup.length > 0 ? (
                        <ListItem key="PatientgroupSelected">
                            <ListItemText primary="Cases Filtered" secondary={currentSelectPatientGroup.length} />
                            <ListItemSecondaryAction>

                                <IconButton onClick={() => { store.selectionStore.updateSelectedPatientGroup([]); }}>
                                    <Tooltip title="Remove">
                                        <CloseIcon />
                                    </Tooltip>
                                </IconButton>

                            </ListItemSecondaryAction>
                        </ListItem>) : <></>
                }
                {
                    currentOutputFilterSet.map((selectSet: SelectSet) => {
                        return (<ListItem key={`${selectSet.setName}selected`}>
                            <ListItemText key={`${selectSet.setName}selected`} primary={AcronymDictionary[selectSet.setName] ? AcronymDictionary[selectSet.setName] : selectSet.setName}
                                secondary={selectSet.setValues.sort().join(', ')} />
                            <ListItemSecondaryAction key={`${selectSet.setName}selected`}>
                                <IconButton key={`${selectSet.setName}selected`} onClick={() => { store.selectionStore.removeFilter(selectSet.setName); }}>
                                    <Tooltip title="Remove">
                                        <CloseIcon key={`${selectSet.setName}selected`} />
                                    </Tooltip>
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>);
                    })
                }

                <ListItem>
                    <ListItemText primary={<Title>Blood Component Filter</Title>} />
                    <ListItemSecondaryAction>

                        <IconButton onClick={() => { store.configStore.resetBloodFilter(); }}
                            disabled={!checkIfCanReset(bloodComponentFilter)}>
                            <Tooltip title="Reset">
                                <ReplayIcon />
                            </Tooltip>
                        </IconButton>

                    </ListItemSecondaryAction>
                </ListItem>
                {
                    BloodComponentOptions.map((d) => {
                        return (<ComponentRangePicker label={d.key} key={d.key} />);
                    })
                }

                <ListItem>
                    <ListItemText primary={<Title>Test Value Filter</Title>} />
                    <ListItemSecondaryAction>

                        <IconButton onClick={() => { store.configStore.resetTestValueFilter(); }}
                            disabled={!checkIfCanReset(testValueFilter)}>
                            <Tooltip title="Reset">
                                <ReplayIcon />
                            </Tooltip>
                        </IconButton>

                    </ListItemSecondaryAction>
                </ListItem>
                {
                    ScatterYOptions.map((d) => {
                        return (<ComponentRangePicker label={d.key} key={d.key} isTestValue={true} />);
                    })
                }
            </List >
        </UtilityContainer>
    );
};

export default observer(FilterBoard);