import { Provenance, initProvenance } from '@visdesignlab/provenance-lib-core'
import {
  ApplicationState,
  defaultState,
  LayoutElement,
  SelectSet,
  SingleCasePoint
} from "./ApplicationState";
import { store } from './Store';

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
    filterSelectionChange: (data: any) => void;
    currentOutputFilterSetChange: () => void;
    clearOutputFilterSet: (target?: string) => void;
    clearSelectSet: (target?: string) => void;

    changeNotation: (chartID: string, notation: string) => void;

    // yearRangeChange: (data: any) => void;
    dateRangeChange: (data: any) => void;

    addNewChart: (x: string, y: string, i: number, type: string, interventionDate?: number, interventionChartType?: string) => void;
    removeChart: (i: any) => void;
    updateCaseCount: (mode: string, newCaseCount: number) => void;
    onLayoutchange: (data: any) => void;
    selectPatient: (data: SingleCasePoint | null) => void;
    selectSet: (data: SelectSet, shiftKeyPressed: boolean) => void;
    // storeHemoData: (data: any) => void;
    changeExtraPair: (chartID: string, newExtraPair: string) => void;
    removeExtraPair: (chartID: string, removeingPair: string) => void;

    updateSelectedPatientGroup: (caseList: number[]) => void;
    changeChart: (x: string, y: string, i: string, type: string, interventionType?: string) => void;
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

  // provenance.addObserver(
  //   ["currentSelectedChart"],
  //   (state?: ApplicationState) => {
  //     store.currentSelectedChart = state
  //       ? state.currentSelectedChart
  //       : store.currentSelectedChart;
  //   }
  // );

  provenance.addObserver(["currentSelectPatientGroup"], (state?: ApplicationState) => {
    store.currentSelectPatientGroup = state ? state.currentSelectPatientGroup : store.currentSelectPatientGroup;
  })

  provenance.addObserver(["layoutArray"], (state?: ApplicationState) => {
    store.layoutArray = state ? state.layoutArray : store.layoutArray;
  });

  // provenance.addObserver(["hemoglobinDataSet"], async (state?: ApplicationState) => {
  //   store.hemoglobinDataSet = state ? state.hemoglobinDataSet : store.hemoglobinDataSet
  // })

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

  provenance.addObserver(["filterSelection"], (state?: ApplicationState) => {
    store.filterSelection = state ? state.filterSelection : store.filterSelection
  })

  provenance.addObserver(
    ["currentSelectPatient"],
    (state?: ApplicationState) => {
      store.currentSelectPatient = state
        ? state.currentSelectPatient
        : store.currentSelectPatient;
    }
  );
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

  const addNewChart = (xAxisAttribute: string, yAxisAttribute: string, index: number, plot_type: string, interventionDate?: number, interventionChartType?: string) => {

    const newLayoutElement: LayoutElement = {
      aggregatedBy: xAxisAttribute,
      valueToVisualize: yAxisAttribute,
      i: index.toString(),
      w: 1,
      h: 1,
      x: 0,
      y: Infinity,
      plot_type: plot_type,
      notation: ""
    }
    if (plot_type === "VIOLIN" || plot_type === "HEATMAP" || plot_type === "INTERVENTION") {
      newLayoutElement.extraPair = JSON.stringify([]);
    }
    if (interventionDate) {
      newLayoutElement.interventionDate = interventionDate
    }
    if (plot_type === "INTERVENTION" && interventionDate) {
      newLayoutElement.interventionDate = interventionDate;
      newLayoutElement.interventionType = interventionChartType ? interventionChartType : "HEATMAP";
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
                plot_type: "VIOLIN",
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
                plot_type: "VIOLIN",
                extraPair: JSON.stringify([])
              }, {
                aggregatedBy: "PRBC_UNITS",
                valueToVisualize: "HEMO_VALUE",
                i: "2",
                w: 1,
                h: 1,
                x: 0,
                notation: "",
                y: Infinity,
                plot_type: "DUMBBELL"
              }]
            state.filterSelection = ["CABG", "TAVR"]
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

  const changeChart = (x: string, y: string, i: string, type: string, interventionType?: string) => {
    provenance.applyAction(
      `change chart ${i}`,
      (state: ApplicationState) => {
        state.layoutArray = state.layoutArray.map(d => {
          if (d.i === i) {
            d.aggregatedBy = x;
            d.valueToVisualize = y;
            d.plot_type = type;
            if (interventionType) {
              d.interventionType = interventionType;
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

  const updateSelectedPatientGroup = (caseList: number[]) => {
    provenance.applyAction(
      `Update Selected Patients Group`,
      (state: ApplicationState) => {
        state.currentSelectPatientGroup = caseList;

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

  const filterSelectionChange = (selectedFilterOption: string[]) => {
    provenance.applyAction(
      `Change Filter Selection to ${selectedFilterOption}`,
      (state: ApplicationState) => {
        // if (state.filterSelection.includes(selectedFilterOption)) {
        //   state.filterSelection = state.filterSelection.filter(d => d !== selectedFilterOption)
        // }
        // else {
        //   state.filterSelection.push(selectedFilterOption)
        // }

        state.filterSelection = selectedFilterOption;
        // console.log(state.filterSelection)
        return state;
      }
    )
  }



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



  const selectPatient = (data: SingleCasePoint | null) => {
    provenance.applyAction(`select patient `, (state: ApplicationState) => {

      if (data && state.currentSelectPatient && data.patientID === state.currentSelectPatient.patientID) {
        state.currentSelectPatient = null;
        state.currentSelectSet = [];
      }
      else if (!data) {
        state.currentSelectPatient = null;
      }

      else {
        state.currentSelectPatient = data;
        state.currentSelectSet = [];
      }
      return state;
    })
  };

  const selectSet = (data: SelectSet, shiftKeyPressed: boolean) => {
    provenance.applyAction(
      `select set ${data.set_name} at ${data.set_value}`,
      (state: ApplicationState) => {
        if (!shiftKeyPressed) {
          if (state.currentSelectSet.length === 1
            && state.currentSelectSet[0].set_name === data.set_name
            && state.currentSelectSet[0].set_value === data.set_value) {
            state.currentSelectSet = []
          } else {
            state.currentSelectSet = [data]
          }
        }
        else {
          // const temporarySetArray = state.currentSelectSet.filter(d => (!(data.set_value.includes(d.set_value[0]) && d.set_name === data.set_name)))
          // state.currentSelectSet = temporarySetArray.length === state.currentSelectSet.length ? state.currentSelectSet.concat([data]) : temporarySetArray;
          const addingType = data.set_name;
          const alreadyIn = state.currentSelectSet.filter(d => d.set_name === addingType).length > 0
          if (!alreadyIn) {
            state.currentSelectSet.push(data)
          } else {
            state.currentSelectSet = state.currentSelectSet.map((d) => {
              if (d.set_name === addingType) {
                d.set_value = d.set_value.includes(data.set_value[0]) ? d.set_value.filter(num => num !== d.set_value[0]) : d.set_value.concat(data.set_value)
              }
              return d
            })
          }
        }
        console.log(state.currentSelectSet)
        return state
      })
  }

  const clearSelectSet = (target?: string) => {
    provenance.applyAction(
      `delete select set`,
      (state: ApplicationState) => {
        state.currentSelectSet = state.currentSelectSet.filter(d => d.set_name !== target)
        return state;
      }
    )
  }

  const currentOutputFilterSetChange = () => {
    provenance.applyAction(
      `change output filter`,
      (state: ApplicationState) => {
        state.currentOutputFilterSet = state.currentSelectSet;
        state.currentSelectSet = [];
        state.currentSelectPatient = null;
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
          state.currentOutputFilterSet = state.currentOutputFilterSet.filter(d => d.set_name !== target)
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


  // const storeHemoData = (data: any) => {
  //   provenance.applyAction(`cache hemo data`,
  //     (state: ApplicationState) => {
  //       state.hemoglobinDataSet = data;
  //       return state;
  //     })
  // }

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
      filterSelectionChange,

      //  yearRangeChange,
      dateRangeChange,
      changeNotation,

      addNewChart,
      removeChart,
      updateCaseCount,
      onLayoutchange,
      selectPatient,
      selectSet,
      updateSelectedPatientGroup,

      changeExtraPair,
      removeExtraPair,
      loadPreset,
      currentOutputFilterSetChange,
      clearSelectSet,
      clearOutputFilterSet
    }
  };


}