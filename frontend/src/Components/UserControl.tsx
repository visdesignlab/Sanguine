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
    const [procedureList, setProcedureList] = useState({ result: [] })
    const [addMode, setAddMode] = useState(false);
    const [xSelection, setXSelection] = useState("")
    const [ySelection, setYSelection] = useState("")
    const [elementCounter,addToElementCounter]=useState(0)
    const sliderSettings = {
        start: [0, 5],
        min: 0,
        max: 5,
        step: 1,
        onChange: (value: any) => {
            actions.yearRangeChange(value)
        }
    }

    const y_axis_selection = [
      {
        value: "PRBC_UNITS",
        key: "PRBC_UNITS",
        text: "Intraoperative RBCs Transfused"
      },
      {
        value: "FFP_UNITS",
        key: "FFP_UNITS",
        text: "Intraoperative FFP Transfused"
      },
      {
        value: "PLT_UNITS",
        key: "PLT_UNITS",
        text: "Intraoperative Platelets Transfused"
      },
      {
        value: "CRYO_UNITS",
        key: "CRYO_UNITS",
        text: "Intraoperative Cryo Transfused"
      },
      {
        value: "CELL_SAVER_ML",
        key: "CELL_SAVER_ML",
        text: "Cell Salvage Volume (ml)"
      }
    ];
    
    const x_axis_selection = [
      { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
      { value: "YEAR", key: "YEAR", text: "Year" },
      {
        value: "ANESTHOLOGIST_ID",
        key: "ANESTHOLOGIST_ID",
        text: "Anesthologist ID"
      },
      { value: "HEMO_VALUE", key: "HEMO_VALUE", text: "Hemoglobin Value" }
    ];

    // const chart_types = [
    //   { value: "bar", label: "Barchart" },
    //   { value: "scatter", label: "Scatter Plot" },
    //   { value: "dumbbell", label: "Dumbbell Plot" }
    // ];

    async function fetchProcedureList() {
        const res = await fetch("http://localhost:8000/api/get_attributes")
        const data = await res.json()
        setProcedureList(data)
    }
    
    useEffect(() => {
        fetchProcedureList()
    }, [])

    const addModeButtonHandler = () => {
        setAddMode(true);
    }

    const xAxisChangeHandler = (e: any,value:any) => {
       setXSelection(value.value)
    }

    const yAxisChangeHandler = (e: any, value: any) => {
        setYSelection(value.value)
    }

    const confirmChartAddHandler = () => {
        if (xSelection && ySelection) {
            addToElementCounter(elementCounter+1)
            actions.addNewChart(xSelection, ySelection,elementCounter)
            setAddMode(false);
        }
        
    }

    const cancelChartAddHandler = () => {
        setAddMode(false);
    }

    const regularMenu = (
      <Menu widths={7}>
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
            <Slider
              discrete
              multiple
              settings={sliderSettings}
              value={yearRange}
            />
          </Container>
        </Menu.Item>
        <Menu.Item>
            <Button onClick={addModeButtonHandler} content={"Add"}/>
        </Menu.Item>
      </Menu>
    );
    
    const addMenu = (
      <Menu widths={4}>
        <Menu.Item>
          <Dropdown
            placeholder="Select x axis attribute"
            selection
            options={x_axis_selection}
            onChange={xAxisChangeHandler}
          />
        </Menu.Item>
        <Menu.Item>
          <Dropdown
            placeholder="Select y axis attribute"
            selection
            options={y_axis_selection}
            onChange={yAxisChangeHandler}
          />
        </Menu.Item>
        <Menu.Item>
          <Button.Group>
            <Button
              positive
              onClick={confirmChartAddHandler}
              content={"Confirm"}
            />
            <Button content={"Cancel"} onClick={cancelChartAddHandler} />
          </Button.Group>
        </Menu.Item>
      </Menu>
    );
    return addMode ? addMenu : regularMenu;
};
export default inject('store')(observer(UserControl))