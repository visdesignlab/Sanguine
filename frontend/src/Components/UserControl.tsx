import React, { FC,useEffect,useState } from "react";
import Store from '../Interfaces/Store'
// import {}
import { Menu, Checkbox,Button, Dropdown,Container} from 'semantic-ui-react'
import { inject, observer } from "mobx-react";
import { actions } from '..'
import { Slider } from 'react-semantic-ui-range';

interface OwnProps{
    store?: Store;
}

export type Props = OwnProps;

const UserControl: FC<Props> = ({ store }: Props) => {
    const { isAtRoot, isAtLatest, perCaseSelected, yearRange, filterSelection } = store!;
    const formatFilterSelection = filterSelection.map(d => {
        const format = { key: d, text: d, value: d }
        return format
    })
    const [procedureList, setProcedureList] = useState({ result: [] })
    const slider_settings = {
        start: [0, 5],
        min: 0,
        max: 5,
        step: 1,
        onChange: (value: any) => {
            actions.yearRangeChange(value)
        }
    }
    async function fetchProcedureList() {
        const res = await fetch("http://localhost:8000/api/get_attributes")
        const data = await res.json()
        setProcedureList(data)
    }
    useEffect(() => {
        fetchProcedureList()
    }, [])
    
    return (
      <Menu widths={5}>
        <Menu.Item>
          <Button.Group>
            <Button primary disabled={isAtRoot} onClick={actions.goBack}>
              Undo
            </Button>
            <Button.Or></Button.Or>
            <Button secondary disabled={isAtLatest} onClick={actions.goForward}>
              Redo
            </Button>
          </Button.Group>
        </Menu.Item>
        <Menu.Item>
          <Checkbox
            toggle
            checked={perCaseSelected}
            onClick={actions.togglePerCase}
          />
          <label>Per Case Mode</label>
        </Menu.Item>
        <Menu.Item>
          <Dropdown
            placeholder="Procedure"
            multiple
            search
            selection
            onChange={actions.filterSelectionChange}
            options={procedureList.result}
            value={filterSelection}
          />
        </Menu.Item>
        <Menu.Item>
          <Container>
            <Slider discrete multiple settings={slider_settings} value={yearRange} />
          </Container>
        </Menu.Item>
      </Menu>
    );
};
export default inject('store')(observer(UserControl))