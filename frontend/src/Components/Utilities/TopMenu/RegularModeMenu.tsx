/** @jsxImportSource @emotion/react */
import { Menu, MenuItem, Button, AppBar, Typography, IconButton, Tooltip, ListItemIcon } from "@mui/material";
import { observer } from "mobx-react";
import { useContext, useState, FC } from "react";
import InsertChartIcon from '@mui/icons-material/InsertChart';
import Store from "../../../Interfaces/Store";
import { logoutHandler, simulateAPIClick } from "../../../Interfaces/UserManagement";
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import AddModeTopMenu from "./AddModeTopMenu";
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import UndoRedoButtons from "./UndoRedoButtons";
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import StateManagementSuite from "./StateManagementSuite";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveIcon from '@mui/icons-material/Save';
import InfoDialog from "../../Modals/InfoDialog";
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import styled from "@emotion/styled";
import { PaddedToolBar, CenterAlignedDiv } from "../../../Presets/StyledComponents";
import { css } from '@emotion/react';
import EmailComponent from "../Email/EmailComponent";


const RegularModeMenu: FC = () => {
  const store = useContext(Store);
  const [addingChartType, setAddingChartType] = useState(-1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorMore, setAnchorMore] = useState<null | HTMLElement>(null);

  const [openAbout, setOpenAbout] = useState(false);

  const passSetOpenAbout = (input: boolean) => {
    setOpenAbout(input);
  };
  const addModeButtonHandler = (chartType: number) => {
    setAddingChartType(chartType);
    store.configStore.topMenuBarAddMode = true;
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorMore(event.currentTarget);
  };
  const handleMoreClose = () => { setAnchorMore(null); };

  const handleClose = (input?: number) => {
    setAnchorEl(null);
    if (input !== undefined) {
      addModeButtonHandler(input);
    }
  };


  const updateState = () => {
    const csrftoken = simulateAPIClick();
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
      body: JSON.stringify({ old_name: store.configStore.loadedStateName, new_name: store.configStore.loadedStateName, new_definition: store.provenance.exportState(false) })
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
        });
      }
    }).catch(error => {
      store.configStore.snackBarIsError = true;
      store.configStore.snackBarMessage = `An error occurred: ${error}`;
      store.configStore.openSnackBar = true;
    });
  };





  const regularMenu = (



    <PaddedToolBar>


      <a href="https://healthcare.utah.edu" target="_blank" rel="noopener noreferrer" >
        <StyledImage
          src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/u-of-u-health-social.png" />
      </a>
      <a href="https://arup.utah.edu" target="_blank" rel="noopener noreferrer">
        <StyledImage
          src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/ARUP-logo.png" />
      </a>
      <a href="https://vdl.sci.utah.edu" target="_blank" rel="noopener noreferrer">
        <StyledImage
          src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/vdl.png" />
      </a>

      <TitleTypography variant="h6">
        Sanguine
      </TitleTypography>

      {/* Preview Mode */}
      {/* <div className={allCss.centerAlignment}>
                <Button variant="outlined" disabled>Preview Mode</Button>
                //    content="Preview Mode"
                 // onClick={() => { store!.previewMode = true }}
            </div> */}

      <CenterAlignedDiv>
        <Button startIcon={<InsertChartIcon />} color="primary" variant="contained" disableElevation onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true" >Add Chart</Button>
        <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
          <MenuItem onClick={() => handleClose(1)}>Dumbbell Chart</MenuItem>
          <MenuItem onClick={() => handleClose(2)}>Scatter Plot</MenuItem>
          <MenuItem onClick={() => handleClose(3)}>Heat Map</MenuItem>
          <MenuItem onClick={() => handleClose(0)}>Cost and Saving Chart</MenuItem>
        </Menu>
      </CenterAlignedDiv>

      <StateManagementSuite />




      <IconButton disabled={store.isAtRoot} onClick={() => { store.chartStore.clearAllCharts(); store.configStore.loadedStateName = ""; }}>
        <Tooltip title='Clear All Charts'>
          <DeleteIcon />
        </Tooltip>
      </IconButton>

      <IconButton disabled={store.configStore.loadedStateName.length === 0} onClick={updateState}>
        <Tooltip title={`Save to ${store.configStore.loadedStateName}`}>
          <SaveIcon />
        </Tooltip>
      </IconButton>


      <UndoRedoButtons />

      <IconButton onClick={() => { store.configStore.largeFont = !store.configStore.largeFont; }} >
        <Tooltip title='Change Font Size'>
          <FormatSizeIcon css={store.configStore.largeFont ? `` : ManualDisableCSS} />
        </Tooltip>
      </IconButton>

      <IconButton onClick={handleMoreClick} >
        <Tooltip title='More'>
          <MoreVertIcon />
        </Tooltip>
      </IconButton>
      <Menu anchorEl={anchorMore} open={Boolean(anchorMore)} onClose={handleMoreClose} >

        <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: " black" }}>
          <MenuItem onClick={handleMoreClose}>
            <ListItemIcon>
              <BugReportOutlinedIcon />
            </ListItemIcon>
            Report a Bug
          </MenuItem>
        </a>
        <MenuItem onClick={() => { handleMoreClose(); setOpenAbout(true); }}>
          <ListItemIcon>
            <InfoOutlinedIcon />
          </ListItemIcon>
          About
        </MenuItem>
        <MenuItem onClick={() => { handleMoreClose(); store.configStore.privateMode = !store.configStore.privateMode; }} css={store.configStore.privateMode ? `` : ManualDisableCSS}>
          <ListItemIcon>
            <VpnKeyIcon css={store.configStore.privateMode ? `` : ManualDisableCSS} />
          </ListItemIcon>
          Private Mode
        </MenuItem>
        <MenuItem onClick={() => { logoutHandler(); }}>
          <ListItemIcon>
            <ExitToAppIcon />
          </ListItemIcon>
          Log Out
        </MenuItem>
      </Menu>
      <InfoDialog setOpenAbout={passSetOpenAbout} openAbout={openAbout} />

    </PaddedToolBar>

  );

  const configureOutput = () => {
    if (store.configStore.topMenuBarAddMode) {

      return (<AddModeTopMenu addingChartType={addingChartType} />);
    } else {

      return regularMenu;
    }
  };

  return (<AppBar position="static" color="transparent" elevation={2} >
    {configureOutput()}
  </AppBar>);
};



export default observer(RegularModeMenu);

const StyledImage = styled.img({
  margin: 'auto!important',
  display: 'block!important',
  maxWidth: '100%!important',
  height: "35px!important"
});

const TitleTypography = styled(Typography)({
  flexGrow: 1,
});

const ManualDisableCSS = css({
  color: "rgba(0, 0, 0, 0.26)"
});
