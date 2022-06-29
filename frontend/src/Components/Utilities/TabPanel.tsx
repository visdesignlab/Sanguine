import { CSSProperties, FC, ReactNode } from "react";

type Props = {
    index: number,
    value: number,
    children: ReactNode,
    styling: CSSProperties | undefined;
};

const TabPanel: FC<Props> = ({ index, value, children, styling }: Props) => {
    return <div hidden={value !== index} style={styling}>
        {children}
    </div>;
};

export default TabPanel;