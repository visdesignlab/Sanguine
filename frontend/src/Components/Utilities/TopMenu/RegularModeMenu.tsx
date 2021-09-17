import { Menu, MenuItem, Button, AppBar, Toolbar, Typography, IconButton, ButtonGroup, Tooltip } from "@material-ui/core";
import { isObservable } from "mobx";
import { observer } from "mobx-react";
import { useContext, useState, FC } from "react";
import Store from "../../../Interfaces/Store";
import { logoutHandler } from "../../../Interfaces/UserManagement";
import BugReportOutlinedIcon from '@material-ui/icons/BugReportOutlined';
import { useStyles } from "../../../Presets/StyledComponents";
import MenuIcon from '@material-ui/icons/Menu';
import AddModeTopMenu from "./AddModeTopMenu";
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import UndoRedoButtons from "./UndoRedoButtons";
import FormatSizeIcon from '@material-ui/icons/FormatSize';
import StateManagementSuite from "./StateManagementSuite";
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import InfoDialog from "../../Modals/InfoDialog";
import ClearAllIcon from '@material-ui/icons/ClearAll';
import FilterBoard from "../FilterInterface/FilterBoard";

const RegularModeMenu: FC = () => {
    const store = useContext(Store)
    const styles = useStyles();
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
    const handleDrawerOpen = () => {
        store.configStore.openDrawer = true;
    };


    const regularMenu = (



        <Toolbar className={styles.toolbarPaddingControl}>
            <IconButton
                edge="start"
                onClick={handleDrawerOpen}
                color="inherit"
                aria-label="open drawer"
            >
                <MenuIcon />
            </IconButton>


            <div className={useStyles().centerAlignment}>
                <Button variant="contained" disableElevation onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true" >Add</Button>
                <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
                    <MenuItem onClick={() => handleClose(1)}>Dumbbell Chart</MenuItem>
                    <MenuItem onClick={() => handleClose(2)}>Scatter Plot</MenuItem>
                    <MenuItem onClick={() => handleClose(3)}>Heat Map</MenuItem>
                    <MenuItem onClick={() => handleClose(0)}>Cost and Saving Chart</MenuItem>
                </Menu>
            </div>


            <a href="https://healthcare.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/UI-updates/images/u-of-u-health-social.png" />
            </a>

            <Typography className={styles.title} variant="h6" noWrap>
                Sanguine
            </Typography>

            {/* Preview Mode */}
            {/* <div className={useStyles().centerAlignment}>
                <Button variant="outlined" disabled>Preview Mode</Button>
                //    content="Preview Mode"
                 // onClick={() => { store!.previewMode = true }} 
            </div> */}

            {/* TODO : This will need to change when merging the branch 
                All these logos don't look very appealing. Considering having an About page that have all the logos*/}
            <a href="https://arup.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/UI-updates/images/ARUP-logo.png" />
            </a>
            <a href="https://vdl.sci.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/master/images/vdl.png" />
            </a>


            <StateManagementSuite />

            <Tooltip title={<div>  <p className={styles.tooltipFont}>Clear All</p></div>}>
                <IconButton disabled={store.isAtRoot} onClick={() => { store.configStore.resetAll() }}>
                    <ClearAllIcon />
                </IconButton>
            </Tooltip>

            <UndoRedoButtons />

            <IconButton onClick={() => { store.configStore.largeFont = !store.configStore.largeFont }} >
                <FormatSizeIcon className={store.configStore.largeFont ? `` : styles.manualDisable} />
            </IconButton>

            <IconButton onClick={() => { store.configStore.openAboutDialog = true; }}>
                <InfoOutlinedIcon />
            </IconButton>
            <InfoDialog />

            <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer">
                <IconButton size="small">
                    <BugReportOutlinedIcon />
                </IconButton>
            </a>

            <IconButton onClick={() => { logoutHandler() }} >
                <ExitToAppIcon />
            </IconButton>
            <FilterBoard />
        </Toolbar>

    )

    const configureOutput = () => {
        console.log(isObservable(store.configStore.topMenuBarAddMode))
        if (store.configStore.topMenuBarAddMode) {

            return (<AddModeTopMenu addingChartType={addingChartType} />)
        } else {

            return regularMenu
        }
    }

    return (<AppBar position="static" color="transparent" elevation={2} style={{ zIndex: 3 }}>
        {configureOutput()}
    </AppBar>)
}

export default observer(RegularModeMenu)