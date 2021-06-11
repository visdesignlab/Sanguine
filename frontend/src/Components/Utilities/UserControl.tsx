import React, { FC, useEffect, useState, useRef } from "react";
import Store from '../../Interfaces/Store'
// import {}
import { Image, Menu, Button, Dropdown, Modal, Icon, Message, Segment, Form, List } from 'semantic-ui-react'
import { inject, observer } from "mobx-react";
import { actions, provenance } from '../..'
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import 'react-semantic-ui-datepickers/dist/react-semantic-ui-datepickers.css';
import { blood_red, CompareSavingValuesOptions, OutcomeType } from "../../PresetsProfile";
import {
    barChartValuesOptions, dumbbellFacetOptions, barChartAggregationOptions,
    presetOptions, dumbbellValueOptions, scatterYOptions, typeDiction
} from "../../PresetsProfile";
import ClipboardJS from 'clipboard';
import { getCookie } from "../../Interfaces/UserManagement";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
interface OwnProps {
    store?: Store;
}

export type Props = OwnProps;

const UserControl: FC<Props> = ({ store }: Props) => {
    const {
        isAtRoot,
        isAtLatest,
        rawDateRange,
        nextAddingIndex
    } = store!;

    const urlRef = useRef(null);
    const interventionPlotType = "HEATMAP"
    const [addMode, setAddMode] = useState(false);
    const [addingChartType, setAddingChartType] = useState(-1)
    const [xSelection, setXSelection] = useState<string>("")
    const [ySelection, setYSelection] = useState<string>("")
    const [outcomeComparison, setOutcomeComparison] = useState<string>("")
    const [interventionDate, setInterventionDate] = useState<number | undefined>(undefined)

    const [shareUrl, setShareUrl] = useState(window.location.href);
    const [openShareModal, setOpenShareModal] = useState(false);
    const [openSaveStateModal, setOpenSaveStateModal] = useState(false)
    const [stateName, setStateName] = useState("")
    const [listOfSavedState, setListOfSavedState] = useState<string[]>([])
    const [openManageStateModal, setOpenManageStateModal] = useState(false)

    const [stateNameToShare, setStateNameToShare] = useState("")
    //is uid uxxxxxx or just numbers?
    const [uidToShare, setUIDToShare] = useState("");
    const [openUIDInputModal, setOpenUIDInputModal] = useState(false);
    const [editAccess, setEditAccess] = useState<Boolean>(false);
    const [errorMessage, setErrorMessage] = useState("")

    new ClipboardJS(`.copy-clipboard`);

    async function fetchSavedStates() {
        const res = await fetch(`${process.env.REACT_APP_QUERY_URL}state`)
        const result = await res.json()
        if (result) {
            const resultList = result.map((d: any[]) => d)
            stateUpdateWrapperUseJSON(listOfSavedState, resultList, setListOfSavedState)
        }
    }

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}state`)
            .then(result => result.json())
            .then(result => {
                if (result) {
                    const resultList = result.map((d: any[]) => d)
                    stateUpdateWrapperUseJSON(listOfSavedState, resultList, setListOfSavedState)
                }
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSavedState = async (name: string) => {
        const res = await (fetch(`${process.env.REACT_APP_QUERY_URL}state?name=${name}`))
        const result = await res.json()
        provenance.importState(result.definition)

    }

    const shareSpecificState = (name: string) => {
        setStateNameToShare(name)
        setOpenUIDInputModal(true);
    }


    const addOptions = [
        [barChartValuesOptions, barChartAggregationOptions],
        [dumbbellValueOptions, dumbbellFacetOptions],
        [scatterYOptions, barChartValuesOptions],
        [barChartValuesOptions, barChartAggregationOptions],
        [barChartValuesOptions, [barChartAggregationOptions[0], barChartAggregationOptions[2]]],
        [CompareSavingValuesOptions, barChartAggregationOptions]
    ]


    const addModeButtonHandler = (chartType: number) => {
        setAddMode(true);
        setAddingChartType(chartType)
    }

    const interventionHandler = (e: any, value: any) => {
        if (value.value === "None" || !value.value) {
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

    const outcomeComparisonHandler = (e: any, value: any) => {
        setOutcomeComparison(value.value)
    }

    // const interventionPlotHandler = (e: any, value: any) => {
    //     setInterventionPlotType(value.value)
    // }


    const confirmChartAddHandler = () => {
        if ((xSelection && ySelection && addingChartType > 0) || (xSelection && addingChartType === 0)) {
            if (!(addingChartType === 4 && (!interventionDate))) {
                console.log(addingChartType, typeDiction)
                actions.addNewChart(xSelection, ySelection, nextAddingIndex, typeDiction[addingChartType], outcomeComparison, interventionDate, interventionPlotType)
                setAddMode(false);
                setAddingChartType(-1)
                setInterventionDate(undefined);
                //setInterventionPlotType(undefined);
                setXSelection("")
                setYSelection("")
                setOutcomeComparison("")
            }
        }
    }

    const cancelChartAddHandler = () => {
        setAddMode(false);
        setXSelection("")
        setYSelection("")
    }

    const clearAllSharingRelatedStates = () => {
        setStateNameToShare("")
        setUIDToShare('')
        setErrorMessage('')
        setEditAccess(false)
        setOpenUIDInputModal(false)
    }

    const simulateAPIClick = () => {
        fetch(`${process.env.REACT_APP_QUERY_URL}accounts/login/`, {
            method: 'GET',
            credentials: 'include',
        })
        var csrftoken = getCookie('csrftoken');
        return csrftoken
    }

    const logoutHandler = () => {
        // fetch(`${process.env.REACT_APP_QUERY_URL}accounts/logout`, {
        //     method: 'GET'
        // })

        window.location.replace(`${process.env.REACT_APP_QUERY_URL}accounts/logout`);

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
                        <Dropdown.Item onClick={() => addModeButtonHandler(1)}>Dumbbell Chart</Dropdown.Item>
                        <Dropdown.Item onClick={() => addModeButtonHandler(2)}>Scatter Plot</Dropdown.Item>
                        <Dropdown.Item onClick={() => addModeButtonHandler(3)}>Heat Map</Dropdown.Item>
                        <Dropdown.Item onClick={() => addModeButtonHandler(4)}>Intervention Plot</Dropdown.Item>
                        <Dropdown.Item onClick={() => addModeButtonHandler(0)}>Cost and Saving Chart</Dropdown.Item>
                        <Dropdown.Item onClick={() => addModeButtonHandler(5)}>Compare Cost Chart</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </Menu.Item>

            <Menu.Item>
                <Dropdown button text="State Management">
                    <Dropdown.Menu>
                        {/* This is for  presets, which we don't have many good ones
                        <Dropdown.Item >
                            <Dropdown simple selectOnBlur={false} text="Presets" >
                                <Dropdown.Menu>
                                    {presetOptions.map((d: { value: number, text: string }) => {
                                        return (<Dropdown.Item key={d.text} onClick={() => { actions.loadPreset(d.value) }} content={d.text} />)
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Dropdown.Item> */}
                        <Dropdown.Item >
                            <Dropdown simple selectOnBlur={false} text="Load saved states"  >
                                <Dropdown.Menu>
                                    {listOfSavedState.map((d) => {
                                        return (<Dropdown.Item onClick={() => { loadSavedState(d) }} content={d} />)
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Dropdown.Item>

                        <Dropdown.Item >
                            <Dropdown simple selectOnBlur={false} text="Share states with user"  >
                                <Dropdown.Menu>
                                    {listOfSavedState.map((d) => {
                                        return (<Dropdown.Item content={d} onClick={() => { shareSpecificState(d) }} />)
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>

                        </Dropdown.Item>

                        <Dropdown.Item icon="share alternate"
                            content="Share through URL"
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

                        <Dropdown.Item icon="setting" content="Manage saved states"
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
                        <Message hidden={errorMessage.length === 0} onDismiss={() => { setErrorMessage("") }} error header='An error occured' content={errorMessage} />
                        <List divided verticalAlign="middle">
                            {listOfSavedState.map((d) => {
                                return (<List.Item key={d}>
                                    <List.Content floated="right">
                                        <Button onClick={() => {
                                            const csrftoken = simulateAPIClick()
                                            fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
                                                method: 'DELETE',
                                                credentials: "include",
                                                headers: {
                                                    'Accept': 'application/x-www-form-urlencoded',
                                                    'Content-Type': 'application/x-www-form-urlencoded',
                                                    'X-CSRFToken': csrftoken || '',
                                                    "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                                                    "Access-Control-Allow-Credentials": "true",
                                                },
                                                body: JSON.stringify({ name: d })
                                            }).then(response => {
                                                if (response.status === 200) {
                                                    fetchSavedStates()
                                                    setOpenManageStateModal(false)
                                                    setErrorMessage("")
                                                } else {
                                                    response.text().then(error => {
                                                        setErrorMessage(error);
                                                        console.error('There has been a problem with your fetch operation:', response.statusText);
                                                    })
                                                }
                                            }).catch(error => {
                                                setErrorMessage(error)
                                                console.error('There has been a problem with your fetch operation:', error);
                                            })

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
                            onClick={() => { setOpenManageStateModal(false); setErrorMessage("") }} />
                    </Modal.Actions>

                </Modal>

                {/* Modal for Saving State, has a form input */}
                <Modal open={openSaveStateModal} closeOnEscape={false} closeOnDimmerClick={false}>
                    <Modal.Header content="Save the current state" />
                    <Modal.Content>
                        <Message hidden={errorMessage.length === 0} onDismiss={() => { setErrorMessage("") }} error header='An error occured' content={errorMessage} />
                        <Form>
                            <Form.Input label="Name of State" onChange={(e, d) => { setStateName(d.value) }} />
                        </Form>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button disabled={stateName.length === 0} content="Save" positive onClick={() => {

                            const csrftoken = simulateAPIClick()

                            //does the following ACAO needs to change?
                            if (listOfSavedState.includes(stateName)) {
                                fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
                                    method: `PUT`,
                                    credentials: "include",
                                    headers: {
                                        'Accept': 'application/x-www-form-urlencoded',
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'X-CSRFToken': csrftoken || '',
                                        "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                                        "Access-Control-Allow-Credentials": "true",
                                    },
                                    body: JSON.stringify({ old_name: stateName, new_name: stateName, new_definition: provenance.exportState(false) })
                                }).then(response => {
                                    if (response.status === 200) {
                                        setOpenSaveStateModal(false)
                                        setStateName("")
                                        setErrorMessage("")
                                    } else {
                                        response.text().then(error => {
                                            setErrorMessage(error);
                                            console.error('There has been a problem with your fetch operation:', response.statusText);
                                        })
                                    }
                                }).catch(error => {
                                    setErrorMessage(error)
                                    console.error('There has been a problem with your fetch operation:', error);
                                })
                            } else {
                                fetch(`${process.env.REACT_APP_QUERY_URL}state`, {
                                    method: 'POST',
                                    credentials: "include",
                                    headers: {
                                        'Accept': 'application/x-www-form-urlencoded',
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'X-CSRFToken': csrftoken || '',
                                        "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                                        "Access-Control-Allow-Credentials": "true",
                                    },
                                    body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&definition=${provenance.exportState(false)}`
                                })
                                    .then(response => {
                                        if (response.status === 200) {
                                            setOpenSaveStateModal(false)
                                            fetchSavedStates()
                                            setStateName("")
                                            setErrorMessage("")
                                        } else {
                                            response.text().then(error => {
                                                setErrorMessage(error);
                                                console.error('There has been a problem with your fetch operation:', response.statusText);
                                            })
                                        }
                                    })
                            }
                            // setOpenSaveStateModal(false)
                            // setStateName("")
                        }} />
                        <Button content="Cancel" onClick={() => { setOpenSaveStateModal(false); setErrorMessage("") }} />
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

                {/* Modal for UID Input */}
                <Modal
                    open={openUIDInputModal}
                    closeOnEscape={false} closeOnDimmerClick={false}>
                    <Modal.Header>Input User's UID to directly share {`${stateNameToShare}`}</Modal.Header>
                    <Modal.Content>
                        <Message hidden={errorMessage.length === 0} onDismiss={() => { setErrorMessage("") }} error header='An error occured' content={errorMessage} />
                        <Form>
                            <Form.Input label="uID" onChange={(e, d) => { setUIDToShare(d.value) }} />
                            <Form.Checkbox label="Grant edit access" onChange={(e, d) => { setEditAccess(d.checked || false) }} />
                        </Form>
                        <Button positive content="Confirm" onClick={() => {
                            const csrftoken = simulateAPIClick()
                            fetch(`${process.env.REACT_APP_QUERY_URL}share_state`, {
                                method: `POST`,
                                credentials: "include",
                                headers: {
                                    'Accept': 'application/x-www-form-urlencoded',
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'X-CSRFToken': csrftoken || '',
                                    "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                                    "Access-Control-Allow-Credentials": "true",
                                },
                                body: `csrfmiddlewaretoken=${csrftoken}&name=${stateNameToShare}&user=${uidToShare}&role=${editAccess ? 'WR' : 'RE'}`
                            })
                                .then(response => {
                                    if (response.status === 200) {
                                        clearAllSharingRelatedStates()
                                    } else {
                                        response.text().then(error => {
                                            setErrorMessage(error);
                                            console.error('There has been a problem with your fetch operation:', response.statusText);
                                        })
                                    }
                                }).catch(error => {
                                    setErrorMessage(error)
                                    console.error('There has been a problem with your fetch operation:', error);
                                })

                        }} />
                        <Button content="Cancel" onClick={() => {
                            clearAllSharingRelatedStates()
                        }} />
                    </Modal.Content>
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
                <Button onClick={() => { logoutHandler(); }} >
                    Log Out
                 </Button>

            </Menu.Item>
        </Menu>
    );

    //This need to be rewritten
    const addBarChartMenuRewrite: any[] = [
        //For #0
        [<Menu.Item>
            <Dropdown
                placeholder={"Select Aggregation"}
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAxisChangeHandler}
                value={xSelection}
            />
        </Menu.Item>],
        //For #1
        [<Menu.Item>
            <Dropdown
                placeholder="Select Value to Show"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yAxisChangeHandler}
                value={ySelection}
            />
        </Menu.Item>,

        <Menu.Item>
            <Dropdown
                placeholder="Facet by"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAxisChangeHandler}
                value={xSelection}
            />
        </Menu.Item>],
        //for #2
        [<Menu.Item>
            <Dropdown
                placeholder="Select Y-axis Attribute"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yAxisChangeHandler}
                value={ySelection}
            />
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAxisChangeHandler}
                value={xSelection}
            />
        </Menu.Item>],
        //for #3
        [< Menu.Item >
            <Dropdown
                placeholder="Select Value to Show"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yAxisChangeHandler}
                value={ySelection}
            />
        </Menu.Item >,
        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAxisChangeHandler}
                value={xSelection}
            />
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Outcome/Intervention Comparison (Optional)"
                selection
                clearable
                options={OutcomeType}
                onChange={outcomeComparisonHandler}
                value={outcomeComparison}
            />
        </Menu.Item>],
        //For #4
        [<Menu.Item>
            <Dropdown
                placeholder="Select Value to Show"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yAxisChangeHandler}
                value={ySelection}
            />
        </Menu.Item>,

        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                selection
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAxisChangeHandler}
                value={xSelection}
            />
        </Menu.Item>,
        <Menu.Item>
            <SemanticDatePicker
                placeholder={"Intervention"}
                minDate={rawDateRange[0] as any}
                maxDate={rawDateRange[1] as any}
                onChange={interventionHandler} />
        </Menu.Item>
        ],
        //for #5
        [<Menu.Item>
            <Dropdown placeholder="Select Value to Compare"
                selection
                options={addOptions[5][0]}
                onChange={yAxisChangeHandler}
            />
        </Menu.Item>,
        <Menu.Item>
            <Dropdown placeholder="Select Aggregation"
                selection
                options={addOptions[5][1]}
                onChange={xAxisChangeHandler}
            />
        </Menu.Item>]
    ]


    const addBarChartMenu = (
        <Menu widths={5}>
            {addBarChartMenuRewrite[addingChartType]}
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
