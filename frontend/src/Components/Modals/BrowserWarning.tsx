import {
  Modal, Text, Group, Button,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';

export function BrowserWarning() {
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
    <Modal
      opened={openWarning}
      onClose={() => setOpenWarning(false)} // Prevent closing
      withCloseButton={false}
      centered
      size="md"
      title={<Title order={3}>Browser Incompatible</Title>}
    >
      <Text>
        This application is designed to be used on Chrome. Using it on other browsers may cause inaccurate visual representations of the data.
      </Text>
      <Group justify="flex-end">
        <Button onClick={() => setOpenWarning(false)} variant="outline" color="blue">
          I understand
        </Button>
      </Group>
    </Modal>
  );
}
