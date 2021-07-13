import { observer } from "mobx-react"
import { FC } from "react"
import { Container, Grid } from "semantic-ui-react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import LeftToolBox from "./Components/Utilities/LeftToolBox/LeftToolBox"
import RegularModeMenu from "./Components/Utilities/TopMenu/RegularModeMenu"
import { SingleCasePoint } from "./Interfaces/Types/DataTypes"
import { LayoutDiv, SpecialPaddingColumn } from "./Presets/StyledComponents"
import './App.css'

type Props = {
    hemoData: SingleCasePoint[];
}

const Dashboard: FC<Props> = ({ hemoData }: Props) => {
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
                    {/* <LayoutGenerator hemoData={hemoData} /> */}
                </Grid.Column>
                <Grid.Column width={2}>
                    {/* <DetailView hemoData={hemoData} /> */}
                </Grid.Column>
            </Grid>
            <BrowserWarning />
            <DataRetrieval />
        </LayoutDiv>
    )
}
export default observer(Dashboard)