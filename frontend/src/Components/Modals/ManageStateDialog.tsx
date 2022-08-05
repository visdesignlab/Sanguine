import { Button, DialogActions, DialogContent, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Tooltip } from "@mui/material";
import { Dialog, DialogTitle } from "@mui/material";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import { simulateAPIClick } from "../../Interfaces/UserManagement";
import { observer } from "mobx-react";
import StateAccessControl from "./StateAccessControl";
import { BiggerTooltip } from "../../Presets/StyledComponents";

type Props = {
    setOpenSaveState: (input: boolean) => void;
    setOpenManageState: (input: boolean) => void;
    openManageState: boolean;
};

const ManageStateDialog: FC<Props> = ({ setOpenSaveState, setOpenManageState, openManageState }: Props) => {
    const store = useContext(Store);

    const [stateNameToChange, setStateNameToChange] = useState("");

    const [openStateAccessControl, setOpenStateAccessControl] = useState(false);

    const passSetOpenStateAccess = (input: boolean) => {
        setOpenStateAccessControl(input);
    };

    const removeState = (stateName: string) => {
        const csrftoken = simulateAPIClick();
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
                store.configStore.savedState = store.configStore.savedState.filter(d => d !== stateName);
                store.configStore.snackBarIsError = false;
                store.configStore.snackBarMessage = "Deletion succeed.";
                store.configStore.openSnackBar = true;
            } else {
                response.text().then(error => {
                    store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
                    store.configStore.snackBarIsError = true;
                    store.configStore.openSnackBar = true;
                    console.error('There has been a problem with your fetch operation:', response.statusText);
                });
            }
        }).catch(error => {
            store.configStore.snackBarMessage = `An error occurred: ${error}`;
            store.configStore.snackBarIsError = true;
            store.configStore.openSnackBar = true;
            console.error('There has been a problem with your fetch operation:', error);
        });
    };

    const changeStateAccess = (stateName: string) => {
        setOpenManageState(false);
        setOpenStateAccessControl(true);
        setStateNameToChange(stateName);
    };

    // const changeStateName = ()

    return (<div >
        <Dialog open={openManageState} fullWidth>
            <DialogTitle>Manage Saved States</DialogTitle>
            <DialogContent >
                <List>{
                    store.configStore.savedState.map((d) => {
                        return (<ListItem>
                            <ListItemText primary={d} style={{ maxWidth: "375px" }} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => {
                                    setOpenManageState(false);
                                    store.configStore.stateToUpdate = d;
                                    setOpenSaveState(true);
                                }}>
                                    <Tooltip title={<BiggerTooltip children='Edit State' />}>
                                        <EditIcon />
                                    </Tooltip>
                                </IconButton>
                                <IconButton onClick={() => { changeStateAccess(d); }}>
                                    <Tooltip title={<BiggerTooltip children='Manage Sharing' />}>
                                        <ShareIcon />
                                    </Tooltip>
                                </IconButton>
                                <IconButton onClick={() => { removeState(d); }}>
                                    <Tooltip title={<BiggerTooltip children='Delete State' />}>
                                        <DeleteIcon />
                                    </Tooltip>
                                </IconButton>

                            </ListItemSecondaryAction>
                        </ListItem>);
                    })}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenManageState(false)}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
        <StateAccessControl openStateAccessControl={openStateAccessControl} setOpenStateAccessControl={passSetOpenStateAccess} stateName={stateNameToChange} />
    </div>);
};

export default observer(ManageStateDialog);