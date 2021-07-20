import { max } from "d3"
import { observer } from "mobx-react"
import { FC, useEffect, useState } from "react"
import { Grid } from "semantic-ui-react"
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker"
import CurrentSelected from "./CurrentSelected"
import CurrentView from "./CurrentView"
import SurgeryListViewer from "./SurgeryListViewer"
import SurgerySearchBar from "./SurgerySearchBar"

type Props = { totalCaseNum: number }

const LeftToolBox: FC<Props> = ({ totalCaseNum }: Props) => {

    const [surgeryList, setSurgeryList] = useState<any[]>([]);
    const [maxCaseCount, setMaxCaseCount] = useState(0);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}get_attributes`)
            .then(response => response.json())
            .then(function (data) {
                const result = data.result;
                let tempSurgeryList: any[] = result;
                let tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);
                tempMaxCaseCount = 10 ** (tempMaxCaseCount.toString().length);
                setMaxCaseCount(tempMaxCaseCount)
                tempSurgeryList.sort((a: any, b: any) => b.count - a.count)
                stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList)
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <Grid divided="vertically" verticalAlign={"middle"} padded>
        <CurrentView totalCaseNum={totalCaseNum} />
        <CurrentSelected />
        <SurgerySearchBar surgeryList={surgeryList} />
        <SurgeryListViewer surgeryList={surgeryList} maxCaseCount={maxCaseCount} />
    </Grid>
}

export default observer(LeftToolBox)