import { Divider, Grid, Menu, MenuItem, Button, AppBar, Toolbar, Typography, IconButton } from "@material-ui/core";
import { isObservable } from "mobx";
import { observer } from "mobx-react";
import { useContext, useState, FC } from "react";
import Store from "../../../Interfaces/Store";
import { logoutHandler } from "../../../Interfaces/UserManagement";
import BugReportOutlinedIcon from '@material-ui/icons/BugReportOutlined';
import { useStyles } from "../../../Presets/StyledComponents";
import MenuIcon from '@material-ui/icons/Menu';
import AddModeTopMenu from "./AddModeTopMenu";
import UndoRedoButtons from "./UndoRedoButtons";
import StateManagementSuite from "./StateManagementSuite";

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

    const regularMenu = (


        <Toolbar className={styles.toolbarPaddingControl}>
            <IconButton
                edge="start"
                //   className={classes.menuButton}
                color="inherit"
                aria-label="open drawer"
            >
                <MenuIcon />
            </IconButton>

            {/* TODO : This will need to change when merging the branch 
                All these logos don't look very appealing. Considering having an About page that have all the logos*/}
            {/* <a href="https://vdl.sci.utah.edu" target="_blank">
                    <img
                        className={styles.img}
                        src="https://raw.githubusercontent.com/visdesignlab/Sanguine/master/images/vdl.png" />
                </a>
                <a href="https://vdl.sci.utah.edu" target="_blank">
                    <img
                        className={styles.img}
                        src="https://raw.githubusercontent.com/visdesignlab/Sanguine/UI-updates/images/u-of-u-health-social.png" />
                </a>
                <a href="https://vdl.sci.utah.edu" target="_blank">
                    <img
                        className={styles.img}
                        src="https://raw.githubusercontent.com/visdesignlab/Sanguine/UI-updates/images/ARUP-logo.png" />
                </a> */}
            <div className={useStyles().centerAlignment}>
                <Button variant="contained" onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true" >Add</Button>
                <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
                    <MenuItem onClick={() => handleClose(1)}>Dumbbell Chart</MenuItem>
                    <MenuItem onClick={() => handleClose(2)}>Scatter Plot</MenuItem>
                    <MenuItem onClick={() => handleClose(3)}>Heat Map</MenuItem>
                    <MenuItem onClick={() => handleClose(0)}>Cost and Saving Chart</MenuItem>
                </Menu>
            </div>
            <Typography className={styles.title} variant="h6" noWrap>
                Sanguine
            </Typography>
            <StateManagementSuite />


        </Toolbar>

        // <div className={useStyles().root}>
        //     <Grid container direction="row" justifyContent="space-around" alignItems="center">
        //        

        //        
        //         <StateManagementSuite />

        //         {/* Preview Mode */}
        //         <Divider orientation="vertical" flexItem />

        //         <Grid item xs>
        //             <div className={useStyles().centerAlignment}>
        //                 <Button variant="outlined" disabled>Preview Mode</Button>
        //             </div>
        //             {/* //    content="Preview Mode"
        //             // onClick={() => { store!.previewMode = true }}  */}

        //         </Grid>
        //         <Divider orientation="vertical" flexItem />

        //         <Grid item xs>
        //             <UndoRedoButtons />
        //         </Grid>

        //         <Divider orientation="vertical" flexItem />

        //         <Grid item xs>
        //             <div className={useStyles().centerAlignment}>
        //                 <Button variant="outlined" onClick={() => { logoutHandler() }} >
        //                     Log Out
        //                 </Button>
        //             </div>
        //         </Grid>

        //         <Divider orientation="vertical" flexItem />

        //         <Grid item xs>
        //             <div className={useStyles().centerAlignment}>
        //                 <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer">
        //                     <Button variant="outlined" endIcon={<BugReportOutlinedIcon />}>Report a Bug</Button>
        //                 </a>
        //             </div>
        //         </Grid>
        //     </Grid>
        // </div >
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