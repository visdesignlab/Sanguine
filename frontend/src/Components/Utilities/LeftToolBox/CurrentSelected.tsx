import { Container, List, Grid, ListItem, Button, ButtonGroup, ListItemText } from "@material-ui/core";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";
import Store from "../../../Interfaces/Store";
// import { Grid, Container, List, Button } from "semantic-ui-react";
//import { AcronymDictionary } from "../../../Presets/DataDict";
import { Title, useStyles } from "../../../Presets/StyledComponents";

const CurrentSelected: FC = () => {
    const styles = useStyles();
    const store = useContext(Store);
    const { currentBrushedPatientGroup } = store.state

    return (
        <Grid item className={styles.gridWidth}>
            <Container style={{ height: "15vh" }}>
                <List dense>
                    <ListItem >
                        <Title>Current Selected</Title>
                    </ListItem>

                    {currentBrushedPatientGroup.length > 0 ?
                        <ListItem alignItems="flex-start" style={{ width: "100%" }}>
                            <ListItemText primary="Current Brushed Patients"
                                secondary={currentBrushedPatientGroup.length} />
                        </ListItem>
                        : <></>}

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
                <ButtonGroup style={{ textAlign: "center" }}>
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