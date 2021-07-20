import { timeFormat } from "d3"
import { observer } from "mobx-react"
import { useContext } from "react"
import { FC } from "react"
import { defaultState } from "../../../Interfaces/DefaultState"
import Store from "../../../Interfaces/Store"
import { AcronymDictionary, OutcomeOptions, SurgeryUrgency } from "../../../Presets/DataDict"
import { LeftToolBarListItem, StyledDate, Title, useStyles } from "../../../Presets/StyledComponents"
import Container from "@material-ui/core/Container";
import List from "@material-ui/core/List";
import { Box, Chip, ListItem, ListItemSecondaryAction, ListItemText, MenuItem, Select, Switch } from "@material-ui/core";
import { Grid } from "semantic-ui-react"
import { DropdownGenerator } from "../../../HelperFunctions/DropdownGenerator"

type Props = { totalCaseNum: number }

const CurrentView: FC<Props> = ({ totalCaseNum }: Props) => {
    const store = useContext(Store)
    const { surgeryUrgencySelection } = store.state;

    const onDateChange = (event: any, data: any) => {
        if (!data.value) {
            store.configStore.dateRangeChange(defaultState.rawDateRange)
        }
        else if (data.value.length > 1) {
            store.configStore.dateRangeChange([data.value[0], data.value[1]])
        }
    }

    const calculateSelectedProcedureType = () => {
        let output = store.state.surgeryUrgencySelection.map((d, i) => d ? i : -1)
        output = output.filter(d => d > -1)
        return output
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
                            <div className="tooltip" style={{ cursor: "help" }}>
                                {word}
                                <span className="tooltiptext">
                                    {`${(AcronymDictionary as any)[word]}`}
                                </span>
                            </div>))
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
        <Grid.Row centered style={{ height: "40vh" }}>
            <Container>
                <List dense>
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
                                <Select displayEmpty onChange={(e) => { store.configStore.changeOutcomeFilter((e.target.value as string)) }}  >
                                    {DropdownGenerator(OutcomeOptions, true)}
                                </Select>} />

                        {/* <Dropdown
                            value={store.state.outcomeFilter}
                            clearable
                            selection
                            options={OutcomeOptions}
                            onChange={(e, v) => { store.configStore.changeOutcomeFilter((v.value as string)) }} /> */}
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
                    </ListItem>

                    <ListItem key="SurgeryList">
                        <ListItemText primary="Procedure" secondary={generateSurgery()} />
                        {/* <List.Content>{generateSurgery()} </List.Content> */}
                    </ListItem>
                    {/* {generatePatientSelection()}


                    {currentOutputFilterSet.map((selectSet) => {
                        return <FilterListIT
                            //icon="caret right"
                            key={`${selectSet.setName}selected`}
                            onClick={() => { actions.clearOutputFilterSet(selectSet.setName) }}
                        >
                            <ListItemText>{AcronymDictionary[selectSet.setName]}</ListItemText>
                            <List.Content floated="right"><DispearingIcon name="close" /></List.Content>

                            <List.Content >{selectSet.setValues.sort().join(', ')}</List.Content>
                        </FilterListIT>
                    })} */}
                </List>
            </Container>
        </Grid.Row>
    )




}

export default observer(CurrentView)