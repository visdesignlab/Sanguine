import { Container, List, Grid, ListItem, Button, ButtonGroup } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC } from "react";
// import { Grid, Container, List, Button } from "semantic-ui-react";
//import { AcronymDictionary } from "../../../Presets/DataDict";
import { Title, useStyles } from "../../../Presets/StyledComponents";

const CurrentSelected: FC = () => {
    const styles = useStyles()
    return (
        <Grid item >
            <Container>
                <List dense>
                    <ListItem >
                        <Title>Current Selected</Title>
                    </ListItem>

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
                <ButtonGroup>
                    <Button
                        // disabled={!(currentSelectSet.length > 0 || currentBrushedPatientGroup.length > 0)}
                        variant="outlined"
                        size="small"
                        className={styles.tinyFont}
                    //onClick={actions.currentOutputFilterSetChange}
                    >Add to Filter</Button>
                    <Button
                        // disabled={!(currentOutputFilterSet.length > 0 || currentSelectPatientGroup.length > 0)}
                        variant="outlined"
                        size="small"
                        className={styles.tinyFont}
                    //onClick={() => { actions.clearOutputFilterSet() }}
                    >Clear Filter</Button>
                </ButtonGroup>
            </Container>
        </Grid>)
}

export default observer(CurrentSelected)