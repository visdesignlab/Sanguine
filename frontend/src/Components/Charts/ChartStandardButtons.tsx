import { useContext } from "react"
import { FC } from "react"
import { Button } from "semantic-ui-react"
import Store from "../../Interfaces/Store"
type Props = {
    chartID: string
}
const ChartStandardButtons: FC<Props> = ({ chartID }: Props) => {
    const store = useContext(Store)
    return (<>
        <Button floated="right" icon="close" circular compact size="mini" basic onClick={() => { store.chartStore.removeChart(chartID) }} />
        <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
    </>)
}

export default ChartStandardButtons