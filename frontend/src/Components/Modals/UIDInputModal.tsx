import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, FormGroup, InputAdornment, Switch, TextField } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";
import { simulateAPIClick } from "../../Interfaces/UserManagement";

type Props = {
    stateName: string;
    visible: boolean;
    setVisibility: (input: boolean) => void;
};
const UIDInputModal: FC<Props> = ({ stateName, visible, setVisibility }: Props) => {
    const store = useContext(Store);
    const [uIDInput, setUIDInput] = useState("");
    const [writeAccess, setWriteAccess] = useState(false);

    const shareState = () => {
        const csrftoken = simulateAPIClick();
        fetch(`${import.meta.env.REACT_APP_QUERY_URL}share_state`, {
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

                    store.configStore.snackBarIsError = false;
                    store.configStore.snackBarMessage = "State shared successfully!";
                    store.configStore.openSnackBar = true;


                    setUIDInput("");
                    setWriteAccess(false);
                    setVisibility(false);
                } else {
                    response.text().then(error => {
                        store.configStore.snackBarIsError = true;
                        store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
                        store.configStore.openSnackBar = true;
                        console.error('There has been a problem with your fetch operation:', response.statusText);
                    });
                }
            }).catch(error => {
                store.configStore.snackBarIsError = true;
                store.configStore.snackBarMessage = `An error occurred: ${error}`;
                store.configStore.openSnackBar = true;
                console.error('There has been a problem with your fetch operation:', error);
            });


    };

    return (<div>
        <Dialog open={visible}>
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
                        onChange={(e) => { setUIDInput(e.target.value); }}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={writeAccess}
                                onChange={(e) => { setWriteAccess(e.target.checked); }}
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
                        setVisibility(false);
                    }}>
                        Cancel
                    </Button>
                    <Button color="primary" onClick={shareState}>
                        Confirm
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>

    </div>);
};

export default observer(UIDInputModal);