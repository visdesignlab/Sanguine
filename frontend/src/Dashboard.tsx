import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";

import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox";
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu";

import './App.css';
import LayoutGenerator from "./Components/LayoutGenerator";
import { DataContext } from "./App";
import { Box, Divider, Snackbar, Tab, Tabs, Alert, Grid } from "@mui/material";
import DetailView from "./Components/Utilities/DetailView/DetailView";
import Store from "./Interfaces/Store";
import { SnackBarCloseTime } from "./Presets/Constants";
import TabPanel from "./Components/Utilities/TabPanel";
import WrapperSankey from "./Components/Charts/Sankey/WrapperSankey";
import EmailComponent from "./Components/Utilities/Email/EmailComponent";


const Dashboard: FC = () => {

  const hemoData = useContext(DataContext);
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
        {tabValue === 2 ? <></> : <Grid item xs={2} id="Side-Bar">
          <LeftToolBox totalCaseNum={hemoData.length} />
        </Grid>}

        <Divider orientation="vertical" flexItem style={{ marginRight: "-1px" }} />
        <Grid item xs={tabValue === 2 ? 12 : 8} id="Main-Body">
          <Tabs value={tabValue}
            onChange={handleChange}
            indicatorColor="primary"
            textColor="primary"
            centered>
            <Tab label="Main Dashboard" />
            <Tab label="Sankey" />
            <Tab style={{ visibility: store.configStore.privateMode ? 'visible' : 'hidden' }} label='Email' />
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
          <TabPanel value={tabValue} index={2} children={<EmailComponent />} styling={undefined} />

        </Grid>
        <Divider orientation="vertical" flexItem style={{ marginRight: "-1px" }} />
        {tabValue === 2 ? <></> :
          <Grid item xs={2}>
            <DetailView />
          </Grid>}

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
