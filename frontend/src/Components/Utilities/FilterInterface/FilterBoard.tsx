import { Container, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Tooltip } from "@material-ui/core";
import DateFnsUtils from '@date-io/date-fns';
import CloseIcon from '@material-ui/icons/Close';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import { AcronymDictionary, OutcomeOptions } from "../../../Presets/DataDict"
import Store from "../../../Interfaces/Store";
import ComponentRangePicker from "./ComponentRangePicker";
import { Title, useStyles } from "../../../Presets/StyledComponents";
import { BloodComponentOptions, ScatterYOptions } from "../../../Presets/DataDict";
import ClearAllIcon from '@material-ui/icons/ClearAll';
import { defaultState } from "../../../Interfaces/DefaultState";
import OutcomeChipGroup from "./OutcomeChipGroup";
import SurgeryUrgencyChipGroup from "./SurgeryUrgencyChipGroup";
import { SelectSet } from "../../../Interfaces/Types/SelectionTypes";


const FilterBoard: FC = () => {

    const store = useContext(Store);
    const styles = useStyles()
    const { rawDateRange, outcomeFilter, surgeryUrgencySelection, currentSelectPatientGroup, currentOutputFilterSet, bloodComponentFilter, testValueFilter } = store.state;
    const [beginDate, setBeginDate] = useState<number | null>(rawDateRange[0]);
    const [endDate, setEndDate] = useState<number | null>(rawDateRange[1]);

    const resetDateFilter = () => {
        setBeginDate(defaultState.rawDateRange[0]);
        setEndDate(defaultState.rawDateRange[1]);
        store.configStore.dateRangeChange(defaultState.rawDateRange);
    }

    const checkIfCanReset = (filterInput: any) => {

        let canReset = false;

        Object.entries(filterInput).map(([filterName, filterValue]) => {

            if ((filterValue as any)[0] > 0 || ((filterValue as any)[1] < store.configStore.filterRange[filterName])) {
                canReset = true
            }
        })
        return canReset
    }

    return <Drawer
        className={styles.drawer}
        anchor="left"
        classes={{
            paper: styles.drawerPaper,
        }}
        onClose={() => { store.configStore.openDrawer = false }}
        open={store.configStore.openDrawer}>

        <IconButton style={{ alignSelf: "end" }} onClick={() => { store.configStore.openDrawer = false }}>
            Filter
            <ChevronLeftIcon />
        </IconButton>

        <Divider />
        <List dense>
            <ListItem>
                <ListItemText primary={<Title>
                    Pick Date Range
                </Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Reset">
                        <IconButton onClick={resetDateFilter}
                            disabled={(rawDateRange[0] === defaultState.rawDateRange[0]) && (rawDateRange[1] === defaultState.rawDateRange[1])}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
                <ListItemText primary="Date From" secondary={<MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="MM/dd/yyyy"
                        value={beginDate}
                        onChange={(d) => {
                            if (d) {
                                setBeginDate(d.getTime());
                                store.configStore.dateRangeChange([d.getTime(), rawDateRange[1]])
                            } else {
                                setBeginDate(rawDateRange[0])
                            }
                        }} />
                </MuiPickersUtilsProvider>} />
            </ListItem>
            <ListItem>
                <ListItemText primary="To" secondary={
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <KeyboardDatePicker
                            disableToolbar
                            variant="inline"
                            format="MM/dd/yyyy"
                            value={endDate}
                            onChange={(d) => {
                                if (d) {
                                    setEndDate(d.getTime());
                                    store.configStore.dateRangeChange([rawDateRange[0], d.getTime()])
                                } else {
                                    setEndDate(rawDateRange[1])
                                }
                            }} />
                    </MuiPickersUtilsProvider>} />
            </ListItem>
        </List>


        <List dense>
            <ListItem>
                <ListItemText primary={<Title>
                    Outcome / Intervention Filter
                </Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Clear All">
                        <IconButton
                            onClick={() => { store.configStore.changeOutcomeFilter([]) }}
                            disabled={outcomeFilter.length === 0}
                        >
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            <OutcomeChipGroup />
        </List>

        <List dense>
            <ListItem>
                <ListItemText primary={<Title>Surgery Urgency Filter</Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Clear All">
                        <IconButton
                            onClick={() => { store.configStore.changeSurgeryUrgencySelection([true, true, true]) }}
                            disabled={surgeryUrgencySelection[0] && surgeryUrgencySelection[1] && surgeryUrgencySelection[2]}
                        >
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            <SurgeryUrgencyChipGroup />
        </List>

        <List dense>
            <ListItem>
                <ListItemText primary={<Title>Selection Filter</Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Clear All">
                        <IconButton onClick={() => { store.selectionStore.clearSelectionFilter() }}
                            disabled={currentSelectPatientGroup.length === 0 && currentOutputFilterSet.length === 0}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            {currentSelectPatientGroup.length > 0 ? (
                <ListItem key="PatientgroupSelected">
                    <ListItemText primary="Cases Filtered" secondary={currentSelectPatientGroup.length} />
                    <ListItemSecondaryAction>

                        <IconButton onClick={() => { store.selectionStore.updateSelectedPatientGroup([]) }}>
                            <Tooltip title="Remove">
                                <CloseIcon />
                            </Tooltip>
                        </IconButton>

                    </ListItemSecondaryAction>
                </ListItem>) : <></>}
            {currentOutputFilterSet.map((selectSet: SelectSet) => {
                return (<ListItem key={`${selectSet.setName}selected`}>
                    <ListItemText key={`${selectSet.setName}selected`} primary={AcronymDictionary[selectSet.setName] ? AcronymDictionary[selectSet.setName] : selectSet.setName}
                        secondary={selectSet.setValues.sort().join(', ')} />
                    <ListItemSecondaryAction key={`${selectSet.setName}selected`}>
                        <IconButton key={`${selectSet.setName}selected`} onClick={() => { store.selectionStore.removeFilter(selectSet.setName) }}>
                            <Tooltip title="Remove">
                                <CloseIcon key={`${selectSet.setName}selected`} />
                            </Tooltip>
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>)
            })}
        </List>

        <List dense>
            <ListItem>
                <ListItemText primary={<Title>Blood Component Filter</Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Reset">
                        <IconButton onClick={() => { store.configStore.resetBloodFilter() }}
                            disabled={!checkIfCanReset(bloodComponentFilter)}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            {BloodComponentOptions.map((d) => {
                return (<ComponentRangePicker label={d.key} key={d.key} />)
            })}
        </List>
        <List dense>
            <ListItem>
                <ListItemText primary={<Title>Test Value Filter</Title>} />
                <ListItemSecondaryAction>
                    <Tooltip title="Reset">
                        <IconButton onClick={() => { store.configStore.resetTestValueFilter() }}
                            disabled={!checkIfCanReset(testValueFilter)}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
            {ScatterYOptions.map((d) => {
                return (<ComponentRangePicker label={d.key} key={d.key} isTestValue={true} />)
            })}
        </List>

    </Drawer >
}

export default observer(FilterBoard)