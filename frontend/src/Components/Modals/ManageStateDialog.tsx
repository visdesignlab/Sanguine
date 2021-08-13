import { Button, DialogActions, DialogContent, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Snackbar } from "@material-ui/core";
import { Dialog, DialogTitle } from "@material-ui/core";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";
import DeleteIcon from '@material-ui/icons/Delete';
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { Alert } from "@material-ui/lab";
import { observer } from "mobx-react";
import { SnackBarCloseTime } from "../../Presets/Constants";

const ManageStateDialog: FC = () => {
    const store = useContext(Store);
    const [errorMessage, setErrorMessage] = useState("")
    const [openErrorMessage, setOpenError] = useState(false);
    const [openSuccess, setOpenSuccess] = useState(false);


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
                store.configStore.savedState = store.configStore.savedState.filter(d => d !== stateName)
                setOpenSuccess(true);
                setErrorMessage("")
            } else {
                response.text().then(error => {
                    setErrorMessage(response.statusText);
                    setOpenError(true)
                    console.error('There has been a problem with your fetch operation:', response.statusText);
                })
            }
        }).catch(error => {
            setErrorMessage(error)
            setOpenError(true)
            console.error('There has been a problem with your fetch operation:', error);
        })
    }

    return (<div>
        <Dialog open={store.configStore.openManageStateDialog}>
            <DialogTitle>Manage Saved States</DialogTitle>
            <DialogContent style={{ maxHeight: "300px" }}>
                <List>{
                    store.configStore.savedState.map((d) => {
                        return (<ListItem>
                            <ListItemText primary={d} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => { removeState(d) }}>
                                    <DeleteIcon />
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
        <Snackbar open={openErrorMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenError(false) }}>
            <Alert onClose={() => { setOpenError(false); setErrorMessage("") }} severity="error">
                An error occured: {errorMessage}
            </Alert>
        </Snackbar>
        <Snackbar open={openSuccess} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenSuccess(false) }}>
            <Alert onClose={() => { setOpenSuccess(false) }} severity="success">
                Deletion succeed.
            </Alert>
        </Snackbar>
    </div>)
}

export default observer(ManageStateDialog);