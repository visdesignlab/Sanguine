import { Container, List, Grid, ListItem, Button, ButtonGroup, ListItemText, IconButton, ListItemSecondaryAction } from "@material-ui/core";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";
import Store from "../../../Interfaces/Store";
import CloseIcon from '@material-ui/icons/Close';
import { SelectSet } from "../../../Interfaces/Types/SelectionTypes";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { Title, useStyles } from "../../../Presets/StyledComponents";

const CurrentSelected: FC = () => {
    const styles = useStyles();
    const store = useContext(Store);
    const { currentBrushedPatientGroup, currentSelectSet } = store.state

    return (
        <Grid item className={styles.gridWidth}>
            <Container className={styles.containerWidth} style={{ height: "20vh", }}>
                <List dense>
                    <ListItem >
                        <Title>Currently Selected</Title>
                    </ListItem>

                    {currentBrushedPatientGroup.length > 0 ?
                        <ListItem alignItems="flex-start" style={{ width: "100%" }}>
                            <ListItemText primary="Current Brushed Patients"
                                secondary={currentBrushedPatientGroup.length} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => { store.selectionStore.updateBrush([]) }}>
                                    <CloseIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        : <></>}

                    {currentSelectSet.map((selectSet: SelectSet) => {
                        return (<ListItem key={`${selectSet.setName}selected`}>
                            <ListItemText primary={AcronymDictionary[selectSet.setName] ? AcronymDictionary[selectSet.setName] : selectSet.setName}
                                secondary={selectSet.setValues.sort().join(', ')} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => { store.selectionStore.clearSet(selectSet.setName) }}>
                                    <CloseIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>)
                    })}


                </List>
                <div style={{ textAlign: "center" }}>
                    <Button

                        disabled={!(currentSelectSet.length > 0 || currentBrushedPatientGroup.length > 0)}
                        variant="outlined"

                        className={styles.tinyFont}
                        onClick={() => { store.selectionStore.outputToFilter() }}
                    >Create Filter</Button>
                </div>
                {/* <Button
                        disabled={!(currentOutputFilterSet.length > 0 || currentSelectPatientGroup.length > 0)}
                        variant="outlined"
                        size="small"
                        className={styles.tinyFont}
                        onClick={() => { store.selectionStore.clearAllFilter() }}
                    >Clear Filter</Button> */}

            </Container>
        </Grid>)
}

export default observer(CurrentSelected)