import { Button, Grid } from "@material-ui/core"
import { observer } from "mobx-react"
import { FC, useEffect, useState } from "react"
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker"
import { useStyles } from "../../../Presets/StyledComponents"
import SaveStateModal from "../../Modals/SaveStateModal"

const StateManagementSuite: FC = () => {
    const styles = useStyles();
    const [listOfSavedState, setListOfSavedState] = useState<string[]>([])

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

    return (<Grid item xs>
        <div className={styles.centerAlignment}>
            <Button variant="outlined" >State Management</Button>
        </div>
        <SaveStateModal />
        {/* <Dropdown button text="State Management"> */}
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
        {/* </Dropdown> */}
    </Grid>)
}

export default observer(StateManagementSuite)