import { Container, Grid, List, ListItem, ListItemText } from "@material-ui/core";
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import Store from "../../../Interfaces/Store";
import RangePicker from "./RangePicker";
import { Title } from "../../../Presets/StyledComponents";

const FilterBoard: FC = () => {

    const store = useContext(Store)
    const [beginDate, setBeginDate] = useState<number | null>(store.state.rawDateRange[0]);
    const [endDate, setEndDate] = useState<number | null>(store.state.rawDateRange[1]);

    return <Container>
        <Grid container direction="row">
            <Grid item xs={6}>

                <List dense>
                    <ListItem>
                        <Title>
                            Pick Date Range
                        </Title>
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
                                        store.configStore.dateRangeChange([d.getTime(), store.state.rawDateRange[1]])
                                    } else {
                                        setBeginDate(store.state.rawDateRange[0])
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
                                            store.configStore.dateRangeChange([store.state.rawDateRange[0], d.getTime()])
                                        } else {
                                            setEndDate(store.state.rawDateRange[1])
                                        }
                                    }} />
                            </MuiPickersUtilsProvider>} />
                    </ListItem>
                </List>



            </Grid>
            <Grid item xs={6} >
                <List dense>
                    <ListItem><Title>Blood Component Filter</Title></ListItem>
                    <RangePicker label="PRBC_UNITS" />
                    <RangePicker label="FFP_UNITS" />
                    <RangePicker label="CRYO_UNITS" />
                    <RangePicker label="PLT_UNITS" />
                    <RangePicker label="CELL_SAVER_ML" />
                </List>
            </Grid>
        </Grid>
    </Container >
}

export default observer(FilterBoard)