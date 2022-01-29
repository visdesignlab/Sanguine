import { Grid, Tabs, Divider, Tab } from "@material-ui/core";
import { max } from "d3";
import { observer } from "mobx-react";
import { FC, useEffect, useState, useContext } from "react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { ProcedureEntry } from "../../../Interfaces/Types/DataTypes";
import FilterBoard from "../FilterInterface/FilterBoard";
import CurrentSelected from "./CurrentSelected";
import CurrentView from "./CurrentView";
import SurgeryListViewer from "./SurgeryListViewer";
import SurgerySearchBar from "./SurgerySearchBar";

type Props = { totalCaseNum: number; };

const LeftToolBox: FC<Props> = ({ totalCaseNum }: Props) => {

    const store = useContext(Store);
    const [surgeryList, setSurgeryList] = useState<ProcedureEntry[]>([]);
    const [maxCaseCount, setMaxCaseCount] = useState(0);
    const [tabValue, setTabValue] = useState(0);
    const handleChange = (event: any, newValue: any) => {
        setTabValue(newValue);
    };

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}get_procedure_counts`)
            .then(response => response.json())
            .then(function (data) {
                //Process the result into the data type required.
                const result = data.result.map((procedureInput: any) => {
                    const procedureOverlapList = Object.keys(procedureInput.overlapList).map(subProcedureName => {
                        return {
                            procedureName: subProcedureName,
                            count: procedureInput.overlapList[subProcedureName],
                        };
                    });
                    procedureOverlapList.sort((a: ProcedureEntry, b: ProcedureEntry) => b.count - a.count);
                    return {
                        procedureName: procedureInput.procedureName,
                        count: procedureInput.count,
                        overlapList: procedureOverlapList
                    };
                });
                let tempSurgeryList: ProcedureEntry[] = result;
                let tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);

                tempMaxCaseCount = 10 ** (tempMaxCaseCount.toString().length);
                setMaxCaseCount(tempMaxCaseCount);
                tempSurgeryList.sort((a: ProcedureEntry, b: ProcedureEntry) => b.count - a.count);

                //Code to save all procedure
                store.configStore.setAllProcedures(tempSurgeryList);

                stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList);
            }).catch(r => {
                console.log("failed to fetch required data");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const panes = [<div hidden={tabValue !== 0}>
        <Grid container >
            <CurrentView totalCaseNum={totalCaseNum} />
            <Divider orientation="horizontal" style={{ width: '98%', }} />
            <CurrentSelected />
            <Divider orientation="horizontal" style={{ width: '98%' }} />
            <SurgerySearchBar surgeryList={surgeryList} />
            <Divider orientation="horizontal" style={{ width: '98%' }} />
            <SurgeryListViewer surgeryList={surgeryList} maxCaseCount={maxCaseCount} />
        </Grid>
    </div>,
    <div hidden={tabValue !== 1} style={{ height: "85vh" }}>
        <FilterBoard />
    </div>];

    return (

        <Grid spacing={2}>
            <Tabs value={tabValue}
                onChange={handleChange}
                indicatorColor="primary"
                textColor="primary"
                centered>
                <Tab label="Current View" />
                <Tab label="Filter" />
            </Tabs>
            {panes[tabValue]}
        </Grid>);

};

export default observer(LeftToolBox);


