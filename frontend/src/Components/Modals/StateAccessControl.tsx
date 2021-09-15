import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, List, ListItem, ListItemSecondaryAction, ListItemText, Radio, RadioGroup, Snackbar, TextField } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { SnackBarCloseTime } from "../../Presets/Constants";

type Props = {
    stateName: string
}

const StateAccessControl: FC<Props> = ({ stateName }: Props) => {

    const [uIDShared, updateUIDShared] = useState<string[]>([]);
    const [accessArray, updateAccessArray] = useState<string[]>([])
    const [errorMessage, setErrorMessage] = useState("");
    const [openErrorMessage, setOpenErrorMessage] = useState(false);
    const [openSuccessMessage, setOpenSuccess] = useState(false)

    const makeStateAccessRequest = () => {
        if (stateName) {
            fetch(`${process.env.REACT_APP_QUERY_URL}state_unids?state_name=${stateName}`)
                .then(response => response.json())
                .then(function (data) {
                    //   const result = data.result;
                    let shareResult: any[] = data.users_and_roles;
                    let uID: string[] = []
                    let access: string[] = []
                    shareResult.forEach((user) => {
                        uID.push(user[0])
                        access.push(user[1])
                    })
                    updateUIDShared(uID);
                    updateAccessArray(access);


                });
        }
    }

    useEffect(() => {
        makeStateAccessRequest()
    }, [stateName]);

    const changeAccess = (uID: string, newAccess: string, indexInArray: number) => {
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
            body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&user=${uID}&role=${newAccess}`
        })
            .then(response => {
                if (response.status === 200) {
                    setOpenSuccess(true)
                    setErrorMessage("");
                    setOpenErrorMessage(false);
                    // let newAccessArray = accessArray;
                    // newAccessArray[indexInArray] = newAccess
                    // updateAccessArray(newAccessArray)
                    makeStateAccessRequest()
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

    const store = useContext(Store)
    return (<div>
        <Dialog open={store.configStore.openStateAccessControl}>
            <DialogTitle>Manage {stateName} Access</DialogTitle>
            <DialogContent style={{ width: "300px" }}>
                <List>{
                    accessArray.map((d, i) => {
                        //     console.log(d, accessArray[i])
                        return (<ListItem key={`${uIDShared[i]}-${d}`}>
                            <ListItemText primary={uIDShared[i]} key={`${uIDShared[i]}`} />
                            <ListItemSecondaryAction>
                                <RadioGroup row onChange={(e) => { changeAccess(uIDShared[i], e.target.value, i) }} value={d} key={`${uIDShared[i]}-${d}`}>
                                    <FormControlLabel
                                        value="WR"
                                        control={
                                            <Radio
                                                name="WR"
                                                color="primary"
                                            />
                                        }
                                        label="WR"
                                    />
                                    <FormControlLabel
                                        value="RE"
                                        control={
                                            <Radio name="RE" />
                                        }
                                        label="RE"
                                    />
                                </RadioGroup>
                            </ListItemSecondaryAction>
                        </ListItem>)
                    })}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { store.configStore.openStateAccessControl = false }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
        <Snackbar open={openErrorMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenErrorMessage(false) }}>
            <Alert onClose={() => { setOpenErrorMessage(false); setErrorMessage("") }} severity="error">
                An error occured: {errorMessage}
            </Alert>
        </Snackbar>
        <Snackbar open={openSuccessMessage} autoHideDuration={SnackBarCloseTime} onClose={() => { setOpenSuccess(false) }}>
            <Alert onClose={() => { setOpenSuccess(false) }} severity="success">
                Change succeed.
            </Alert>
        </Snackbar>
    </div>)
}

export default observer(StateAccessControl);