import { Provenance, initProvenance } from '@visdesignlab/provenance-lib-core'
import {
    ApplicationState,
    defaultState,
    LayoutElement,
    SelectSet,
    SingleCasePoint
} from "./ApplicationState";
import { store } from './Store';
import { toJS } from 'mobx';

interface AppProvenance {
    provenance: Provenance<ApplicationState>;
    actions: {
        goForward: () => void;
        goBack: () => void;
        loadPreset: (num: number) => void;
        // setLayoutArray: (newLayoutArray: LayoutElement[]) => void;
        // selectChart: (newSelectedID: string) => void;
        toggleShowZero: (event: any, data: any) => void;
        // togglePerCase: (event: any, data: any) => void;
        // toggleDumbbell: (event: any, data: any) => void;
        proceduresSelectionChange: (data: any) => void;
        currentOutputFilterSetChange: () => void;
        clearOutputFilterSet: (target?: string) => void;
        clearSelectSet: (target?: string) => void;

        changeNotation: (chartID: string, notation: string) => void;

        // yearRangeChange: (data: any) => void;
        dateRangeChange: (data: any) => void;

        addNewChart: (x: string, y: string, i: number, type: string, outcomeComparison?: string, interventionDate?: number, interventionChartType?: string) => void;
        removeChart: (i: any) => void;
        updateCaseCount: (mode: string, newCaseCount: number) => void;
        onLayoutchange: (data: any) => void;
        // selectPatient: (data: SingleCasePoint | null) => void;
        selectSet: (data: SelectSet, shiftKeyPressed: boolean) => void;

        changeExtraPair: (chartID: string, newExtraPair: string) => void;
        removeExtraPair: (chartID: string, removeingPair: string) => void;

        updateSelectedPatientGroup: (caseList: SingleCasePoint[]) => void;
        updateBrushPatientGroup: (caseList: SingleCasePoint[], mode: "ADD" | "REPLACE") => void;
        changeChart: (x: string, y: string, i: string, type: string, comparisonChartType?: string) => void;
    }
}
export function setupProvenance(): AppProvenance {
    const provenance = initProvenance(defaultState, true);
    provenance.addGlobalObserver(() => {
        let isAtRoot = false;
        const currentNode = provenance.current();
        //if (isStateNode(currentNode)) {
        isAtRoot = currentNode.id === provenance.root().id;
        //}
        store.isAtRoot = isAtRoot;
        store.isAtLatest = provenance.current().children.length === 0;
    })

    provenance.addObserver(["currentSelectPatientGroup"], (state?: ApplicationState) => {
        store.currentSelectPatientGroup = state ? state.currentSelectPatientGroup : store.currentSelectPatientGroup;
    })

    provenance.addObserver(["currentBrushedPatientGroup"], async (state?: ApplicationState) => {
        store.currentBrushedPatientGroup = state ? state.currentBrushedPatientGroup : store.currentBrushedPatientGroup
    })

    provenance.addObserver(["nextAddingIndex"], (state?: ApplicationState) => {
        store.nextAddingIndex = state ? state.nextAddingIndex : store.nextAddingIndex;
    })

    provenance.addObserver(['showZero'], (state?: ApplicationState) => {
        store.showZero = state ? state.showZero : store.showZero;
    })

    provenance.addObserver(["rawDateRange"], (state?: ApplicationState) => {
        store.rawDateRange = state
            ? state.rawDateRange
            : store.rawDateRange;
    })

    provenance.addObserver(["totalAggregatedCaseCount"], (state?: ApplicationState) => {
        store.totalAggregatedCaseCount = state
            ? state.totalAggregatedCaseCount
            : store.totalAggregatedCaseCount;
    })
    provenance.addObserver(["totalIndividualCaseCount"], (state?: ApplicationState) => {
        store.totalIndividualCaseCount = state
            ? state.totalIndividualCaseCount
            : store.totalIndividualCaseCount;
    })

    provenance.addObserver(["proceduresSelection"], (state?: ApplicationState) => {
        console.log(toJS(store.proceduresSelection))
        store.proceduresSelection = state ? state.proceduresSelection : store.proceduresSelection
        console.log(toJS(store.proceduresSelection))
    })

    // provenance.addObserver(["rawproceduresSelection"], (state?: ApplicationState) => {
    //   store.rawproceduresSelection = state ? state.rawproceduresSelection : store.rawproceduresSelection
    // })

    //   provenance.addObserver(
    //     ["currentSelectPatient"],
    //     (state?: ApplicationState) => {
    //       store.currentSelectPatient = state
    //         ? state.currentSelectPatient
    //         : store.currentSelectPatient;
    //     }
    //   );

    provenance.addObserver(["currentSelectSet"], (state?: ApplicationState) => {
        store.currentSelectSet = state
            ? state.currentSelectSet
            : store.currentSelectSet;
    });

    provenance.addObserver(["currentOutputFilterSet"], (state?: ApplicationState) => {
        store.currentOutputFilterSet = state
            ? state.currentOutputFilterSet
            : store.currentOutputFilterSet;
    })

    provenance.addObserver(["layoutArray"], (state?: ApplicationState) => {
        console.log(toJS(store.layoutArray))
        store.layoutArray = state ? state.layoutArray : store.layoutArray;
        console.log(toJS(store.layoutArray))
    });

    provenance.done();

    // const setLayoutArray = (layoutArray: LayoutElement[], skipProvenance: boolean = false) => {
    //   if (skipProvenance) {
    //     return
    //   }
    //   provenance.applyAction(
    //     "Setting Layout Array",
    //     (state: ApplicationState) => {
    //       state.layoutArray = layoutArray;
    //       return state;
    //     }
    //   )
    // }

    const addNewChart = (xAxisAttribute: string, yAxisAttribute: string, index: number, plotType: string, outcomeComparison?: string, interventionDate?: number, interventionChartType?: string) => {

        const newLayoutElement: LayoutElement = {
            aggregatedBy: xAxisAttribute,
            valueToVisualize: yAxisAttribute,
            i: index.toString(),
            w: 1,
            h: 1,
            x: 0,
            y: Infinity,
            plotType: plotType,
            notation: ""
        }
        if (plotType === "VIOLIN" || plotType === "HEATMAP" || plotType === "INTERVENTION") {
            newLayoutElement.extraPair = JSON.stringify([]);
        }

        if (outcomeComparison) {
            newLayoutElement.plotType = "COMPARISON";
            newLayoutElement.comparisonChartType = "HEATMAP";
            newLayoutElement.outcomeComparison = outcomeComparison;
        }

        // if (interventionDate) {
        //   newLayoutElement.interventionDate = interventionDate;
        // }

        if (plotType === "INTERVENTION" && interventionDate) {
            newLayoutElement.interventionDate = interventionDate;
            newLayoutElement.comparisonChartType = interventionChartType ? interventionChartType : "HEATMAP";
        }

        provenance.applyAction("Add new chart",
            (state: ApplicationState) => {
                state.layoutArray.push(newLayoutElement)
                state.nextAddingIndex += 1
                return state;
            })
    }

    const onLayoutchange = (data: any) => {
        provenance.applyAction(
            `change layout to chart ${data.i}`,
            //We use index here because the layout array should always have the same order as the layoutlement array
            (state: ApplicationState) => {
                data.map((gridLayout: any) => {
                    let match = state.layoutArray.filter(d => d.i === gridLayout.i)[0]
                    match.w = gridLayout.w;
                    match.h = gridLayout.h;
                    match.x = gridLayout.x;
                    match.y = gridLayout.y;
                })
                // state.layoutArray = state.layoutArray.map((d, i) => {
                //   d.w = data[i].w;
                //   d.h = data[i].h;
                //   d.x = data[i].x;
                //   d.y = data[i].y;
                //   return d
                // })
                state.layoutArray = JSON.parse(JSON.stringify(state.layoutArray))
                return state;
            }
        )
    }

    const loadPreset = (num: number) => {
        switch (num) {
            case 1:
                provenance.applyAction(
                    `apply preset 1`,
                    (state: ApplicationState) => {
                        state.layoutArray = [
                            {
                                aggregatedBy: "YEAR",
                                valueToVisualize: "PRBC_UNITS",
                                i: "0",
                                w: 1,
                                h: 1,
                                x: 0,
                                y: Infinity,
                                plotType: "VIOLIN",
                                notation: "",
                                extraPair: JSON.stringify([])
                            },
                            {
                                aggregatedBy: "SURGEON_ID",
                                valueToVisualize: "PRBC_UNITS",
                                i: "1",
                                w: 1,
                                h: 1,
                                x: 0,
                                y: Infinity,
                                notation: "",
                                plotType: "VIOLIN",
                                extraPair: JSON.stringify([])
                            }, {
                                aggregatedBy: "PRBC_UNITS",
                                valueToVisualize: "HGB_VALUE",
                                i: "2",
                                w: 1,
                                h: 1,
                                x: 0,
                                notation: "",
                                y: Infinity,
                                plotType: "DUMBBELL"
                            }]
                        state.proceduresSelection = ["CABG", "TAVR"]
                        state.nextAddingIndex = 3;
                        return state
                    }
                )
        }
    };

    const removeChart = (i: string) => {
        // console.log(event, child)
        const remove_index = i
        provenance.applyAction(
            `remove chart ${remove_index}`,
            (state: ApplicationState) => {
                state.layoutArray = state.layoutArray.filter(
                    d => d.i !== remove_index
                );
                console.log(state)
                return state;
            }
        );
    }

    const changeChart = (x: string, y: string, i: string, type: string, comparisonChartType?: string) => {
        provenance.applyAction(
            `change chart ${i}`,
            (state: ApplicationState) => {
                state.layoutArray = state.layoutArray.map(d => {
                    if (d.i === i) {
                        d.aggregatedBy = x;
                        d.valueToVisualize = y;
                        d.plotType = type;
                        if (comparisonChartType) {
                            d.comparisonChartType = comparisonChartType;
                        }
                    }
                    return d
                })
                console.log(state)
                return state
            }
        )
    }

    const changeNotation = (chartID: string, notation: string) => {
        provenance.applyAction(`Change notation ${chartID}`,
            (state: ApplicationState) => {
                state.layoutArray = state.layoutArray.map(d => {
                    if (d.i === chartID) {
                        d.notation = notation;
                    }
                    return d;
                })
                return state
            })
    }

    // const selectChart = (chartID: string) => {
    //   provenance.applyAction(
    //     `Selecting ${chartID}`,
    //     (state: ApplicationState) => {
    //       if (state.currentSelectedChart === chartID) {
    //         state.currentSelectedChart = "-1";
    //       } else {
    //         state.currentSelectedChart = chartID;
    //       }
    //       return state;
    //     }
    //   )
    // }



    const toggleShowZero = (event: any, showZero: any) => {
        provenance.applyAction(
            `Per Case ${showZero}`,
            (state: ApplicationState) => {
                state.showZero = showZero.checked;
                console.log(state)
                return state;
            }
        )
    };

    const updateSelectedPatientGroup = (caseList: SingleCasePoint[]) => {
        provenance.applyAction(
            `Update Selected Patients Group`,
            (state: ApplicationState) => {
                state.currentSelectPatientGroup = caseList;

                return state;
            }
        )
    };

    /**
     * 
     * things.thing = things.thing.filter((thing, index, self) =>
  index === self.findIndex((t) => (
    t.place === thing.place && t.name === thing.name
  ))
)
     */

    const updateBrushPatientGroup = (caseList: SingleCasePoint[], mode: "ADD" | "REPLACE") => {
        provenance.applyAction(
            `Update Selected Patients Group`,
            (state: ApplicationState) => {
                if (mode === "ADD") {
                    let oldList = state.currentBrushedPatientGroup.map(d => d.CASE_ID)
                    for (let newCase of caseList) {
                        if (!oldList.includes(newCase.CASE_ID)) {
                            state.currentBrushedPatientGroup.push(newCase)
                        }
                    }
                }
                else {
                    state.currentBrushedPatientGroup = caseList;
                }
                return state;
            }
        )
    };



    const changeExtraPair = (chartID: string, newExtraPair: string) => {
        provenance.applyAction(
            `Change extra pair of ${chartID}`,
            (state: ApplicationState) => {
                state.layoutArray = state.layoutArray.map((d: LayoutElement) => {
                    if (d.i === chartID && d.extraPair) {
                        if (!d.extraPair.includes(newExtraPair)) {
                            let originalArray = JSON.parse(d.extraPair);
                            originalArray.push(newExtraPair);
                            d.extraPair = JSON.stringify(originalArray)
                            console.log(d)
                        }
                    }
                    return d
                })
                return state;
            }
        )
    }

    const removeExtraPair = (chartID: string, removeingPair: string) => {
        provenance.applyAction(
            `removing extra pair of ${chartID}`,
            (state: ApplicationState) => {
                //  console.log(removeingPair, chartID, state)
                state.layoutArray = state.layoutArray.map((d: LayoutElement) => {
                    if (d.i === chartID && d.extraPair) {
                        let originalArray = JSON.parse(d.extraPair);

                        let newArray = (originalArray.filter((l: string) => {
                            return (l !== removeingPair)
                        }))
                        d.extraPair = JSON.stringify(newArray)
                    }
                    return d
                })
                //   console.log(state)
                return state;
            }
        )
    }

    const proceduresSelectionChange = (selectedFilterOption: string) => {
        provenance.applyAction(
            `Change Filter Selection to ${selectedFilterOption}`,
            (state: ApplicationState) => {
                if (state.proceduresSelection.includes(selectedFilterOption)) {
                    state.proceduresSelection = state.proceduresSelection.filter(d => d !== selectedFilterOption)
                }
                else {
                    state.proceduresSelection.push(selectedFilterOption)
                }

                // state.proceduresSelection = selectedFilterOption;
                // console.log(state.proceduresSelection)
                return state;
            }
        )
    }

    // const proceduresSelectionChange = (selectedFilterOption: string) => {
    //   provenance.applyAction(
    //     `Change Filter Selection to ${selectedFilterOption}`,
    //     (state: ApplicationState) => {
    //       let currentFilter = JSON.parse(state.rawproceduresSelection)
    //       if (currentFilter.includes(selectedFilterOption)) {
    //         currentFilter = currentFilter.filter((d: string) => d !== selectedFilterOption)
    //       }
    //       else {
    //         currentFilter.push(selectedFilterOption)
    //       }
    //       state.rawproceduresSelection = (JSON.stringify(currentFilter))

    //       // state.proceduresSelection = selectedFilterOption;
    //       // console.log(state.proceduresSelection)
    //       return state;
    //     }
    //   )
    // }

    const dateRangeChange = (newDateRange: any) => {
        provenance.applyAction(
            `Change date range to ${newDateRange}`,
            (state: ApplicationState) => {
                if (newDateRange !== state.rawDateRange) {
                    console.log(newDateRange)
                    state.rawDateRange = newDateRange
                }
                return state;
            }
        )
    }



    //   const selectPatient = (data: SingleCasePoint | null) => {
    //     provenance.applyAction(`select patient `, (state: ApplicationState) => {

    //       if (data && state.currentSelectPatient && data.patientID === state.currentSelectPatient.patientID) {
    //         state.currentSelectPatient = null;
    //         state.currentSelectSet = [];
    //       }
    //       else if (!data) {
    //         state.currentSelectPatient = null;
    //       }

    //       else {
    //         state.currentSelectPatient = data;
    //         state.currentSelectSet = [];
    //       }
    //       return state;
    //     })
    //   };

    const selectSet = (data: SelectSet, shiftKeyPressed: boolean) => {
        console.log(data)
        provenance.applyAction(
            `select set ${data.setName} at ${data.setValues}`,
            (state: ApplicationState) => {
                if (!shiftKeyPressed) {
                    if (state.currentSelectSet.length === 1
                        && state.currentSelectSet[0].setName === data.setName
                        && state.currentSelectSet[0].setValues === data.setValues) {
                        state.currentSelectSet = [];
                    }
                    else {
                        state.currentSelectSet = [data]
                    }
                }
                else {
                    const addingType = data.setName;
                    const alreadyIn = state.currentSelectSet.filter(d => d.setName === addingType).length > 0
                    if (!alreadyIn) {
                        state.currentSelectSet.push(data)
                    } else {
                        state.currentSelectSet = state.currentSelectSet.map((d) => {
                            if (d.setName === addingType) {
                                const indexOfElement = d.setValues.indexOf(data.setValues[0])
                                if (indexOfElement > 0) {
                                    d.setValues = d.setValues.splice(indexOfElement, 1);
                                    //     d.setPatientIds = d.setPatientIds.splice(indexOfElement, 1);
                                } else {
                                    d.setValues = d.setValues.concat(data.setValues)
                                    //  d.setPatientIds = d.setPatientIds.concat(data.setPatientIds)
                                }
                            }
                            return d
                        })
                    }
                }

                return state
            })
    }

    const clearSelectSet = (target?: string) => {
        provenance.applyAction(
            `delete select set`,
            (state: ApplicationState) => {
                state.currentSelectSet = state.currentSelectSet.filter(d => d.setName !== target)
                return state;
            }
        )
    }

    const currentOutputFilterSetChange = () => {
        provenance.applyAction(
            `change output filter`,
            (state: ApplicationState) => {

                //  state.currentSelectPatientGroup = state.currentSelectPatientGroup.concat(state.currentBrushedPatientGroup);
                state.currentSelectPatientGroup = state.currentBrushedPatientGroup;
                state.currentBrushedPatientGroup = [];

                for (let eachSelectSet of state.currentSelectSet) {
                    const alreadyIn = state.currentOutputFilterSet.filter(d => d.setName === eachSelectSet.setName).length > 0
                    if (alreadyIn) {
                        state.currentOutputFilterSet = state.currentOutputFilterSet.map(d => {
                            if (d.setName === eachSelectSet.setName) {
                                let setOfValues = new Set(d.setValues)
                                for (let singleValue of eachSelectSet.setValues) {
                                    setOfValues.add(singleValue);
                                }
                                d.setValues = Array.from(setOfValues);
                            }
                            return d
                        })
                    }
                    else {
                        state.currentOutputFilterSet.push(eachSelectSet)
                    }

                }
                //   state.currentSelectPatientGroup = state.currentBrushedPatientGroup;
                //state.currentOutputFilterSet = state.currentSelectSet;
                state.currentSelectSet = [];
                // state.currentSelectPatient = null;

                return state;
            }
        )
    }

    const clearOutputFilterSet = (target?: string) => {
        provenance.applyAction(
            `clear output filter`,
            (state: ApplicationState) => {
                if (!target) {
                    state.currentOutputFilterSet = [];
                } else {
                    state.currentOutputFilterSet = state.currentOutputFilterSet.filter(d => d.setName !== target)
                }
                return state;
            }
        )
    }

    const updateCaseCount = (mode: string, newCaseCount: number) => {
        provenance.applyAction(
            `change output filter`,
            (state: ApplicationState) => {
                if (mode === "INDIVIDUAL") {
                    state.totalIndividualCaseCount = newCaseCount;
                }
                else if (mode === "AGGREGATED") {
                    state.totalAggregatedCaseCount = newCaseCount;
                }
                return state;
            }
        )
    }

    const goForward = () => {
        provenance.goForwardOneStep();
    };

    const goBack = () => {
        provenance.goBackOneStep();
    };

    return {
        provenance,
        actions: {
            goBack,
            goForward,
            // setLayoutArray,
            //selectChart,
            changeChart,
            toggleShowZero,
            // toggleDumbbell,
            proceduresSelectionChange,

            //  yearRangeChange,
            dateRangeChange,
            changeNotation,

            addNewChart,
            removeChart,
            updateCaseCount,
            onLayoutchange,
            // selectPatient,
            selectSet,
            updateSelectedPatientGroup,
            updateBrushPatientGroup,
            changeExtraPair,
            removeExtraPair,
            loadPreset,
            currentOutputFilterSetChange,
            clearSelectSet,
            clearOutputFilterSet
        }
    };


}