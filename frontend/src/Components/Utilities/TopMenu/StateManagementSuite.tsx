import { Button, Grid, Menu, MenuItem } from "@material-ui/core"
import { observer } from "mobx-react"
import { FC, useEffect, useState, useContext } from "react"
import NestedMenuItem from "material-ui-nested-menu-item";
import Store from "../../../Interfaces/Store"
import { useStyles } from "../../../Presets/StyledComponents"
import ManageStateDialog from "../../Modals/ManageStateDialog"
import SaveStateModal from "../../Modals/SaveStateModal";
import { simulateAPIClick } from "../../../Interfaces/UserManagement";

const StateManagementSuite: FC = () => {
    const styles = useStyles();
    const store = useContext(Store);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);


    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        fetchSavedStates();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    // // const [listOfSavedState, setListOfSavedState] = useState<string[]>([])

    async function fetchSavedStates() {
        fetch(`${process.env.REACT_APP_QUERY_URL}state`)
            .then(result => result.json())
            .then(result => {
                if (result) {
                    const resultList = result.map((d: any[]) => d)
                    store.configStore.savedState = resultList;
                }
            }).catch(r => {
                console.log("failed to fetch states")
            })
    }

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}state`)
            .then(result => result.json())
            .then(result => {
                if (result) {
                    const resultList = result.map((d: any[]) => d)
                    store.configStore.savedState = resultList;
                }
            }).catch(r => {
                console.log("failed to fetch states")
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSavedState = async (name: string) => {
        const res = await (fetch(`${process.env.REACT_APP_QUERY_URL}state?name=${name}`))
        const result = await res.json()
        store.provenance.importState(result.definition)
    }

    const updateStateFromSelection = (stateName: string) => {
        const csrftoken = simulateAPIClick()
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
                store.configStore.snackBarIsError = false;
                store.configStore.snackBarMessage = "State updated!";
                store.configStore.openSnackBar = true;
            } else {
                response.text().then(error => {
                    store.configStore.snackBarIsError = true;
                    store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
                    store.configStore.openSnackBar = true;
                })
            }
        }).catch(error => {
            store.configStore.snackBarIsError = true;
            store.configStore.snackBarMessage = `An error occurred: ${error}`;
            store.configStore.openSnackBar = true;
        })
    }




    return (
        <div className={styles.centerAlignment}>
            <Button variant="outlined" onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true"  >States</Button>
            <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>

                <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Load Saved State">
                    {store.configStore.savedState.length > 0 ? store.configStore.savedState.map((d) => {
                        return (
                            <MenuItem
                                key={`share${d}`}

                                onClick={() => {
                                    handleClose();
                                    loadSavedState(d);
                                    store.configStore.loadedStateName = d;
                                }}>
                                {d}
                            </MenuItem>)
                    }) : <MenuItem disabled>No Available</MenuItem>}
                </NestedMenuItem>


                <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Save As ...">
                    {store.configStore.savedState.length > 0 ? store.configStore.savedState.map((d) => {
                        return (
                            <MenuItem
                                key={`share${d}`}
                                onClick={() => {
                                    handleClose();
                                    updateStateFromSelection(d)
                                }}>
                                {d}
                            </MenuItem>)
                    }) : <MenuItem disabled>No Available</MenuItem>}
                </NestedMenuItem>

                {/* TODO add presets. */}

                <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Load from Preset">
                    <MenuItem>Preset 1</MenuItem>
                    <MenuItem>Preset 2</MenuItem>
                    <MenuItem>Preset 3</MenuItem>
                </NestedMenuItem>
                <MenuItem onClick={() => { handleClose(); store.configStore.openSaveStateDialog = true; }}>Save as a New State</MenuItem>
                <MenuItem onClick={() => { handleClose(); store.configStore.openManageStateDialog = true; }}>Manage Saved States</MenuItem>
            </Menu>
            <ManageStateDialog />
            <SaveStateModal />

        </div>
    )
}

export default observer(StateManagementSuite)