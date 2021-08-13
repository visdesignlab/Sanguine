import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, FormGroup, InputAdornment, Snackbar, Switch, TextField } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { SnackBarCloseTime } from "../../Presets/Constants";

type Props = {
    stateName: string;
}
const UIDInputModal: FC<Props> = ({ stateName }: Props) => {
    const store = useContext(Store);
    const [uIDInput, setUIDInput] = useState("");
    const [writeAccess, setWriteAccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [openErrorMessage, setOpenErrorMessage] = useState(false);
    const [openSuccessMessage, setOpenSuccess] = useState(false)

    const shareState = () => {
        const csrftoken = simulateAPIClick()
        fetch(`${process.env.REACT_APP_QUERY_URL}share_state`, {
            method: `POST`,
            credentials: "include",
            headers: {
                'Accept': 'application/x-www-form-urlencoded',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrftoken || '',
                "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                "Access-Control-Allow-Credentials": "true",
            },
            body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&user=${`u${uIDInput}`}&role=${writeAccess ? 'WR' : 'RE'}`
        })
            .then(response => {
                if (response.status === 200) {
                    setOpenSuccess(true)
                    setUIDInput("");
                    setWriteAccess(false);
                    setErrorMessage("");
                    setOpenErrorMessage(false);
                    store.configStore.openShareUIDDialog = false;
                } else {
                    response.text().then(error => {
                        setErrorMessage(response.statusText);
                        setOpenErrorMessage(true)
                        console.error('There has been a problem with your fetch operation:', response.statusText);
                    })
                }
            }).catch(error => {
                setErrorMessage(error)
                console.error('There has been a problem with your fetch operation:', error);
            })


    }

    return (<div>
        <Dialog open={store.configStore.openShareUIDDialog}>
            <DialogTitle>Share through uID</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {`To share state ${stateName} with an authorized user of Sanguine, input their uID and select Read/Write acess`}
                </DialogContentText>
                <FormGroup>
                    <TextField
                        margin="dense"
                        id="uID"
                        label="uID"
                        type="number"
                        fullWidth
                        InputProps={{
                            startAdornment: <InputAdornment position="start">u</InputAdornment>,
                        }}
                        value={uIDInput}
                        onChange={(e) => { setUIDInput(e.target.value) }}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={writeAccess}
                                onChange={(e) => { setWriteAccess(e.target.checked) }}
                                name="WriteAccess"
                                color="primary"
                            />
                        }
                        label="Write Access"
                    />
                </FormGroup>
                <DialogActions>
                    <Button onClick={() => {
                        setUIDInput("");
                        setWriteAccess(false);
                        store.configStore.openShareUIDDialog = false;
                    }}>
                        Cancel
                    </Button>
                    <Button color="primary" onClick={shareState}>
                        Confirm
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
        <Snackbar open={openErrorMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenErrorMessage(false) }}>
            <Alert onClose={() => { setOpenErrorMessage(false); setErrorMessage("") }} severity="error">
                An error occured: {errorMessage}
            </Alert>
        </Snackbar>
        <Snackbar open={openSuccessMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenSuccess(false) }}>
            <Alert onClose={() => { setOpenSuccess(false); }} severity="success">
                State saved!
            </Alert>
        </Snackbar>
    </div>)
}

export default observer(UIDInputModal)