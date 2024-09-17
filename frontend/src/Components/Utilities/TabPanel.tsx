import { ReactNode } from 'react';

function TabPanel({ index, value, children }: { index: number; value: number; children: ReactNode; }) {
  return (
    <div hidden={value !== index} style={{ height: 'calc(100% - 48px)' }}>
      {children}
    </div>
  );
}

export default TabPanel;
