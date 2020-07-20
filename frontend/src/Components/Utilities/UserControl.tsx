import React, { FC, useEffect, useState, useRef } from "react";
import Store from '../../Interfaces/Store'
// import {}
import { Image, Menu, Checkbox, Button, Dropdown, Container, Modal, Icon, Message, Segment, Form, List } from 'semantic-ui-react'
import { inject, observer } from "mobx-react";
import { actions, provenance } from '../..'
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import 'react-semantic-ui-datepickers/dist/react-semantic-ui-datepickers.css';
import { timeFormat } from "d3";
import { blood_red } from "../../PresetsProfile";
import {
  barChartValuesOptions, dumbbellFacetOptions, barChartAggregationOptions,
  interventionChartType, presetOptions, stateUpdateWrapperUseJSON, dumbbellValueOptions, scatterYOptions, typeDiction
} from "../../PresetsProfile";
import ClipboardJS from 'clipboard';
import { NavLink } from 'react-router-dom'
import { getCookie } from "../../Interfaces/UserManagement";
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
  } = store!;

  const urlRef = useRef(null);
  const [addMode, setAddMode] = useState(false);
  const [addingChartType, setAddingChartType] = useState(-1)
  const [xSelection, setXSelection] = useState("")
  const [ySelection, setYSelection] = useState("")
  const [interventionDate, setInterventionDate] = useState<number | undefined>(undefined)
  // const [elementCounter, addToElementCounter] = useState(0)
  const [interventionPlotType, setInterventionPlotType] = useState<string | undefined>(undefined)
  const [shareUrl, setShareUrl] = useState(window.location.href);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [openSaveStateModal, setOpenSaveStateModal] = useState(false)
  const [stateName, setStateName] = useState("")
  const [listOfSavedState, setListOfSavedState] = useState<string[]>([])
  const [openManageStateModal, setOpenManageStateModal] = useState(false)
  const [openRenameStateModal, setRenameStateModal] = useState(false)



  new ClipboardJS(`.copy-clipboard`);


  async function fetchSavedStates() {
    const res = await fetch(`http://localhost:8000/api/state`)
    const result = await res.json()
    if (result) {
      const resultList = result.map((d: any[]) => d[1])
      stateUpdateWrapperUseJSON(listOfSavedState, resultList, setListOfSavedState)
    }
  }

  useEffect(() => {
    fetchSavedStates()
  }, [])

  const loadSavedState = async (name: string) => {
    const res = await (fetch(`http://localhost:8000/api/state?name=${name}`))
    const result = await res.json()
    provenance.importState(result.definition)

  }


  const addOptions = [
    [barChartValuesOptions, barChartAggregationOptions],
    [dumbbellValueOptions, barChartValuesOptions.concat(dumbbellFacetOptions)],
    [scatterYOptions, barChartValuesOptions],
    [barChartValuesOptions, barChartAggregationOptions],
    [barChartValuesOptions, barChartAggregationOptions]
  ]


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

  const simulateAPIClick = () => {
    fetch(`http://localhost:8000/accounts/login/`, {
      method: 'GET',
      credentials: 'include',
    })
    var csrftoken = getCookie('csrftoken');
    return csrftoken
  }



  const regularMenu = (
    <Menu widths={6}>
      <Menu.Item>
        <Image
          style={{ height: "40px" }}
          size="small"
          as='a'
          target="_blank"
          src="https://raw.githubusercontent.com/visdesignlab/visdesignlab.github.io/master/assets/images/logos/vdl.png"
          href="https://vdl.sci.utah.edu"
        />

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

      {/* <Menu.Item>
        <Container>
          <SemanticDatePicker placeholder={`${timeFormat("%Y-%m-%d")(new Date(rawDateRange[0]))} - ${timeFormat("%Y-%m-%d")(new Date(rawDateRange[1]))}`} type="range" onChange={onDateChange} />
        </Container>
      </Menu.Item> */}


      <Menu.Item>
        <Dropdown button text="State Management">
          <Dropdown.Menu>
            <Dropdown.Item>
              <Dropdown selectOnBlur={false} text="Presets" >
                <Dropdown.Menu>
                  {presetOptions.map((d: { value: number, text: string }) => {
                    return (<Dropdown.Item key={d.text} onClick={() => { actions.loadPreset(d.value) }} content={d.text} />)
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </Dropdown.Item>
            <Dropdown.Item>
              <Dropdown selectOnBlur={false} text="Saved"  >
                <Dropdown.Menu>
                  {listOfSavedState.map((d) => {
                    return (<Dropdown.Item onClick={() => { loadSavedState(d) }} content={d} />)
                  })}
                </Dropdown.Menu>
              </Dropdown>

            </Dropdown.Item>

            <Dropdown.Item icon="share alternate"
              content="Share"
              onClick={() => {
                setShareUrl(
                  //Kiran says there is a bug with the exportState, so using exportState(false) for now
                  `${window.location.href}#${provenance.exportState(false)}`,
                );
                setOpenShareModal(true)
              }}
            />
            <Dropdown.Item icon="save" content="Save State"
              onClick={() => { setOpenSaveStateModal(true) }} />

            <Dropdown.Item icon="setting" content="Manage Saved States"
              onClick={() => {
                setOpenManageStateModal(true)
              }}
            />
          </Dropdown.Menu>
        </Dropdown>


        {/* Modal for Manage State */}
        <Modal open={openManageStateModal} >
          <Modal.Header content="Manage Saved States" />
          <Modal.Content>
            <List divided verticalAlign="middle">
              {listOfSavedState.map((d) => {
                return (<List.Item key={d}>
                  <List.Content floated="right">
                    <Button onClick={() => {
                      const csrftoken = simulateAPIClick()
                      fetch(`http://localhost:8000/api/state`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: {
                          'Accept': 'application/x-www-form-urlencoded',
                          'Content-Type': 'application/x-www-form-urlencoded',
                          'X-CSRFToken': csrftoken || '',
                          "Access-Control-Allow-Origin": 'http://localhost:3000',
                          "Access-Control-Allow-Credentials": "true",
                        },
                        body: JSON.stringify({ name: d })
                      }).then(() => { fetchSavedStates() })
                    }}
                      content="Delete" />
                  </List.Content>
                  <List.Content verticalAlign="middle" content={d} />
                </List.Item>)
              })}

            </List>
          </Modal.Content>
          <Modal.Actions>
            <Button
              content="Close"
              onClick={() => { setOpenManageStateModal(false) }} />
          </Modal.Actions>

        </Modal>

        {/* Modal for Saving State, has a form input */}
        <Modal open={openSaveStateModal} closeOnEscape={false} closeOnDimmerClick={false}>
          <Modal.Header content="Save the current state" />
          <Modal.Content>
            <Form>
              <Form.Input label="Name of State" onChange={(e, d) => { setStateName(d.value) }} />
            </Form>
          </Modal.Content>
          <Modal.Actions>
            <Button disabled={stateName.length === 0} content="Save" positive onClick={() => {

              const csrftoken = simulateAPIClick()
              if (listOfSavedState.includes(stateName)) {
                fetch(`http://localhost:8000/api/state`, {
                  method: `PUT`,
                  credentials: "include",
                  headers: {
                    'Accept': 'application/x-www-form-urlencoded',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrftoken || '',
                    "Access-Control-Allow-Origin": 'http://localhost:3000',
                    "Access-Control-Allow-Credentials": "true",
                  },
                  body: JSON.stringify({ old_name: stateName, new_name: stateName, new_definition: provenance.exportState(false) })
                })
              } else {
                fetch(`http://localhost:8000/api/state`, {
                  method: 'POST',
                  credentials: "include",
                  headers: {
                    'Accept': 'application/x-www-form-urlencoded',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrftoken || '',
                    "Access-Control-Allow-Origin": 'http://localhost:3000',
                    "Access-Control-Allow-Credentials": "true",
                  },
                  body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&definition=${provenance.exportState(false)}`
                })
                  .then(() => { fetchSavedStates() })
              }
              setOpenSaveStateModal(false)
              setStateName("")
            }} />
            <Button content="Cancel" onClick={() => { setOpenSaveStateModal(false) }} />
          </Modal.Actions>
        </Modal>

        {/* Modal for sharing state.   */}
        <Modal
          open={openShareModal}
          onClose={() => { setOpenShareModal(false) }}
        >
          <Modal.Header>
            Use the following URL to share your state
               </Modal.Header>
          <Modal.Content scrolling>
            <Message info>Length of URL: {shareUrl.length}</Message>
            <Segment
              ref={urlRef}
              //   textAlign="justified"
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

      <Menu.Item>
        <Button content="Preview Mode" onClick={() => { store!.previewMode = true }} />
      </Menu.Item>
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
        <NavLink component={Button} isActive={() => { return false }} to="/" onClick={() => { store!.isLoggedIn = false; }} >
          Log Out
        </NavLink>

      </Menu.Item>
    </Menu>
  );
  //TODO the placeholder does not reset
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
