import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, FormGroup, Radio, RadioGroup, Snackbar, Switch, TextField } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { observer } from "mobx-react";
import { FC, useState, useContext } from "react";
import Store from "../../Interfaces/Store";
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { SnackBarCloseTime } from "../../Presets/Constants";


const SaveStateModal: FC = () => {
    const store = useContext(Store);
    const [stateName, setStateName] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [openErrorMessage, setOpenError] = useState(false);
    const [openSuccessMessage, setOpenSuccessMessage] = useState(false);
    const [publicAccess, setPublicAccess] = useState(false);



    const saveState = () => {
        const csrftoken = simulateAPIClick()
        if (store.configStore.checkIfInSavedState(stateName)) {
            setErrorMessage("State name duplicate. Please rename.")
            setOpenError(true);
            // fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
            //     method: `PUT`,
            //     credentials: "include",
            //     headers: {
            //         'Accept': 'application/x-www-form-urlencoded',
            //         'Content-Type': 'application/x-www-form-urlencoded',
            //         'X-CSRFToken': csrftoken || '',
            //         "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
            //         "Access-Control-Allow-Credentials": "true",
            //     },
            //     body: JSON.stringify({ old_name: stateName, new_name: stateName, new_definition: store.provenance.exportState(false) })
            // }).then(response => {
            //     if (response.status === 200) {
            //         onSuccess(false);
            //     } else {
            //         response.text().then(error => {
            //             onFail(response.statusText);
            //         })
            //     }
            // }).catch(error => {
            //     onFail(error.toString())
            // })
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
                body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&definition=${store.provenance.exportState(false)}&public=${publicAccess.toString()}`
            }).then(response => {
                if (response.status === 200) {
                    onSuccess(true);
                } else {
                    response.text().then(error => {
                        onFail(response.statusText);

                    })
                }
            }).catch(error => {
                onFail(error.toString());
            })
        }

    }

    const onSuccess = (newState: boolean) => {
        store.configStore.openSaveStateDialog = false;
        if (newState) {
            store.configStore.addNewState(stateName);
        }
        setOpenSuccessMessage(true);
        setStateName("")
        setErrorMessage("")
        setPublicAccess(false);
        setOpenError(false)
    }

    const onFail = (errorMessage: string) => {
        setErrorMessage(errorMessage)
        setOpenError(true)
        console.error('There has been a problem with your fetch operation:', errorMessage);
    }

    return <div>
        <Dialog open={store.configStore.openSaveStateDialog}>
            <DialogTitle>Save the current state</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Save the current state with a state name, select the state privacy setting, and then click save.
                </DialogContentText>
                <FormGroup>
                    <TextField fullWidth label="State Name" onChange={(e) => { setStateName(e.target.value) }} value={stateName} />
                    <RadioGroup row onChange={(e) => { setPublicAccess(e.target.value === "PublicState") }} value={publicAccess ? "PublicState" : "PrivateState"}>
                        <FormControlLabel
                            value="PublicState"
                            control={
                                <Radio
                                    name="state-public"
                                    color="primary"
                                />
                            }
                            label="Public State"
                        />
                        <FormControlLabel
                            value="PrivateState"
                            control={
                                <Radio name="state-private" color="primary" />
                            }
                            label="Private State"
                        />
                    </RadioGroup>
                </FormGroup>



            </DialogContent>
            <DialogActions>
                <Button onClick={() => { store.configStore.openSaveStateDialog = false }}>Cancel</Button>
                <Button color="primary" disabled={stateName.length === 0} onClick={() => { saveState() }}>Confirm</Button>
            </DialogActions>
        </Dialog>
        <Snackbar open={openErrorMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenError(false) }}>
            <Alert onClose={() => { setOpenError(false); setErrorMessage("") }} severity="error">
                An error occured: {errorMessage}
            </Alert>
        </Snackbar>
        <Snackbar open={openSuccessMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenSuccessMessage(false) }}>
            <Alert onClose={() => { setOpenSuccessMessage(false); }} severity="success">
                State saved!
            </Alert>
        </Snackbar>
    </div>
}

export default observer(SaveStateModal)