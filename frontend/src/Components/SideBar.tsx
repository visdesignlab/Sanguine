import React, { FC, useEffect, useState } from "react";
import Store from "../Interfaces/Store";
// import {}
import { Menu,  Dropdown, Grid, Container } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { actions } from "..";

interface OwnProps{
    store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ store }: Props) => { 
       const {
         isAtRoot,
         isAtLatest,
         perCaseSelected,
         yearRange,
         filterSelection
       } = store!;
    const [procedureList, setProcedureList] = useState({ result: [] });
    async function fetchProcedureList() {
      const res = await fetch("http://localhost:8000/api/get_attributes");
      const data = await res.json();
      setProcedureList(data);
    }

    useEffect(() => {
      fetchProcedureList();
    }, []);

    return (
      <Grid
        divided="vertically"
        centered={true}
        verticalAlign={"middle"}
        padded={"vertically"}
      >
        <Grid.Row>
          <Dropdown
            placeholder="Procedure"
            multiple
            search
            selection
            onChange={actions.filterSelectionChange}
            options={procedureList.result}
            value={filterSelection}
          />
        </Grid.Row>
        <Grid.Row>
          <Container>Something Something</Container>
        </Grid.Row>
      </Grid>
    );
}
export default inject("store")(observer(SideBar));