import { CSSProperties, ReactNode } from 'react';

type Props = {
    index: number,
    value: number,
    children: ReactNode,
    styling: CSSProperties | undefined;
};

function TabPanel({
  index, value, children, styling,
}: Props) {
  return (
    <div hidden={value !== index} style={styling}>
      {children}
    </div>
  );
}

export default TabPanel;
