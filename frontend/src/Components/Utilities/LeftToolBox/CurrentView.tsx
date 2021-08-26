import { timeFormat } from "d3"
import { observer } from "mobx-react"
import { useContext } from "react"
import { FC } from "react"
import { defaultState } from "../../../Interfaces/DefaultState"
import Store from "../../../Interfaces/Store"
import { AcronymDictionary, OutcomeOptions } from "../../../Presets/DataDict"
import { Title, useStyles } from "../../../Presets/StyledComponents"
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
    const { surgeryUrgencySelection, currentSelectPatientGroup, currentOutputFilterSet, outcomeFilter } = store.state;
    const styles = useStyles();


    const generateSurgery = () => {
        let output: any[] = []
        if (store.state.proceduresSelection.length === 0) {
            output.push(<span key={`all`}>All</span>);
        } else {
            store.state.proceduresSelection.forEach((d, i) => {
                const stringArray = d.split(" ")
                stringArray.forEach((word, index) => {
                    if ((AcronymDictionary as any)[word]) {
                        output.push((
                            <Tooltip key={`${d}-${word}`} title={<div key={`${d}-${word}`} className={styles.tooltipFont}>{(AcronymDictionary as any)[word]}</div>}>
                                <div className="tooltip" key={`${d}-${word}`} style={{ cursor: "help" }}>
                                    {word}
                                </div>
                            </Tooltip>))
                    } else {
                        output.push((<span key={`${d}-${word}`}>{`${index !== 0 ? " " : ""}${word}${index !== stringArray.length - 1 ? " " : ""}`}</span>))
                    }
                })
                if (i !== store.state.proceduresSelection.length - 1) {
                    output.push((<span key={`${d}-comma`}>, </span>))
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
                            secondary={`${timeFormat("%b %d, %Y")(new Date(store.state.rawDateRange[0]))} - ${timeFormat("%b %d, %Y")(new Date(store.state.rawDateRange[1]))}`} />

                    </ListItem>

                    <ListItem key="Outcomes">
                        <ListItemText primary="Outcomes / Interventions"
                            secondary={outcomeFilter.length > 0 ? (outcomeFilter.map((d, i) => `${AcronymDictionary[d] ? AcronymDictionary[d] : d} ${(i + 1) !== outcomeFilter.length ? "AND " : ""}`)) : "NONE"} />
                    </ListItem>

                    <ListItem key="Procedure Types">
                        <ListItemText primary="Surgery Urgency" secondary={
                            `${surgeryUrgencySelection[0] ? "Urgent, " : ""}
                            ${surgeryUrgencySelection[1] ? "Elective, " : ""}
                            ${surgeryUrgencySelection[2] ? "Emergent" : ""}`} />
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
                        <ListItemText primary="Aggregated Cases"
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
                            <ListItemText key={`${selectSet.setName}selected`} primary={AcronymDictionary[selectSet.setName] ? AcronymDictionary[selectSet.setName] : selectSet.setName}
                                secondary={selectSet.setValues.sort().join(', ')} />
                            <ListItemSecondaryAction key={`${selectSet.setName}selected`}>
                                <IconButton key={`${selectSet.setName}selected`} onClick={() => { store.selectionStore.removeFilter(selectSet.setName) }}>
                                    <CloseIcon key={`${selectSet.setName}selected`} />
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