import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import { useEffect, useState } from 'react';

function BrowserWarning() {
  const [openWarning, setOpenWarning] = useState(false);

  // https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome/13348618#13348618
  const isChrome = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isChromium = (window as any).chrome;
    const winNav = window.navigator;
    const vendorName = winNav.vendor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isOpera = typeof (window as any).opr !== 'undefined';
    const isIEedge = winNav.userAgent.indexOf('Edge') > -1;
    const isIOSChrome = winNav.userAgent.match('CriOS');

    if (isIOSChrome) {
      return true;
    } if (
      isChromium !== null
      && typeof isChromium !== 'undefined'
      && vendorName === 'Google Inc.'
      && isOpera === false
      && isIEedge === false
    ) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    setOpenWarning(!isChrome());
  }, []);

  return (
    <Dialog open={openWarning}>
      <DialogTitle>Browser Incompatible</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This application is designed to be used on Chrome. Using it on other browsers may cause inaccurate visual representations of the data.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenWarning(false)} color="primary">
          I understand
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BrowserWarning;
