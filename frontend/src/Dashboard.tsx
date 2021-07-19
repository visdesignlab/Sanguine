import { observer } from "mobx-react"
import { FC, useContext } from "react"
import { Container, Grid } from "semantic-ui-react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox"
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu"
import { SingleCasePoint } from "./Interfaces/Types/DataTypes"
import { LayoutDiv, SpecialPaddingColumn } from "./Presets/StyledComponents"
import './App.css'
import LayoutGenerator from "./Components/LayoutGenerator"
import { DataContext } from "./App"



const Dashboard: FC = () => {

    const hemoData = useContext(DataContext)
    return (
        <LayoutDiv>
            <Container fluid id="Top-Bar">
                <RegularModeMenu />
            </Container>
            <Grid padded >
                <SpecialPaddingColumn width={2} id="Side-Bar">
                    <LeftToolBox totalCaseNum={hemoData.length} />
                </SpecialPaddingColumn>
                <Grid.Column width={12} id="Main-Body">
                    <LayoutGenerator />
                </Grid.Column>
                <Grid.Column width={2}>
                    <div>stuff</div>
                    {/* <DetailView hemoData={hemoData} /> */}
                </Grid.Column>
            </Grid>
            <BrowserWarning />
            <DataRetrieval />
        </LayoutDiv>
    )
}
export default observer(Dashboard)