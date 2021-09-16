import { IconButton, Menu, MenuItem } from "@material-ui/core";
import { useContext } from "react";
import { FC, useState } from "react";
import InsertChartIcon from '@material-ui/icons/InsertChart';
import Store from "../../../Interfaces/Store";
import { ExtraPairOptions } from "../../../Presets/DataDict";
import { ExtraPairLimit } from "../../../Presets/Constants";


type Props = {
    extraPairLength: number
    chartId: string;
    disbleButton: boolean;
}
const ExtraPairButtons: FC<Props> = ({ extraPairLength, chartId, disbleButton }: Props) => {
    const store = useContext(Store)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const extraPairHandling = (input: string) => {
        store.chartStore.addExtraPair(chartId, input);
        handleClose()
    }

    return (
        <>
            <IconButton size="small" disabled={extraPairLength >= ExtraPairLimit || disbleButton} onClick={handleClick}>
                <InsertChartIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open}
                onClose={handleClose}
            >
                {ExtraPairOptions.map((option) => (
                    <MenuItem key={option.key} onClick={() => { extraPairHandling(option.key) }}>{option.text}</MenuItem>
                ))}
            </Menu>

        </>)
}

export default ExtraPairButtons