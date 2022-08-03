import { IconButton } from "@mui/material";
import { useContext } from "react";
import { FC } from "react";
import OpenWithIcon from '@mui/icons-material/OpenWith';
import CloseIcon from '@mui/icons-material/Close';

import Store from "../../Interfaces/Store";
type Props = {
    chartID: string;
};
const ChartStandardButtons: FC<Props> = ({ chartID }: Props) => {
    const store = useContext(Store);
    return (
        < >
            <IconButton size="small" className="move-icon">
                <OpenWithIcon />
            </IconButton>
            <IconButton size="small" onClick={() => { store.chartStore.removeChart(chartID); }}>
                <CloseIcon />
            </IconButton>

        </>);
};

export default ChartStandardButtons;