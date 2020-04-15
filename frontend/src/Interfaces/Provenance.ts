import { Provenance, initProvenance, isStateNode, } from '@visdesignlab/provenance-lib-core'
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
    setLayoutArray: (newLayoutArray: LayoutElement[]) => void;
    selectChart: (newSelectedID: string) => void;
    toggleShowZero: (event: any, data: any) => void;
    // togglePerCase: (event: any, data: any) => void;
    // toggleDumbbell: (event: any, data: any) => void;
    filterSelectionChange: (data: any) => void;
    yearRangeChange: (data: any) => void;
    addNewChart: (x: string, y: string, i: number, type: string, aggregation?: string) => void;
    removeChart: (i: any) => void;
    updateCaseCount: (newCaseCount: number) => void;
    onLayoutchange: (data: any) => void;
    selectPatient: (data: SingleCasePoint) => void;
    selectSet: (data: SelectSet) => void;
    storeHemoData: (data: any) => void;
    changeExtraPair: (chartID: string, newExtraPair: string) => void;
    changeChart: (x: string, y: string, i: string, type: string) => void;
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

  provenance.addObserver(
    ["currentSelectedChart"],
    (state?: ApplicationState) => {
      store.currentSelectedChart = state
        ? state.currentSelectedChart
        : store.currentSelectedChart;
    }
  );

  provenance.addObserver(["layoutArray"], (state?: ApplicationState) => {
    store.layoutArray = state ? state.layoutArray : store.layoutArray;
  });

  provenance.addObserver(["hemoglobinDataSet"], async (state?: ApplicationState) => {
    store.hemoglobinDataSet = state ? state.hemoglobinDataSet : store.hemoglobinDataSet
  })

  // provenance.addObserver(["dumbbellSorted"], (state?: ApplicationState) => {
  //   store.dumbbellSorted = state ? state.dumbbellSorted : store.dumbbellSorted;
  // })

  provenance.addObserver(['showZero'], (state?: ApplicationState) => {
    store.showZero = state ? state.showZero : store.showZero;
  })

  // provenance.addObserver(["perCaseSelected"], (state?: ApplicationState) => {
  //   store.perCaseSelected = state
  //     ? state.perCaseSelected
  //     : store.perCaseSelected;
  // });

  provenance.addObserver(["yearRange"], (state?: ApplicationState) => {
    store.yearRange = state
      ? state.yearRange
      : store.yearRange;
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

  provenance.done();

  const setLayoutArray = (layoutArray: LayoutElement[], skipProvenance: boolean = false) => {
    if (skipProvenance) {
      return
    }
    provenance.applyAction(
      "Setting Layout Array",
      (state: ApplicationState) => {
        state.layoutArray = layoutArray;
        return state;
      }
    )
  }

  const addNewChart = (xAxisAttribute: string, yAxisAttribute: string, index: number, plot_type: string, aggregation?: string) => {
    // console.log('add')
    const newLayoutElement: LayoutElement = {
      aggregatedBy: xAxisAttribute,
      valueToVisualize: yAxisAttribute,
      i: index.toString(),
      w: 1,
      h: 1,
      x: 0,
      y: Infinity,
      plot_type: plot_type,
    }
    if (plot_type === "BAR") {
      newLayoutElement.extraPair = [];
    }
    provenance.applyAction("Add new chart",
      (state: ApplicationState) => {
        state.layoutArray.push(newLayoutElement)
        return state;
      })
  }

  const onLayoutchange = (data: any) => {
    provenance.applyAction(
      `change layout to chart ${data.i}`,
      //We use index here because the layout array should always have the same order as the layoutlement array
      (state: ApplicationState) => {
        state.layoutArray = state.layoutArray.map((d, i) => {
          d.w = data[i].w;
          d.h = data[i].h;
          d.x = data[i].x;
          d.y = data[i].y;
          return d
        })
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
            state.layoutArray = [{
              aggregatedBy: "YEAR",
              valueToVisualize: "PRBC_UNITS",
              i: "0",
              w: 1,
              h: 1,
              x: 0,
              y: Infinity,
              plot_type: "BAR",
              extraPair: []
            }]
            state.filterSelection = ["CORONARY ARTERY BYPASS GRAFT(S)"]
            //TODO ADD PRESET STATE
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

  const changeChart = (x: string, y: string, i: string, type: string) => {
    provenance.applyAction(
      `change chart ${i}`,
      (state: ApplicationState) => {
        state.layoutArray = state.layoutArray.map(d => {
          if (d.i === i) {
            d.aggregatedBy = x;
            d.valueToVisualize = y;

          }
          return d
        })
        return state
      }
    )
  }

  const selectChart = (chartID: string) => {
    provenance.applyAction(
      `Selecting ${chartID}`,
      (state: ApplicationState) => {
        if (state.currentSelectedChart === chartID) {
          state.currentSelectedChart = "-1";
        } else {
          state.currentSelectedChart = chartID;
        }
        return state;
      }
    )
  }

  // const togglePerCase = (event: any, perCaseSelected: any) => {
  //   provenance.applyAction(
  //     `Per Case ${perCaseSelected.checked}`,
  //     (state: ApplicationState) => {
  //       state.perCaseSelected = perCaseSelected.checked;
  //       return state;
  //     }
  //   )
  // };

  const toggleShowZero = (event: any, showZero: any) => {
    provenance.applyAction(
      `Per Case ${showZero}`,
      (state: ApplicationState) => {
        state.showZero = showZero.checked;
        return state;
      }
    )
  };

  // const toggleDumbbell = (event: any, dumbbellSorted: any) => {
  //   provenance.applyAction(
  //     `dumbbell sort ${dumbbellSorted}`,
  //     (state: ApplicationState) => {
  //       state.dumbbellSorted = dumbbellSorted.checked;
  //       return state;
  //     }
  //   )
  // }

  const changeExtraPair = (chartID: string, newExtraPair: string) => {
    provenance.applyAction(
      `Change extra pair of ${chartID}`,
      (state: ApplicationState) => {
        state.layoutArray = state.layoutArray.map((d: LayoutElement) => {
          if (d.i === chartID && d.extraPair) {
            if (!d.extraPair.includes(newExtraPair)) {
              d.extraPair.push(newExtraPair)
              console.log(d)
            }
          }
          return d
        })
        return state;
      }
    )
  }

  const filterSelectionChange = (selectedFilterOption: any) => {
    provenance.applyAction(
      `Change Filter Selection to ${selectedFilterOption}`,
      (state: ApplicationState) => {
        if (state.filterSelection.includes(selectedFilterOption)) {
          state.filterSelection = state.filterSelection.filter(d => d !== selectedFilterOption)
        }
        else {
          state.filterSelection.push(selectedFilterOption)
        }

        //state.filterSelection = selectedFilterOption;
        return state;
      }
    )
  }

  const yearRangeChange = (newYearRange: any) => {
    provenance.applyAction(
      `Change Year Range To ${newYearRange}`,
      (state: ApplicationState) => {
        if (newYearRange !== state.yearRange) {
          state.yearRange = newYearRange;
        }
        return state;
      }
    );
  };

  const selectPatient = (data: SingleCasePoint) => {
    provenance.applyAction(`select patient ${data.patientID}`, (state: ApplicationState) => {

      if (state.currentSelectPatient && data.patientID === state.currentSelectPatient.patientID) {
        state.currentSelectPatient = null;
        state.currentSelectSet = null;
      }

      else {
        state.currentSelectPatient = data;
        state.currentSelectSet = null;
      }
      return state;
    })
  };

  const selectSet = (data: SelectSet) => {
    provenance.applyAction(`select set ${data.set_name} at ${data.set_value}`, (state: ApplicationState) => {
      if (state.currentSelectSet && data.set_name === state.currentSelectSet.set_name && data.set_value === state.currentSelectSet.set_value) {
        state.currentSelectSet = null;
        state.currentSelectPatient = null;
      }
      else {
        state.currentSelectSet = data;
        state.currentSelectPatient = null;
      }
      console.log(state.currentSelectSet)
      return state
    })
  }

  const updateCaseCount = (newCaseCount: number) => {
    //  if (store.totalCaseCount < newCaseCount){
    store.totalCaseCount = newCaseCount;
    //  }
  }
  const storeHemoData = (data: any) => {
    provenance.applyAction(`cache hemo data`,
      (state: ApplicationState) => {
        state.hemoglobinDataSet = data;
        return state;
      })
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
      setLayoutArray,
      selectChart,
      changeChart,
      toggleShowZero,
      // toggleDumbbell,
      filterSelectionChange,
      yearRangeChange,
      addNewChart,
      removeChart,
      updateCaseCount,
      onLayoutchange,
      selectPatient,
      selectSet,
      storeHemoData,
      changeExtraPair,
      loadPreset
    }
  };


}