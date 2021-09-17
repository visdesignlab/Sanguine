import { Button, Grid, Menu, MenuItem } from "@material-ui/core"
import { observer } from "mobx-react"
import { FC, useEffect, useState, useContext } from "react"
import NestedMenuItem from "material-ui-nested-menu-item";
import Store from "../../../Interfaces/Store"
import { useStyles } from "../../../Presets/StyledComponents"
import ManageStateDialog from "../../Modals/ManageStateDialog"
import SaveStateModal from "../../Modals/SaveStateModal";

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
        const res = await fetch(`${process.env.REACT_APP_QUERY_URL}state`)
        const result = await res.json()
        if (result) {
            const resultList = result.map((d: any[]) => d);
            // stateUpdateWrapperUseJSON(listOfSavedState, resultList, setListOfSavedState)
            store.configStore.savedState = resultList;
        }
    }

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}state`)
            .then(result => result.json())
            .then(result => {
                if (result) {
                    const resultList = result.map((d: any[]) => d)
                    store.configStore.savedState = resultList;
                }
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSavedState = async (name: string) => {
        const res = await (fetch(`${process.env.REACT_APP_QUERY_URL}state?name=${name}`))
        const result = await res.json()
        store.provenance.importState(result.definition)
    }

    return (
        <div className={useStyles().centerAlignment}>
            <Button variant="outlined" onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true"  >States</Button>
            <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
                <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Load State">
                    {store.configStore.savedState.length > 0 ? store.configStore.savedState.map((d) => {
                        return (
                            <MenuItem
                                key={`share${d}`}
                                onClick={() => {
                                    handleClose();
                                    loadSavedState(d)
                                }}>
                                {d}
                            </MenuItem>)
                    }) : <MenuItem disabled>No Available</MenuItem>}
                </NestedMenuItem>
                <MenuItem onClick={() => { handleClose(); store.configStore.openSaveStateDialog = true; }}>Save State</MenuItem>
                <MenuItem onClick={() => { handleClose(); store.configStore.openManageStateDialog = true; }}>Manage Saved States</MenuItem>
            </Menu>
            <ManageStateDialog />
            <SaveStateModal />

        </div>
    )
}

export default observer(StateManagementSuite)