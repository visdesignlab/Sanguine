import { observer } from "mobx-react"
import { FC, useContext } from "react"
// import { Container, Grid } from "semantic-ui-react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox"
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu"

import './App.css'
import LayoutGenerator from "./Components/LayoutGenerator"
import { DataContext } from "./App"
import Grid from "@material-ui/core/Grid"
import { Box, Divider } from "@material-ui/core"
import DetailView from "./Components/Utilities/DetailView/DetailView"



const Dashboard: FC = () => {

    const hemoData = useContext(DataContext)
    return (
        <div>
            <Box id="Top-Bar">
                <RegularModeMenu />
            </Box>
            <Divider />
            <Grid container direction="row" justifyContent="space-between">
                <Grid item xs={2} id="Side-Bar">
                    <LeftToolBox totalCaseNum={hemoData.length} />
                </Grid>
                <Grid item xs={8} id="Main-Body">
                    <LayoutGenerator />
                </Grid>
                <Grid item xs={2}>
                    <DetailView />
                </Grid>
            </Grid>
            {/* <BrowserWarning />
            <DataRetrieval /> */}
        </div>
    )
}
export default observer(Dashboard)