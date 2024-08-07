import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";

import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox";
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu";

import './App.css';
import LayoutGenerator from "./Components/LayoutGenerator";
import { Box, Divider, Snackbar, Tab, Tabs, Alert, Grid } from "@mui/material";
import DetailView from "./Components/Utilities/DetailView/DetailView";
import Store from "./Interfaces/Store";
import { SnackBarCloseTime } from "./Presets/Constants";
import TabPanel from "./Components/Utilities/TabPanel";
import WrapperSankey from "./Components/Charts/Sankey/WrapperSankey";


const Dashboard: FC = () => {

    const store = useContext(Store);
    const [tabValue, setTabValue] = useState(0);

    const handleChange = (event: any, newValue: any) => {
        setTabValue(newValue);
    };


    return (
        <div>
            <Box id="Top-Bar">
                <RegularModeMenu />
            </Box>

            <Grid container direction="row" >
                <Grid item xs={2} id="Side-Bar">
                    <LeftToolBox />
                </Grid>
                <Divider orientation="vertical" flexItem style={{ marginRight: "-1px" }} />
                <Grid item xs={8} id="Main-Body">
                    <Tabs value={tabValue}
                        onChange={handleChange}
                        indicatorColor="primary"
                        textColor="primary"
                        centered>
                        <Tab label="Main Dashboard" />
                        <Tab label="Sankey" />
                    </Tabs>
                    <TabPanel
                        value={tabValue}
                        index={0}
                        children={
                            <LayoutGenerator />
                        }
                        styling={undefined} />
                    <TabPanel
                        value={tabValue}
                        index={1}
                        children={
                            <WrapperSankey />
                        }
                        styling={undefined} />
                </Grid>
                <Divider orientation="vertical" flexItem style={{ marginRight: "-1px" }} />
                <Grid item xs={2}>
                    <DetailView />
                </Grid>
            </Grid>


            <Snackbar open={store.configStore.openSnackBar} autoHideDuration={SnackBarCloseTime} onClose={() => { store.configStore.openSnackBar = false; }}>
                <Alert onClose={() => { store.configStore.openSnackBar = false; }} severity={store.configStore.snackBarIsError ? "error" : "success"}>
                    {store.configStore.snackBarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
};
export default observer(Dashboard);