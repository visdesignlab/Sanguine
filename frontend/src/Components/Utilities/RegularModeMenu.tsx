import { isObservable } from "mobx";
import { observer } from "mobx-react";
import { useContext, useState } from "react";
import { FC } from "react";
import { Menu, Image, Dropdown, Button } from "semantic-ui-react";
import Store from "../../Interfaces/Store";
import { blood_red } from "../../Presets/Constants";
import AddModeTopMenu from "./AddModeTopMenu";
import UndoRedoButtons from "./UndoRedoButtons";

const RegularModeMenu: FC = () => {
    const store = useContext(Store)
    const [addingChartType, setAddingChartType] = useState(-1)

    const addModeButtonHandler = (chartType: number) => {
        setAddingChartType(chartType)
        store.configStore.topMenuBarAddMode = true;

    }

    const regularMenu = (<Menu widths={6}>
        <Menu.Item>
            {/* VDL LOGO */}
            <Image
                style={{ height: "40px" }}
                size="small"
                as='a'
                target="_blank"
                src="https://raw.githubusercontent.com/visdesignlab/visdesignlab.github.io/master/assets/images/logos/vdl.png"
                href="https://vdl.sci.utah.edu"
            />
        </Menu.Item>

        {/*Add Button */}
        <Menu.Item>
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
                {/* <Dropdown.Menu>
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
                </Dropdown.Menu> */}
            </Dropdown>
        </Menu.Item>
        {/* Preview Mode */}
        <Menu.Item>
            <Button
                content="Preview Mode"
            // onClick={() => { store!.previewMode = true }} 
            />
        </Menu.Item>
        <Menu.Item>
            <UndoRedoButtons />
        </Menu.Item>
    </Menu>)

    const configureOutput = () => {
        console.log(isObservable(store.configStore.topMenuBarAddMode))
        if (store.configStore.topMenuBarAddMode) {
            console.log(true)
            return <AddModeTopMenu addingChartType={addingChartType} />
        } else {
            console.log(false)
            return regularMenu
        }
    }

    return (configureOutput())
}

export default observer(RegularModeMenu)