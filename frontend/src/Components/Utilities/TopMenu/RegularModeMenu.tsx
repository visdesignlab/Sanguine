import { Menu, MenuItem, Button, AppBar, Toolbar, Typography, IconButton, ButtonGroup, Tooltip, ListItemIcon } from "@material-ui/core";
import { isObservable } from "mobx";
import { observer } from "mobx-react";
import { useContext, useState, FC } from "react";
import Store from "../../../Interfaces/Store";
import { logoutHandler } from "../../../Interfaces/UserManagement";
import BugReportOutlinedIcon from '@material-ui/icons/BugReportOutlined';
import { useStyles } from "../../../Presets/StyledComponents";
import MenuIcon from '@material-ui/icons/Menu';
import AddModeTopMenu from "./AddModeTopMenu";
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import UndoRedoButtons from "./UndoRedoButtons";
import FormatSizeIcon from '@material-ui/icons/FormatSize';
import StateManagementSuite from "./StateManagementSuite";
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import InfoDialog from "../../Modals/InfoDialog";
import DeleteIcon from '@material-ui/icons/Delete';
import FilterBoard from "../FilterInterface/FilterBoard";
import MoreVert from "@material-ui/icons/MoreVert";

const RegularModeMenu: FC = () => {
    const store = useContext(Store)
    const styles = useStyles();
    const [addingChartType, setAddingChartType] = useState(-1)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [anchorMore, setAnchorMore] = useState<null | HTMLElement>(null);

    const addModeButtonHandler = (chartType: number) => {
        setAddingChartType(chartType)
        store.configStore.topMenuBarAddMode = true;
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorMore(event.currentTarget);
    };
    const handleMoreClose = () => { setAnchorMore(null) }

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
            <Tooltip title={<div>  <p className={styles.tooltipFont}>Filter</p></div>}>

                <IconButton
                    edge="start"
                    onClick={handleDrawerOpen}
                    color="inherit"
                    aria-label="open drawer"
                >
                    <MenuIcon />
                </IconButton>
            </Tooltip>




            <a href="https://healthcare.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/u-of-u-health-social.png" />
            </a>
            <a href="https://arup.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/ARUP-logo.png" />
            </a>
            <a href="https://vdl.sci.utah.edu" target="_blank">
                <img
                    className={styles.img}
                    src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/vdl.png" />
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




            <div className={useStyles().centerAlignment}>
                <Button color="primary" variant="contained" disableElevation onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true" >Add Chart</Button>
                <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
                    <MenuItem onClick={() => handleClose(1)}>Dumbbell Chart</MenuItem>
                    <MenuItem onClick={() => handleClose(2)}>Scatter Plot</MenuItem>
                    <MenuItem onClick={() => handleClose(3)}>Heat Map</MenuItem>
                    <MenuItem onClick={() => handleClose(0)}>Cost and Saving Chart</MenuItem>
                </Menu>
            </div>

            <StateManagementSuite />


            <IconButton disabled={store.isAtRoot} onClick={() => { store.chartStore.clearAllCharts() }}>
                <Tooltip title={<div>  <p className={styles.tooltipFont}>Clear All Charts</p></div>}>
                    <DeleteIcon />
                </Tooltip>
            </IconButton>


            <UndoRedoButtons />

            <IconButton onClick={() => { store.configStore.largeFont = !store.configStore.largeFont }} >
                <Tooltip title={<div>  <p className={styles.tooltipFont}>Change Font Size</p></div>}>
                    <FormatSizeIcon className={store.configStore.largeFont ? `` : styles.manualDisable} />
                </Tooltip>
            </IconButton>

            <IconButton onClick={handleMoreClick} >
                <Tooltip title={<div>  <p className={styles.tooltipFont}>More</p></div>}>
                    <MoreVert />
                </Tooltip>
            </IconButton>
            <Menu anchorEl={anchorMore} open={Boolean(anchorMore)} onClose={handleMoreClose} >

                <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: " black" }}>
                    <MenuItem >
                        <ListItemIcon>
                            <BugReportOutlinedIcon />
                        </ListItemIcon>
                        Report a Bug
                    </MenuItem>
                </a>
                <MenuItem onClick={() => { store.configStore.openAboutDialog = true; }}>
                    <ListItemIcon>
                        <InfoOutlinedIcon />
                    </ListItemIcon>
                    About
                </MenuItem>
                <MenuItem onClick={() => { store.configStore.privateMode = !store.configStore.privateMode }} className={store.configStore.privateMode ? `` : styles.manualDisable}>
                    <ListItemIcon>
                        <VpnKeyIcon className={store.configStore.privateMode ? `` : styles.manualDisable} />
                    </ListItemIcon>
                    Private Mode
                </MenuItem>
                <MenuItem onClick={() => { logoutHandler() }}>
                    <ListItemIcon>
                        <ExitToAppIcon />
                    </ListItemIcon>
                    Log Out
                </MenuItem>
            </Menu>
            <InfoDialog />
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
