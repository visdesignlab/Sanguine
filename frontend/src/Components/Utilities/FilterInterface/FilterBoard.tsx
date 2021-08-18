import { Container, Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Tooltip } from "@material-ui/core";
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import Store from "../../../Interfaces/Store";
import ComponentRangePicker from "./ComponentRangePicker";
import { Title } from "../../../Presets/StyledComponents";
import { BloodComponentOptions, ScatterYOptions } from "../../../Presets/DataDict";
import ReplayIcon from '@material-ui/icons/Replay';
import { defaultState } from "../../../Interfaces/DefaultState";
import { useEffect } from "react";

const FilterBoard: FC = () => {

    const store = useContext(Store)
    const { rawDateRange } = store.state;
    const [beginDate, setBeginDate] = useState<number | null>(rawDateRange[0]);
    const [endDate, setEndDate] = useState<number | null>(rawDateRange[1]);

    const resetDateFilter = () => {
        setBeginDate(defaultState.rawDateRange[0]);
        setEndDate(defaultState.rawDateRange[1]);
        store.configStore.dateRangeChange(defaultState.rawDateRange);
    }

    return <Container>
        <Grid container direction="row" justifyContent="space-evenly"
            alignItems="flex-start" spacing={2}>
            <Grid item xs={2}>

                <List dense>
                    <ListItem>
                        <ListItemText primary={<Title>
                            Pick Date Range
                        </Title>} />
                        <ListItemSecondaryAction>
                            <Tooltip title="Reset">
                                <IconButton onClick={resetDateFilter}>
                                    <ReplayIcon />
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



            </Grid>
            <Grid item xs={3} >
                <List dense>
                    <ListItem>
                        <ListItemText primary={<Title>Blood Component Filter</Title>} />
                        <ListItemSecondaryAction>
                            <Tooltip title="Reset">
                                <IconButton onClick={() => { store.configStore.resetBloodFilter() }}>
                                    <ReplayIcon />
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
                                <IconButton onClick={() => { store.configStore.resetTestValueFilter() }}>
                                    <ReplayIcon />
                                </IconButton>
                            </Tooltip>
                        </ListItemSecondaryAction>
                    </ListItem>
                    {ScatterYOptions.map((d) => {
                        return (<ComponentRangePicker label={d.key} key={d.key} isTestValue={true} />)
                    })}
                </List>
            </Grid>
        </Grid>
    </Container >
}

export default observer(FilterBoard)