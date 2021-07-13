import { FC } from "react"
import { Grid } from "semantic-ui-react"
import CurrentSelected from "./CurrentSelected"
import CurrentView from "./CurrentView"
import SurgeryListViewer from "./SurgeryListViewer"

type Props = { totalCaseNum: number }

const LeftToolBox: FC<Props> = ({ totalCaseNum }: Props) => {

    return <Grid divided="vertically" verticalAlign={"middle"} padded>
        <CurrentView totalCaseNum={totalCaseNum} />
        <CurrentSelected />
        <SurgeryListViewer />
    </Grid>
}

export default LeftToolBox