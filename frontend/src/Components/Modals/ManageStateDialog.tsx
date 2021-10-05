import { Button, DialogActions, DialogContent, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Tooltip } from "@material-ui/core";
import { Dialog, DialogTitle } from "@material-ui/core";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";
import DeleteIcon from '@material-ui/icons/Delete';
import ShareIcon from '@material-ui/icons/Share';
import EditIcon from '@material-ui/icons/Edit';
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { observer } from "mobx-react";
import StateAccessControl from "./StateAccessControl";
import { useStyles } from "../../Presets/StyledComponents";

const ManageStateDialog: FC = () => {
    const store = useContext(Store);
    const styles = useStyles();
    const [stateNameToChange, setStateNameToChange] = useState("")


    const removeState = (stateName: string) => {
        const csrftoken = simulateAPIClick()
        fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
            method: 'DELETE',
            credentials: "include",
            headers: {
                'Accept': 'application/x-www-form-urlencoded',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrftoken || '',
                "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                "Access-Control-Allow-Credentials": "true",
            },
            body: JSON.stringify({ name: stateName })
        }).then(response => {
            if (response.status === 200) {
                if (store.configStore.loadedStateName === stateName) {
                    store.configStore.loadedStateName = "";
                }
                store.configStore.savedState = store.configStore.savedState.filter(d => d !== stateName)
                store.configStore.snackBarIsError = false;
                store.configStore.snackBarMessage = "Deletion succeed."
                store.configStore.openSnackBar = true;
            } else {
                response.text().then(error => {
                    store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
                    store.configStore.snackBarIsError = true;
                    store.configStore.openSnackBar = true;
                    console.error('There has been a problem with your fetch operation:', response.statusText);
                })
            }
        }).catch(error => {
            store.configStore.snackBarMessage = `An error occurred: ${error}`;
            store.configStore.snackBarIsError = true;
            store.configStore.openSnackBar = true;
            console.error('There has been a problem with your fetch operation:', error);
        })
    }

    const changeStateAccess = (stateName: string) => {
        store.configStore.openManageStateDialog = false;
        store.configStore.openStateAccessControl = true;
        setStateNameToChange(stateName);
    }

    // const changeStateName = ()

    return (<div >
        <Dialog open={store.configStore.openManageStateDialog} >
            <DialogTitle>Manage Saved States</DialogTitle>
            <DialogContent style={{ maxHeight: "300px", minWidth: "50vh" }}>
                <List>{
                    store.configStore.savedState.map((d) => {
                        return (<ListItem>
                            <ListItemText primary={d} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => {
                                    store.configStore.openManageStateDialog = false;
                                    store.configStore.stateToUpdate = d;
                                    store.configStore.openSaveStateDialog = true;
                                }}>
                                    <Tooltip title={<div>  <p className={styles.tooltipFont}>Edit State</p></div>}>
                                        <EditIcon />
                                    </Tooltip>
                                </IconButton>

                                <IconButton onClick={() => { changeStateAccess(d) }}>
                                    <Tooltip title={<div>  <p className={styles.tooltipFont}>Manage Sharing</p></div>}>
                                        <ShareIcon />
                                    </Tooltip>
                                </IconButton>
                                <IconButton onClick={() => { removeState(d) }}>
                                    <Tooltip title={<div>  <p className={styles.tooltipFont}>Delete State</p></div>}>
                                        <DeleteIcon />
                                    </Tooltip>
                                </IconButton>

                            </ListItemSecondaryAction>
                        </ListItem>)
                    })}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { store.configStore.openManageStateDialog = false }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
        <StateAccessControl stateName={stateNameToChange} />
    </div>)
}

export default observer(ManageStateDialog);