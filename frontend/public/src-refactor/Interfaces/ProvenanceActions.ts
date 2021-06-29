import { createAction } from "@visdesignlab/trrack";
import { ActionEvents } from "./Types/EventTypes";
import { LayoutElement } from "./Types/LayoutTypes";
import { ApplicationState } from "./Types/StateTypes";

//when calling this function, it should determine the plot type, instead of having it in here.
const addNewChart = createAction<ApplicationState, [LayoutElement], ActionEvents>((state: ApplicationState, input) => {
    state.layoutArray.push(input)
    state.nextAddingIndex += 1
}).setLabel("AddChart")

const onLayoutChange = createAction<ApplicationState, [any], ActionEvents>((state, data) => {
    data.forEach((gridLayout: any) => {
        let match = state.layoutArray.filter(d => d.i === gridLayout.i)[0]
        match.w = gridLayout.w;
        match.h = gridLayout.h;
        match.x = gridLayout.x;
        match.y = gridLayout.y;
    })
    state.layoutArray = JSON.parse(JSON.stringify(state.layoutArray))
}).setLabel("LayoutChange")

//Load in a preset of layout elements
const loadPreset = createAction<ApplicationState, [LayoutElement[]], ActionEvents>((state, input) => {
    state.layoutArray = input
}).setLabel("LoadPreset")

const removeChart = createAction<ApplicationState, [string], ActionEvents>((state, indexToRemove) => {
    //fill in
})