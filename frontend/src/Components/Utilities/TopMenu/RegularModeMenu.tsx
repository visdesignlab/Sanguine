/** @jsxImportSource @emotion/react */
import * as htmlToImage from 'html-to-image';
import {
  Menu, MenuItem, Button, AppBar, Typography, IconButton, Tooltip, ListItemIcon, Toolbar, Stack,
} from '@mui/material';
import { observer } from 'mobx-react';
import { useContext, useState } from 'react';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import InfoDialog from '../../Modals/InfoDialog';
import StateManagementSuite from './StateManagementSuite';
import UndoRedoButtons from './UndoRedoButtons';
import AddModeTopMenu from './AddModeTopMenu';
import { logoutHandler, simulateAPIClick } from '../../../Interfaces/UserManagement';
import Store from '../../../Interfaces/Store';
import { ChartType } from '../../../Presets/DataDict';

const StyledImage = styled.img({
  margin: 'auto!important',
  display: 'block!important',
  maxWidth: '100%!important',
  height: '35px!important',
});

const TitleTypography = styled(Typography)({
  flexGrow: 1,
});

const ManualDisableCSS = css({
  color: 'rgba(0, 0, 0, 0.26)',
});

function RegularModeMenu() {
  const store = useContext(Store);
  const [chartType, setChartType] = useState<ChartType | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorMore, setAnchorMore] = useState<null | HTMLElement>(null);
  const [openAbout, setOpenAbout] = useState(false);

  const passSetOpenAbout = (input: boolean) => {
    setOpenAbout(input);
  };
  const addModeButtonHandler = (type: ChartType) => {
    setChartType(type);
    store.configStore.topMenuBarAddMode = true;
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorMore(event.currentTarget);
  };
  const handleMoreClose = () => { setAnchorMore(null); };

  const handleClose = (input?: ChartType) => {
    setAnchorEl(null);
    if (input !== undefined) {
      addModeButtonHandler(input);
    }
  };

  const updateState = () => {
    const csrftoken = simulateAPIClick();
    fetch(`${import.meta.env.VITE_QUERY_URL}state`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrftoken || '',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ old_name: store.configStore.loadedStateName, new_name: store.configStore.loadedStateName, new_definition: store.provenance.exportState(false) }),
    }).then((response) => {
      if (response.status === 200) {
        store.configStore.snackBarIsError = false;
        store.configStore.snackBarMessage = 'State updated!';
        store.configStore.openSnackBar = true;
      } else {
        response.text().then(() => {
          store.configStore.snackBarIsError = true;
          store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
          store.configStore.openSnackBar = true;
        });
      }
    }).catch((error) => {
      store.configStore.snackBarIsError = true;
      store.configStore.snackBarMessage = `An error occurred: ${error}`;
      store.configStore.openSnackBar = true;
    });
  };

  // Screenshot function
  const handleScreenshot = async () => {
    // Get root element
    const htmlEl = document.documentElement;
    // Filter out the elements that should not be captured
    const filter = (node: HTMLElement): boolean => node.tagName !== 'NOSCRIPT';
    // Temporarily set the AppLayout grid items to overflow visible (for full-page screenshot)
    const tempStyleEl: HTMLStyleElement = document.createElement('style');
    tempStyleEl.innerHTML = '#app-layout .MuiGrid-item { overflow: visible !important; }';
    document.head.appendChild(tempStyleEl);

    // Screenshot options
    const options = {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter,
      // Full-page width and height
      width: htmlEl.scrollWidth,
      height: htmlEl.scrollHeight,
    };
    // Generate date string in the format YYYY-MM-DD_HH-MM-SS
    const dateString = new Date()
      .toISOString()
      .replace(/T/, '_')
      .split('.')[0]
      .replace(/:/g, '-');

    try {
      const dataUrl = await htmlToImage.toPng(htmlEl, options);
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Intelvia_Screenshot_${dateString}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      // Change AppLayout grid items back to overflow auto
      document.head.removeChild(tempStyleEl);
    }
  };

  return (
    <AppBar position="static" color="transparent" elevation={2}>
      <Toolbar sx={{ display: store.configStore.topMenuBarAddMode ? 'none' : '' }}>
        <Stack direction="row" spacing={1} sx={{ pr: 2 }}>
          <a href="https://healthcare.utah.edu" target="_blank" rel="noopener noreferrer">
            <StyledImage
              src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/u-of-u-health-social.png"
            />
          </a>
          <a href="https://arup.utah.edu" target="_blank" rel="noopener noreferrer">
            <StyledImage
              src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/ARUP-logo.png"
            />
          </a>
          <a href="https://vdl.sci.utah.edu" target="_blank" rel="noopener noreferrer">
            <StyledImage
              src="https://raw.githubusercontent.com/visdesignlab/Sanguine/main/images/vdl.png"
            />
          </a>
        </Stack>

        <TitleTypography variant="h6">
          Sanguine
        </TitleTypography>

        <Stack direction="row" spacing={1}>
          <Button startIcon={<InsertChartIcon />} color="primary" variant="contained" disableElevation onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true">Add Chart</Button>
          <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>
            <MenuItem onClick={() => handleClose('DUMBBELL')}>Dumbbell Chart</MenuItem>
            <MenuItem onClick={() => handleClose('SCATTER')}>Scatter Plot</MenuItem>
            <MenuItem onClick={() => handleClose('HEATMAP')}>Heat Map</MenuItem>
            <MenuItem onClick={() => handleClose('COST')}>Cost and Saving Chart</MenuItem>
          </Menu>

          <StateManagementSuite />
        </Stack>

        <IconButton disabled={store.isAtRoot} onClick={() => { store.chartStore.clearAllCharts(); store.configStore.loadedStateName = ''; }}>
          <Tooltip title="Clear All Charts">
            <DeleteIcon />
          </Tooltip>
        </IconButton>

        <IconButton disabled={store.configStore.loadedStateName.length === 0} onClick={updateState}>
          <Tooltip title={`Save to ${store.configStore.loadedStateName}`}>
            <SaveIcon />
          </Tooltip>
        </IconButton>

        <UndoRedoButtons />

        <IconButton onClick={() => { store.configStore.largeFont = !store.configStore.largeFont; }}>
          <Tooltip title="Change Font Size">
            <FormatSizeIcon css={store.configStore.largeFont ? '' : ManualDisableCSS} />
          </Tooltip>
        </IconButton>

        <IconButton onClick={handleScreenshot}>
          <Tooltip title="Screenshot Full Page">
            <ScreenshotMonitorIcon />
          </Tooltip>
        </IconButton>

        <IconButton onClick={handleMoreClick}>
          <Tooltip title="More">
            <MoreVertIcon />
          </Tooltip>
        </IconButton>
        <Menu anchorEl={anchorMore} open={Boolean(anchorMore)} onClose={handleMoreClose}>
          <a href="https://github.com/visdesignlab/Sanguine/issues" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: ' black' }}>
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
          <MenuItem onClick={() => { handleMoreClose(); store.configStore.privateMode = !store.configStore.privateMode; }} css={store.configStore.privateMode ? '' : ManualDisableCSS}>
            <ListItemIcon>
              <VpnKeyIcon css={store.configStore.privateMode ? '' : ManualDisableCSS} />
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
      </Toolbar>
      {chartType && <AddModeTopMenu chartType={chartType} sx={{ display: store.configStore.topMenuBarAddMode ? '' : 'none' }} />}
    </AppBar>
  );
}

export default observer(RegularModeMenu);
