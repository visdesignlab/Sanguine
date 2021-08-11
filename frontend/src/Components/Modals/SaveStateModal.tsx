import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, TextField } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { observer } from "mobx-react";
import { FC, useState, useContext } from "react";
import Store from "../../Interfaces/Store";
import { simulateAPIClick } from "../../Interfaces/UserManagement";


const SaveStateModal: FC = () => {
    const store = useContext(Store);
    const [stateName, setStateName] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [openErrorMessage, setOpenError] = useState(false);
    const [openSuccessMessage, setOpenSuccessMessage] = useState(false);

    const saveState = () => {
        const csrftoken = simulateAPIClick()
        //does the following ACAO needs to change?
        if (store.configStore.checkIfInSavedState(stateName)) {
            fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
                method: `PUT`,
                credentials: "include",
                headers: {
                    'Accept': 'application/x-www-form-urlencoded',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrftoken || '',
                    "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                    "Access-Control-Allow-Credentials": "true",
                },
                body: JSON.stringify({ old_name: stateName, new_name: stateName, new_definition: store.provenance.exportState(false) })
            }).then(response => {
                if (response.status === 200) {
                    setOpenSuccessMessage(true)
                    store.configStore.openSaveStateDialog = false
                    setStateName("")
                    setErrorMessage("")
                } else {
                    response.text().then(error => {
                        setErrorMessage(error);
                        console.error('There has been a problem with your fetch operation:', response.statusText);
                    })
                }
            }).catch(error => {
                setErrorMessage(error)
                console.error('There has been a problem with your fetch operation:', error);
            })
        } else {
            fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
                method: 'POST',
                credentials: "include",
                headers: {
                    'Accept': 'application/x-www-form-urlencoded',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrftoken || '',
                    "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                    "Access-Control-Allow-Credentials": "true",
                },
                body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&definition=${store.provenance.exportState(false)}`
            })
                .then(response => {
                    if (response.status === 200) {
                        store.configStore.openSaveStateDialog = false;
                        store.configStore.addNewState(stateName)
                        setStateName("")
                        setErrorMessage("")
                    } else {
                        response.text().then(error => {
                            setErrorMessage(response.statusText);
                            setOpenError(true)
                            console.error('There has been a problem with your fetch operation:', response.statusText);
                        })
                    }
                })
        }

    }

    return <div>
        <Dialog open={store.configStore.openSaveStateDialog}>
            <DialogTitle>Save the current state</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Save the current state with a state name, and then click save.
                </DialogContentText>
                <TextField label="State Name" onChange={(e) => { setStateName(e.target.value) }} value={stateName} />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { store.configStore.openSaveStateDialog = false }}>Cancel</Button>
                <Button onClick={() => { saveState() }}>Confirm</Button>
            </DialogActions>
        </Dialog>
        <Snackbar open={openErrorMessage} autoHideDuration={6000} onClose={() => { setOpenError(false) }}>
            <Alert onClose={() => { setOpenError(false); setErrorMessage("") }} severity="error">
                An error occured: {errorMessage}
            </Alert>
        </Snackbar>
        <Snackbar open={openSuccessMessage} autoHideDuration={6000} onClose={() => { setOpenSuccessMessage(false) }}>
            <Alert onClose={() => { setOpenSuccessMessage(false); }} severity="success">
                State saved!
            </Alert>
        </Snackbar>
    </div>
}

export default observer(SaveStateModal)