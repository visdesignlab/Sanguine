import { List, ListItem } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import { DataContext } from "../../../App";
import { CURRENT_QUARTER, LAST_QUARTER } from "./EmailComponent";
import { SingleCasePoint } from "../../../Interfaces/Types/DataTypes";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { format, sum } from "d3";
import EmailEmbeddedBarChart from "./EmailEmbeddedBarChart";
import EmailEmbeddedDotPlot from "./EmailEmbeddedDotPlot";
import styled from "@emotion/styled";


type Prop = {
  providerType: string;
  currentSelectedProviderID: string;
};

const EmailText: FC<Prop> = ({ providerType, currentSelectedProviderID }: Prop) => {

  const allData = useContext(DataContext);
  const [allStats, setAllStats] = useState({
    curTotalCases: 0,
    lastTotalCases: 0,
    curRBC: 0,
    lastRBC: 0,
    curDRG: 0,
    allDRG: 0,
    postTransHemo: [] as number[]
  });


  useEffect(() => {
    const curTotalCases = allData.filter((a) => a.DATE > CURRENT_QUARTER[0]
      && a.DATE < CURRENT_QUARTER[1]
      && a[providerType].toString() === currentSelectedProviderID);

    const lastTotalCases = allData.filter((a) => a.DATE > LAST_QUARTER[0]
      && a.DATE < LAST_QUARTER[1]
      && a[providerType].toString() === currentSelectedProviderID);

    const transfusedCases = allData.filter((a) =>
      a.DATE > CURRENT_QUARTER[0]
      && a.DATE < CURRENT_QUARTER[1]
      && a.PRBC_UNITS);

    const newAllStats = {
      curTotalCases: curTotalCases.length,
      lastTotalCases: lastTotalCases.length,
      curRBC: sum(curTotalCases, c => c.PRBC_UNITS),
      lastRBC: sum(lastTotalCases, c => c.PRBC_UNITS),
      curDRG: sum(curTotalCases, c => c.DRG_WEIGHT) / curTotalCases.length,
      allDRG: sum(allData, c => c.DRG_WEIGHT) / allData.length,
      postTransHemo: transfusedCases.map(d => d.POSTOP_HGB)
    };
    console.log(newAllStats);
    // stateUpdateWrapperUseJSON(allStats, newAllStats, setAllStats);
    setAllStats(newAllStats);
  }, [providerType, currentSelectedProviderID, allData]);


  return <div>
    <List>
      <ListItem>
        <StatsSpan>{allStats.curTotalCases}</StatsSpan>
        {allStats.curTotalCases > allStats.lastTotalCases ? <ArrowUpwardIcon fontSize='small' /> : <></>}
        {allStats.curTotalCases < allStats.lastTotalCases ? <ArrowDownwardIcon fontSize='small' /> : <></>}
        cardiac sugeries</ListItem>
      <ListItem><span>Used <StatsSpan >{allStats.curRBC}</StatsSpan> units of Red Blood Cells</span></ListItem>
      <ListItem>
        <span>
          The average case complexity (DRG Weight) is <StatsSpan>{format(',.2f')(allStats.curDRG)}</StatsSpan>, <StatsSpan>{allStats.curDRG > allStats.allDRG ? 'higher' : 'lower'}</StatsSpan> than department average.
        </span>

        <EmailEmbeddedBarChart curData={allStats.curDRG} compareData={allStats.allDRG} />
      </ListItem>
      <ListItem>
        <span>
          Among the patients you transfused at least 1 red cell unit, the post-operative hemoglobin value (7.5) was above the recommended threshold <StatsSpan>{
            format(',.0%')(allStats.postTransHemo.filter(d => d > 7.5).length / allStats.postTransHemo.length)}</StatsSpan> of the time.
        </span>
        <EmailEmbeddedDotPlot dataArray={allStats.postTransHemo} standardLine={7.5} />
      </ListItem>
    </List>
  </div>;
};

export default observer(EmailText);

const StatsSpan = styled.span({
  color: 'blue'
}
);
