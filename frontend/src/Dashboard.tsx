import { observer } from "mobx-react"
import { FC } from "react"
import { Container } from "semantic-ui-react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import RegularModeMenu from "./Components/Utilities/RegularModeMenu"
import { SingleCasePoint } from "./Interfaces/Types/DataTypes"
import { LayoutDiv } from "./Presets/StyledComponents"

type Props = {
    hemoData: SingleCasePoint[];
}

const Dashboard: FC<Props> = ({ hemoData }: Props) => {
    return (<LayoutDiv>
        <Container fluid id="Top-Bar">
            <RegularModeMenu />
        </Container>
        <BrowserWarning />
        <DataRetrieval />
    </LayoutDiv>
    )
}
export default observer(Dashboard)