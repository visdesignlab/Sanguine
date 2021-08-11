import { Divider, Grid, Menu, MenuItem, Button } from "@material-ui/core";
import { isObservable } from "mobx";
import { observer } from "mobx-react";
import { useContext, useState, FC } from "react";
import Store from "../../../Interfaces/Store";
import { logoutHandler } from "../../../Interfaces/UserManagement";
import BugReportOutlinedIcon from '@material-ui/icons/BugReportOutlined';
import { useStyles } from "../../../Presets/StyledComponents";
import AddModeTopMenu from "./AddModeTopMenu";
import UndoRedoButtons from "./UndoRedoButtons";
import StateManagementSuite from "./StateManagementSuite";

const RegularModeMenu: FC = () => {
    const store = useContext(Store)
    const [addingChartType, setAddingChartType] = useState(-1)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const addModeButtonHandler = (chartType: number) => {
        setAddingChartType(chartType)
        store.configStore.topMenuBarAddMode = true;
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (input?: number) => {
        setAnchorEl(null);
        if (input !== undefined) {
            addModeButtonHandler(input)
        }
    };

    const regularMenu = (
        <div className={useStyles().root}>
            <Grid container direction="row" justifyContent="space-around" alignItems="center">
                <Grid item xs >
                    {/* VDL LOGO */}
                    <a href="https://vdl.sci.utah.edu" target="_blank"><img
                        // style={{ height: "40px" }}
                        // size="small"
                        // as='a'
                        // target="_blank"
                        className={useStyles().img}
                        src="https://raw.githubusercontent.com/visdesignlab/visdesignlab.github.io/master/assets/images/logos/vdl.png"
                    // href="https://vdl.sci.utah.edu"
                    /></a>

                </Grid>

                <Divider orientation="vertical" flexItem />
                {/*Add Button */}
                <Grid item xs >
                    <div className={useStyles().centerAlignment}>
                        <Button color="primary" variant="contained" onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true" >Add</Button>
                        <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
                            <MenuItem onClick={() => handleClose(1)}>Dumbbell Chart</MenuItem>
                            <MenuItem onClick={() => handleClose(2)}>Scatter Plot</MenuItem>
                            <MenuItem onClick={() => handleClose(3)}>Heat Map</MenuItem>
                            <MenuItem onClick={() => handleClose(4)}>Intervention Plot</MenuItem>
                            <MenuItem onClick={() => handleClose(0)}>Cost and Saving Chart</MenuItem>
                        </Menu>
                    </div>
                </Grid>
                <Divider orientation="vertical" flexItem />
                <StateManagementSuite />

                {/* Preview Mode */}
                <Divider orientation="vertical" flexItem />

                <Grid item xs>
                    <div className={useStyles().centerAlignment}>
                        <Button variant="outlined" disabled>Preview Mode</Button>
                    </div>
                    {/* //    content="Preview Mode"
                    // onClick={() => { store!.previewMode = true }}  */}

                </Grid>
                <Divider orientation="vertical" flexItem />

                <Grid item xs>
                    <UndoRedoButtons />
                </Grid>

                <Divider orientation="vertical" flexItem />

                <Grid item xs>
                    <div className={useStyles().centerAlignment}>
                        <Button variant="outlined" onClick={() => { logoutHandler() }} >
                            Log Out
                        </Button>
                    </div>
                </Grid>

                <Divider orientation="vertical" flexItem />

                <Grid item xs>
                    <div className={useStyles().centerAlignment}>
                        <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer">
                            <Button variant="outlined" endIcon={<BugReportOutlinedIcon />}>Report a Bug</Button>
                        </a>
                    </div>
                </Grid>
            </Grid>
        </div >)

    const configureOutput = () => {
        console.log(isObservable(store.configStore.topMenuBarAddMode))
        if (store.configStore.topMenuBarAddMode) {
            console.log(true)
            return <AddModeTopMenu addingChartType={addingChartType} />
        } else {
            console.log(false)
            return regularMenu
        }
    }

    return (configureOutput())
}

export default observer(RegularModeMenu)