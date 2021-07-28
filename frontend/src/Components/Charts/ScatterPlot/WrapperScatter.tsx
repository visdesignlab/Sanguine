import { Grid, IconButton, Menu, MenuItem } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext, useRef, useState } from "react";
import { DataContext } from "../../../App";
import Store from "../../../Interfaces/Store";
import { ScatterDataPoint } from "../../../Interfaces/Types/DataTypes";
import { BloodComponentOptions, dumbbellFacetOptions } from "../../../Presets/DataDict";
import { useStyles } from "../../../Presets/StyledComponents";
import SettingsIcon from '@material-ui/icons/Settings';
import NestedMenuItem from "material-ui-nested-menu-item";
import ChartConfigMenu from "../ChartAccessories/ChartConfigMenu";

type Props = {
    yValueOption: string;
    xAggregationOption: string;
    chartId: string;
    layoutW: number;
}
const WrapperScatter: FC<Props> = ({ yValueOption, xAggregationOption, chartId, layoutW }: Props) => {

    const hemoData = useContext(DataContext);
    const store = useContext(Store);
    const styles = useStyles();


    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(layoutW === 1 ? 542.28 : 1146.97);
    const [height, setHeight] = useState(0);
    const [data, setData] = useState<ScatterDataPoint[]>([]);
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(0);
    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const changeXAxis = (value: string) => {
        store.chartStore.changeChart(value, yValueOption, chartId, "SCATTER")
    }

    const changeYAxis = (value: string) => {
        store.chartStore.changeChart(xAggregationOption, value, chartId, "SCATTER")
    }

    return (
        <Grid container direction="row" alignItems="center" className={styles.chartWrapper}>
            <Grid item xs={1}>
                <ChartConfigMenu
                    xAggregationOption={xAggregationOption}
                    yValueOption={yValueOption}
                    chartTypeIndexinArray={2}
                    chartId={chartId}
                    requireOutcome={false} />
            </Grid>
        </Grid>)
}
export default observer(WrapperScatter)