import { IconButton } from "@material-ui/core"
import { useContext } from "react"
import { FC } from "react"
import OpenWithIcon from '@material-ui/icons/OpenWith';
import CloseIcon from '@material-ui/icons/Close';

import Store from "../../Interfaces/Store"
type Props = {
    chartID: string
}
const ChartStandardButtons: FC<Props> = ({ chartID }: Props) => {
    const store = useContext(Store)
    return (
        <div style={{ textAlign: "right" }}>
            <IconButton size="small" className="move-icon">
                <OpenWithIcon />
            </IconButton>
            <IconButton size="small" onClick={() => { store.chartStore.removeChart(chartID) }}>
                <CloseIcon />
            </IconButton>

        </div>)
}

export default ChartStandardButtons