import { observer } from "mobx-react";
import { FC } from "react";
import { Grid, Container, List, Button } from "semantic-ui-react";
//import { AcronymDictionary } from "../../../Presets/DataDict";
import { Title } from "../../../Presets/StyledComponents";

const CurrentSelected: FC = () => {
    return (<Grid.Row centered >
        <Container style={{ height: "15vh", paddingLeft: "15px" }}>
            <List>

                <List.Header style={{ textAlign: "left" }}>
                    <Title>Current Selected</Title>
                </List.Header>

                {/* {generateBrushPatientItem()} */}

                {/* {currentSelectSet.map((selectSet) => {
                    return <FilterListIT
                        key={`${selectSet.setName}currentselecting`}
                        onClick={() => { actions.clearSelectSet(selectSet.setName) }}
                    >
                        <List.Header>{AcronymDictionary[selectSet.setName]}</List.Header>
                        <List.Content floated="right"><DispearingIcon name="close" /></List.Content>
                        <List.Content>{selectSet.setValues.sort().join(', ')}</List.Content>
                    </FilterListIT>
                })} */}

            </List>

            <Button
                // disabled={!(currentSelectSet.length > 0 || currentBrushedPatientGroup.length > 0)}
                basic
                size="tiny"
                content="Add to Filter"
            //onClick={actions.currentOutputFilterSetChange}
            />
            <Button
                // disabled={!(currentOutputFilterSet.length > 0 || currentSelectPatientGroup.length > 0)}
                basic
                size="tiny"
                content="Clear Filter"
            //onClick={() => { actions.clearOutputFilterSet() }}
            />
        </Container>
    </Grid.Row>)
}

export default observer(CurrentSelected)