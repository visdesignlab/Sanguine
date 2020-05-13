import React, { FC, useEffect, useState, useRef } from "react";
import Store from '../../Interfaces/Store'
// import {}
import { Menu, Checkbox, Button, Dropdown, Container, Modal, Icon, Message, Segment } from 'semantic-ui-react'
import { inject, observer } from "mobx-react";
import { actions, provenance } from '../..'
import { Slider } from 'react-semantic-ui-range';
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import 'react-semantic-ui-datepickers/dist/react-semantic-ui-datepickers.css';
import { timeFormat } from "d3";
import { blood_red } from "../../ColorProfile";
import { barChartValuesOptions, dumbbellFacetOptions, barChartAggregationOptions, interventionChartType } from "../../Interfaces/ApplicationState";
import ClipboardJS from 'clipboard';

interface OwnProps {
  store?: Store;
}

export type Props = OwnProps;

const UserControl: FC<Props> = ({ store }: Props) => {
  const {
    isAtRoot,
    isAtLatest,
    showZero,
    rawDateRange,
    nextAddingIndex
    //  perCaseSelected,
    //yearRange,
    //  dumbbellSorted
  } = store!;
  //  const [procedureList, setProcedureList] = useState({ result: [] })
  const urlRef = useRef(null);
  const [addMode, setAddMode] = useState(false);
  const [addingChartType, setAddingChartType] = useState(-1)
  const [xSelection, setXSelection] = useState("")
  const [ySelection, setYSelection] = useState("")
  const [interventionDate, setInterventionDate] = useState<number | undefined>(undefined)
  // const [elementCounter, addToElementCounter] = useState(0)
  const [interventionPlotType, setInterventionPlotType] = useState<string | undefined>(undefined)
  const [shareUrl, setShareUrl] = useState(window.location.href)

  new ClipboardJS(`.copy-clipboard`);
  const onDateChange = (event: any, data: any) => {
    console.log(data.value)
    if (data.value.length > 1) {

      actions.dateRangeChange([data.value[0], data.value[1]])
    }
  }





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





  const addOptions = [
    [barChartValuesOptions, barChartAggregationOptions],
    [dumbbellValueOptions, barChartValuesOptions.concat(dumbbellFacetOptions)],
    [scatterXOptions, barChartValuesOptions],
    [barChartValuesOptions, barChartAggregationOptions],
    [barChartValuesOptions, barChartAggregationOptions]

  ]
  const typeDiction = ["VIOLIN", "DUMBBELL", "SCATTER", "HEATMAP", "INTERVENTION"]




  const addModeButtonHandler = (chartType: number) => {
    setAddMode(true);
    setAddingChartType(chartType)
  }

  const interventionHandler = (e: any, value: any) => {
    if (value.value === "None") {
      setInterventionDate(undefined)
    }
    else {
      setInterventionDate(value.value.getTime())
    }
  }



  const xAxisChangeHandler = (e: any, value: any) => {
    setXSelection(value.value)
  }

  const yAxisChangeHandler = (e: any, value: any) => {
    setYSelection(value.value)
  }

  const interventionPlotHandler = (e: any, value: any) => {
    setInterventionPlotType(value.value)
  }


  const confirmChartAddHandler = () => {
    if (xSelection && ySelection && addingChartType > -1) {
      // addToElementCounter(elementCounter + 1)
      actions.addNewChart(xSelection, ySelection, nextAddingIndex, typeDiction[addingChartType], interventionDate, interventionPlotType)
      setAddMode(false);
      setAddingChartType(-1)
      setInterventionDate(undefined);
      setInterventionPlotType(undefined);
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

      <Menu.Item>
        <Container>

          <SemanticDatePicker placeholder={`${timeFormat("%Y-%m-%d")(new Date(rawDateRange[0]))} - ${timeFormat("%Y-%m-%d")(new Date(rawDateRange[1]))}`} type="range" onChange={onDateChange} />
        </Container>
      </Menu.Item>
      <Menu.Item>
        {/* <Button onClick={addModeButtonHandler} content={"Add"} /> */}
        <Dropdown button text="Add" pointing style={{ background: blood_red, color: "white" }}>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => addModeButtonHandler(0)}>Violin Plot</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(1)}>Dumbbell Chart</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(2)}>Scatter Plot</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(3)}>Heat Map</Dropdown.Item>
            <Dropdown.Item onClick={() => addModeButtonHandler(4)}>Intervention Plot</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

      </Menu.Item>
      <Menu.Item>
        <Checkbox
          checked={showZero}
          onClick={actions.toggleShowZero}
          label={<label> Show Zero Transfused </label>}
        />
      </Menu.Item>
      <Menu.Item>
        <Dropdown button text="Load Workspace" pointing>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => { actions.loadPreset(1) }}>Preset 1</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Menu.Item>
      {/* <Menu.Item>
                <Checkbox toggle checked={dumbbellSorted} onClick={actions.toggleDumbbell}/>
          <label> Sort Dumbbell</label>
        </Menu.Item> */}
      <Menu.Item>
        <Modal
          trigger={
            <Button
              onClick={() =>
                setShareUrl(
                  //Kiran says there is a bug with the exportState, so using exportState(false) for now
                  `${window.location.href}#${provenance.exportState(false)}`,
                )
              }
              icon
              labelPosition="left"
              primary>
              <Icon name="share alternate"></Icon>
                   Share
                 </Button>
          }>
          <Modal.Header>
            Use the following URL to share your state
               </Modal.Header>
          <Modal.Content scrolling>
            <Message info>Length of URL: {shareUrl.length}</Message>
            <Segment
              ref={urlRef}
              textAlign="justified"
              style={{ wordWrap: 'anywhere' }}>
              {shareUrl}
            </Segment>
          </Modal.Content>
          <Modal.Actions>
            <Button
              icon
              className="copy-clipboard"
              data-clipboard-text={shareUrl}>
              <Icon name="copy"></Icon>
                   Copy
                 </Button>
          </Modal.Actions>
        </Modal>
      </Menu.Item>
    </Menu>
  );



  const addBarChartMenu = (
    <Menu widths={5}>
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

      {addingChartType === 4 ? (
        [<Menu.Item>
          <SemanticDatePicker
            placeholder={"Intervention"}
            minDate={rawDateRange[0] as any}
            maxDate={rawDateRange[1] as any}
            onChange={interventionHandler} />
        </Menu.Item>,

        <Menu.Item>
          <Dropdown placeholder={"Plot Type"} selection options={interventionChartType} onChange={interventionPlotHandler}></Dropdown>
        </Menu.Item>]) : (<></>)}

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