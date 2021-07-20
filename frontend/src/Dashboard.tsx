import { observer } from "mobx-react"
import { FC, useContext } from "react"
// import { Container, Grid } from "semantic-ui-react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox"
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu"
import { LayoutDiv, SpecialPaddingColumn } from "./Presets/StyledComponents"
import './App.css'
import LayoutGenerator from "./Components/LayoutGenerator"
import { DataContext } from "./App"
import Grid from "@material-ui/core/Grid"
import { Box, Divider } from "@material-ui/core"



const Dashboard: FC = () => {

    const hemoData = useContext(DataContext)
    return (
        <LayoutDiv>
            <Box id="Top-Bar">
                <RegularModeMenu />
            </Box>
            <Divider />
            <Grid container spacing={2} direction="row" justifyContent="space-between">
                <Grid item xs={2} id="Side-Bar">
                    <LeftToolBox totalCaseNum={hemoData.length} />
                </Grid>
                <Grid item xs={9} id="Main-Body">
                    <LayoutGenerator />
                </Grid>
                <Grid item xs={1}>
                    <div>stuff</div>
                    {/* <DetailView hemoData={hemoData} /> */}
                </Grid>
            </Grid>
            {/* <BrowserWarning />
            <DataRetrieval /> */}
        </LayoutDiv>
    )
}
export default observer(Dashboard)