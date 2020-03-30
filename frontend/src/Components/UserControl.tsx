import React, { FC, useEffect, useState } from "react";
import Store from '../Interfaces/Store'
// import {}
import { Menu, Checkbox, Button, Dropdown, Container } from 'semantic-ui-react'
import { inject, observer } from "mobx-react";
import { actions } from '..'
import { Slider } from 'react-semantic-ui-range';

interface OwnProps {
  store?: Store;
}

export type Props = OwnProps;

const UserControl: FC<Props> = ({ store }: Props) => {
  const {
    isAtRoot,
    isAtLatest,
    //  perCaseSelected,
    yearRange,
    //  dumbbellSorted
  } = store!;
  //  const [procedureList, setProcedureList] = useState({ result: [] })
  const [addMode, setAddMode] = useState(false);
  const [addingChartType, setAddingChartType] = useState(-1)
  const [xSelection, setXSelection] = useState("")
  const [ySelection, setYSelection] = useState("")
  const [dumbbellAggregation, setDumbbellAggregation] = useState("")
  const [elementCounter, addToElementCounter] = useState(0)
  const sliderSettings = {
    start: [0, 5],
    min: 0,
    max: 5,
    step: 1,
    onChange: (value: any) => {
      actions.yearRangeChange(value)
    }
  }

  const barChartValuesOptions = [
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

  const scatterXOptions = [
    {
      value: "PREOP_HEMO",
      key: "PREOP_HEMO",
      text: "Preoperative Hemoglobin Value"
    },
    {
      value: "POSTOP_HEMO",
      key: "POSTOP_HEMO",
      text: "Postoperative Hemoglobin Value"
    }
  ]

  const dumbbellValueOptions = [
    { value: "HEMO_VALUE", key: "HEMO_VALUE", text: "Hemoglobin Value" }
  ]

  const dumbbellFacetOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
      value: "ANESTHOLOGIST_ID",
      key: "ANESTHOLOGIST_ID",
      text: "Anesthologist ID"
    },
    { value: "QUARTER", key: "QUARTER", text: "Quarter" },
  ]

  const barChartAggregationOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
      value: "ANESTHOLOGIST_ID",
      key: "ANESTHOLOGIST_ID",
      text: "Anesthologist ID"
    }
  ];

  const addOptions = [
    [barChartValuesOptions, barChartAggregationOptions],

    [dumbbellValueOptions, barChartValuesOptions.concat(dumbbellFacetOptions)],
    [scatterXOptions, barChartValuesOptions]

  ]
  const typeDiction = ["BAR", "DUMBBELL", "SCATTER"]
  // const addOptions = [{ key: "BAR", value: "BAR", text: "Customized Bar Chart" },
  //   { key: "DUMBBELL", value: "DUMBBELL", text: "Dumbbell Chart" },
  //   { key: "SCATTER", value: "SCATTER", text: "Scatter Plot" }
  // ]



  const addModeButtonHandler = (chartType: number) => {
    setAddMode(true);
    setAddingChartType(chartType)
  }

  const dumbbellAggregationChangeHandler = (e: any, value: any) => {
    if (value.value === "None") {
      setDumbbellAggregation("")
    }
    else {
      setDumbbellAggregation(value.value)
    }
  }

  const xAxisChangeHandler = (e: any, value: any) => {
    setXSelection(value.value)
  }

  const yAxisChangeHandler = (e: any, value: any) => {
    setYSelection(value.value)
  }

  const confirmChartAddHandler = () => {
    if (xSelection && ySelection && addingChartType > -1) {
      addToElementCounter(elementCounter + 1)
      actions.addNewChart(xSelection, ySelection, elementCounter, typeDiction[addingChartType], dumbbellAggregation)
      setAddMode(false);
      setAddingChartType(-1)
      setDumbbellAggregation("");
    }

  }

  const cancelChartAddHandler = () => {
    setAddMode(false);
  }

  const regularMenu = (
    <Menu widths={6}>
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
      {/* <Menu.Item>
          <Checkbox
            toggle
            checked={perCaseSelected}
            onClick={actions.togglePerCase}
          />
          <label> Per Case Mode</label>
        </Menu.Item> */}
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
        {/* <Button onClick={addModeButtonHandler} content={"Add"} /> */}
        <Dropdown button text="Add" pointing>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => addModeButtonHandler(0)}>Customized Bar Chart</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(1)}>Dumbbell Chart</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(2)}>Scatter Plot</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

      </Menu.Item>
      {/* <Menu.Item>
                <Checkbox toggle checked={dumbbellSorted} onClick={actions.toggleDumbbell}/>
          <label> Sort Dumbbell</label>
        </Menu.Item> */}
    </Menu>
  );


  const addBarChartMenu = (
    <Menu widths={4}>
      <Menu.Item>
        <Dropdown
          placeholder={addingChartType === 2 ? "Select Y-axis Attribute" : "Select Value to Show"}
          selection
          options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
          onChange={yAxisChangeHandler}
        />
      </Menu.Item>
      <Menu.Item>
        <Dropdown
          placeholder={addingChartType === 0 ? "Select Aggregation" : addingChartType === 1 ? "Facet by" : "Select X-axis Attribute"}
          selection
          options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
          onChange={xAxisChangeHandler}
        />
      </Menu.Item>
      {/* {addingChartType === 1 ? (<Menu.Item>
        <Dropdown
          placeholder={"Select Aggregation"}
          selection
          options={dumbbellFacetOptions}
          onChange={dumbbellAggregationChangeHandler}
        />
      </Menu.Item>) : (<></>)} */}
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
  return addMode ? addBarChartMenu : regularMenu;
};
export default inject('store')(observer(UserControl))