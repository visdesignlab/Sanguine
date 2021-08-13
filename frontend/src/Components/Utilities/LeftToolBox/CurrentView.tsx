import { timeFormat } from "d3"
import { observer } from "mobx-react"
import { useContext } from "react"
import { FC } from "react"
import { defaultState } from "../../../Interfaces/DefaultState"
import Store from "../../../Interfaces/Store"
import { AcronymDictionary, OutcomeOptions } from "../../../Presets/DataDict"
import { StyledDate, Title, useStyles } from "../../../Presets/StyledComponents"
import Container from "@material-ui/core/Container";
import CloseIcon from '@material-ui/icons/Close';
import List from "@material-ui/core/List";
import { Box, Chip, ListItem, ListItemSecondaryAction, ListItemText, Select, Switch, Grid, IconButton, Tooltip } from "@material-ui/core";
import { DropdownGenerator } from "../../../HelperFunctions/DropdownGenerator"
import { SelectSet } from "../../../Interfaces/Types/SelectionTypes"
import ErrorIcon from '@material-ui/icons/Error';

type Props = { totalCaseNum: number }

const CurrentView: FC<Props> = ({ totalCaseNum }: Props) => {
    const store = useContext(Store)
    const { surgeryUrgencySelection, currentSelectPatientGroup, currentOutputFilterSet } = store.state;
    const styles = useStyles();

    const onDateChange = (event: any, data: any) => {
        if (!data.value) {
            store.configStore.dateRangeChange(defaultState.rawDateRange)
        }
        else if (data.value.length > 1) {
            store.configStore.dateRangeChange([data.value[0], data.value[1]])
        }
    }


    const generateSurgery = () => {
        let output: any[] = []
        if (store.state.proceduresSelection.length === 0) {
            output.push(<span>All</span>);
        } else {
            store.state.proceduresSelection.forEach((d, i) => {
                const stringArray = d.split(" ")
                stringArray.forEach((word, index) => {
                    if ((AcronymDictionary as any)[word]) {
                        output.push((
                            <Tooltip title={<div className={styles.tooltipFont}>{(AcronymDictionary as any)[word]}</div>}>
                                <div className="tooltip" style={{ cursor: "help" }}>
                                    {word}
                                </div>
                            </Tooltip>))
                    } else {
                        output.push((<span>{`${index !== 0 ? " " : ""}${word}${index !== stringArray.length - 1 ? " " : ""}`}</span>))
                    }
                })
                if (i !== store.state.proceduresSelection.length - 1) {
                    output.push((<span>, </span>))
                }
            })
        }
        return output
    }


    return (
        <Grid item className={styles.gridWidth}>
            <Container className={styles.containerWidth} style={{ height: "40vh" }}>
                <List dense >
                    <ListItem style={{ textAlign: "left" }}>
                        <Title>Current View</Title>
                    </ListItem>

                    <ListItem alignItems="flex-start" style={{ width: "100%" }} key="Date">
                        <ListItemText primary="Date Range"
                            secondary={<StyledDate
                                onChange={onDateChange}
                                placeholder={`${timeFormat("%Y-%m-%d")(new Date(store.state.rawDateRange[0]))} - ${timeFormat("%Y-%m-%d")(new Date(store.state.rawDateRange[1]))}`}
                                type="range" />} />

                    </ListItem>

                    <ListItem key="Outcomes">
                        <ListItemText primary="Outcomes/Interventions"
                            secondary={
                                <Select displayEmpty value={store.state.outcomeFilter} onChange={(e) => { store.configStore.changeOutcomeFilter((e.target.value as string)) }}  >
                                    {DropdownGenerator(OutcomeOptions, true)}
                                </Select>} />
                    </ListItem>

                    <ListItem key="Procedure Types">
                        <ListItemText primary="Surgery Types" secondary={
                            <Box className={useStyles().root}>
                                <Chip size="small" label="Urgent" clickable color={surgeryUrgencySelection[0] ? "primary" : undefined}
                                    onClick={() => { store.configStore.changeSurgeryUrgencySelection([!surgeryUrgencySelection[0], surgeryUrgencySelection[1], surgeryUrgencySelection[2]]) }} />
                                <Chip size="small" label="Elective" clickable color={surgeryUrgencySelection[1] ? "primary" : undefined}
                                    onClick={() => { store.configStore.changeSurgeryUrgencySelection([surgeryUrgencySelection[0], !surgeryUrgencySelection[1], surgeryUrgencySelection[2]]) }} />
                                <Chip size="small" label="Emergent" clickable color={surgeryUrgencySelection[2] ? "primary" : undefined}
                                    onClick={() => { store.configStore.changeSurgeryUrgencySelection([surgeryUrgencySelection[0], surgeryUrgencySelection[1], !surgeryUrgencySelection[2]]) }} /></Box>} />
                    </ListItem>
                    <ListItem key="Show Zero">
                        <ListItemText primary="Show Zero Transfused"
                        ></ListItemText>
                        <ListItemSecondaryAction>
                            <Switch
                                checked={store.state.showZero}
                                color="primary"
                                onChange={(e) => { store.configStore.toggleShowZero(e.target.checked) }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem key="AggreCaseCount">
                        <ListItemText primary={<div>
                            Aggregated Cases

                        </div>}
                            secondary={`${store.chartStore.totalAggregatedCaseCount}/${totalCaseNum}`} />

                    </ListItem>

                    <ListItem key="IndiCaseCount">
                        <ListItemText primary="Individual Cases"
                            secondary={`${store.chartStore.totalIndividualCaseCount}/${totalCaseNum}`} />
                        <ListItemSecondaryAction>
                            <Tooltip title={<div className={styles.tooltipFont}>Case count can be reduced by both filter and missing data.</div>}>
                                <IconButton size="small" disableRipple >
                                    <ErrorIcon />
                                </IconButton>

                            </Tooltip>
                        </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem key="SurgeryList">
                        <ListItemText primary="Procedure" secondary={generateSurgery()} />
                    </ListItem>
                    {currentSelectPatientGroup.length > 0 ? (
                        <ListItem key="PatientgroupSelected">
                            <ListItemText primary="Cases Filtered" secondary={currentSelectPatientGroup.length} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => { store.selectionStore.updateSelectedPatientGroup([]) }}>
                                    <CloseIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>) : <></>}
                    {currentOutputFilterSet.map((selectSet: SelectSet) => {
                        return (<ListItem key={`${selectSet.setName}selected`}>
                            <ListItemText primary={AcronymDictionary[selectSet.setName] ? AcronymDictionary[selectSet.setName] : selectSet.setName}
                                secondary={selectSet.setValues.sort().join(', ')} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => { store.selectionStore.removeFilter(selectSet.setName) }}>
                                    <CloseIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>)
                    })}
                </List>
            </Container>
        </Grid>
    )




}

export default observer(CurrentView)