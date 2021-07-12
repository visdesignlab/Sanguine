import { observer } from "mobx-react"
import { FC } from "react"
import BrowserWarning from "./Components/Modals/BrowserWarning"
import DataRetrieval from "./Components/Modals/DataRetrieval"
import { SingleCasePoint } from "./Interfaces/Types/DataTypes"

type Props = {
    hemoData: SingleCasePoint[];
}

const Dashboard: FC<Props> = ({ hemoData }: Props) => {
    return <>
        <BrowserWarning />
        <DataRetrieval />
    </>

}
export default observer(Dashboard)