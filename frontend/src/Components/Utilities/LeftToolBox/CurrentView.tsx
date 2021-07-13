import { timeFormat } from "d3"
import { observer } from "mobx-react"
import { useContext } from "react"
import { FC } from "react"
import { Checkbox, Container, Dropdown, Grid, List } from "semantic-ui-react"
import { defaultState } from "../../../Interfaces/DefaultState"
import Store from "../../../Interfaces/Store"
import { AcronymDictionary, OutcomeOptions, SurgeryUrgency } from "../../../Presets/DataDict"
import { LeftToolBarListItem, StyledDate, Title } from "../../../Presets/StyledComponents"

type Props = { totalCaseNum: number }

const CurrentView: FC<Props> = ({ totalCaseNum }: Props) => {
    const store = useContext(Store)

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
        <Grid.Row centered style={{ paddingLeft: "15px", height: "40vh" }}>
            <Container>
                <List>
                    <List.Header style={{ textAlign: "left" }}>
                        <Title>Current View</Title>
                    </List.Header>

                    <LeftToolBarListItem style={{ width: "100%" }} key="Date">
                        <List.Header>Date Range</List.Header>
                        <StyledDate
                            onChange={onDateChange}
                            placeholder={`${timeFormat("%Y-%m-%d")(new Date(store.state.rawDateRange[0]))} - ${timeFormat("%Y-%m-%d")(new Date(store.state.rawDateRange[1]))}`}
                            type="range" />
                    </LeftToolBarListItem>

                    <LeftToolBarListItem key="Outcomes">
                        <List.Header>Outcomes/Interventions</List.Header>
                        <Dropdown
                            value={store.state.outcomesSelection}
                            clearable
                            selection
                            options={OutcomeOptions}
                            onChange={(e, v) => { store.configStore.changeOutcomeFilter((v.value as string)) }} />
                    </LeftToolBarListItem>

                    <LeftToolBarListItem key="Procedure Types">
                        <List.Header>Surgery Types</List.Header>
                        <Dropdown options={SurgeryUrgency} clearable multiple selection
                            value={calculateSelectedProcedureType()}
                            onChange={(e, v) => {
                                let newSurgerySelection: [boolean, boolean, boolean] = [false, false, false];
                                if (v.value) {
                                    (v.value as number[]).forEach(d => { newSurgerySelection[d] = true })
                                }
                                store.configStore.changeSurgeryUrgencySelection(newSurgerySelection)
                            }} />
                    </LeftToolBarListItem>


                    <LeftToolBarListItem key="Show Zero">
                        <List.Header>Show Zero Transfused</List.Header>
                        <Checkbox
                            checked={store.state.showZero}
                            onClick={(e, v) => { store.configStore.toggleShowZero(v.checked || false) }}
                            toggle />
                    </LeftToolBarListItem>

                    <LeftToolBarListItem key="AggreCaseCount">
                        <List.Header>Aggregated Cases</List.Header>
                        <List.Content>
                            {store.chartStore.totalAggregatedCaseCount}/{totalCaseNum}
                        </List.Content>
                    </LeftToolBarListItem>

                    <LeftToolBarListItem key="IndiCaseCount">
                        <List.Header>Individual Cases</List.Header>
                        <List.Content>
                            {store.chartStore.totalIndividualCaseCount}/{totalCaseNum}
                        </List.Content>
                    </LeftToolBarListItem>

                    <LeftToolBarListItem key="SurgeryList">
                        <List.Header>Procedures</List.Header>
                        <List.Content>{generateSurgery()} </List.Content>
                    </LeftToolBarListItem>
                    {/* {generatePatientSelection()}


                    {currentOutputFilterSet.map((selectSet) => {
                        return <FilterListIT
                            //icon="caret right"
                            key={`${selectSet.setName}selected`}
                            onClick={() => { actions.clearOutputFilterSet(selectSet.setName) }}
                        >
                            <List.Header>{AcronymDictionary[selectSet.setName]}</List.Header>
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