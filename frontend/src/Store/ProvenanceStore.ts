import { makeObservable, observable, computed, toJS, runInAction } from 'mobx';
import {
    initProvenance, Provenance, ProvenanceGraph, NodeID,
} from '@visdesignlab/trrack';
import type { RootStore } from './Store';
import { DashboardChartConfig, DashboardStatConfig } from '../Types/application';
import { Layout } from 'react-grid-layout';

export interface ApplicationState {
    filterValues: {
        dateFrom: string; // Store dates as strings in Trrack
        dateTo: string;
        rbc_units: [number, number];
        ffp_units: [number, number];
        plt_units: [number, number];
        cryo_units: [number, number];
        cell_saver_ml: [number, number];
        b12: boolean | null;
        iron: boolean | null;
        antifibrinolytic: boolean | null;
        los: [number, number];
        death: boolean | null;
        vent: boolean | null;
        stroke: boolean | null;
        ecmo: boolean | null;
    };
    selections: {
        selectedTimePeriods: string[];
        // We don't track derived selections like selectedVisits, only the source
    };
    dashboard: {
        chartConfigs: DashboardChartConfig[];
        statConfigs: DashboardStatConfig[];
        chartLayouts: { [key: string]: Layout[] };
    };
}

export interface MyAnnotation {
    type: string;
    value: string;
}

export class ProvenanceStore {
    _rootStore: RootStore;

    provenance: Provenance<ApplicationState, any, MyAnnotation>;
    graphVersion = 0;

    constructor(rootStore: RootStore) {
        this._rootStore = rootStore;

        // Use makeObservable for precise control. 
        // We ONLY want graphVersion to be observable and savedStates to be computed.
        // Everything else (provenance, actions) must remain plain objects to avoid MobX proxying Trrack.
        makeObservable(this, {
            graphVersion: observable,
            savedStates: computed,
        });

        const rawInitialState: ApplicationState = {
            filterValues: {
                dateFrom: rootStore.filtersStore.initialFilterValues.dateFrom.toISOString(),
                dateTo: rootStore.filtersStore.initialFilterValues.dateTo.toISOString(),
                rbc_units: toJS(rootStore.filtersStore.initialFilterValues.rbc_units),
                ffp_units: toJS(rootStore.filtersStore.initialFilterValues.ffp_units),
                plt_units: toJS(rootStore.filtersStore.initialFilterValues.plt_units),
                cryo_units: toJS(rootStore.filtersStore.initialFilterValues.cryo_units),
                cell_saver_ml: toJS(rootStore.filtersStore.initialFilterValues.cell_saver_ml),
                b12: rootStore.filtersStore.initialFilterValues.b12,
                iron: rootStore.filtersStore.initialFilterValues.iron,
                antifibrinolytic: rootStore.filtersStore.initialFilterValues.antifibrinolytic,
                los: toJS(rootStore.filtersStore.initialFilterValues.los),
                death: rootStore.filtersStore.initialFilterValues.death,
                vent: rootStore.filtersStore.initialFilterValues.vent,
                stroke: rootStore.filtersStore.initialFilterValues.stroke,
                ecmo: rootStore.filtersStore.initialFilterValues.ecmo,
            },
            selections: {
                selectedTimePeriods: [],
            },
            dashboard: {
                chartConfigs: toJS(rootStore.dashboardStore.chartConfigs),
                statConfigs: toJS(rootStore.dashboardStore.statConfigs),
                chartLayouts: toJS(rootStore.dashboardStore.chartLayouts),
            },
        };



        // Deep clean the state to remove any MobX proxies or getters
        const initialState = JSON.parse(JSON.stringify(rawInitialState));


        this.provenance = initProvenance<ApplicationState, any, MyAnnotation>(initialState);

        // Check if provenance got proxied
        // @ts-ignore
        const isProxy = !!this.provenance[Symbol.for("mobx administration")];

        if (isProxy) {
            console.error("CRITICAL: Provenance instance IS A PROXY. This will break Trrack.");
        }

        // Verify state immediately
        const immediateState = this.provenance.getState(this.provenance.current);


        // Set up observer to sync state back to MobX stores
        // IMPORTANT: Only sync state back during undo/redo (CurrentChanged), not during new actions (NodeAdded)
        // This prevents overwriting store values with stale initial state from Trrack
        this.provenance.addGlobalObserver((_graph, changeType) => {
            // Always trigger MobX update for UI reactivity
            runInAction(() => {
                this.graphVersion++;
            });

            // Only sync state to stores when navigating history (undo/redo/restore)
            // Don't sync when new actions are added, as the action itself updates the stores
            if (changeType === 'CurrentChanged') {
                const state = this.provenance.getState(this.provenance.current);

                if (!state || Object.keys(state).length === 0) {
                    console.error("CRITICAL: Empty state detected during CurrentChanged!");
                    return;
                }
                this.syncStateToStores(state);
            }
        });

        this.provenance.done();
    }

    /**
     * Reinitialize the provenance store with current store values.
     * This should be called after data is loaded and default filter values are calculated.
     */
    reinitialize() {


        const rawInitialState: ApplicationState = {
            filterValues: {
                dateFrom: this._rootStore.filtersStore.filterValues.dateFrom.toISOString(),
                dateTo: this._rootStore.filtersStore.filterValues.dateTo.toISOString(),
                rbc_units: toJS(this._rootStore.filtersStore.filterValues.rbc_units),
                ffp_units: toJS(this._rootStore.filtersStore.filterValues.ffp_units),
                plt_units: toJS(this._rootStore.filtersStore.filterValues.plt_units),
                cryo_units: toJS(this._rootStore.filtersStore.filterValues.cryo_units),
                cell_saver_ml: toJS(this._rootStore.filtersStore.filterValues.cell_saver_ml),
                b12: this._rootStore.filtersStore.filterValues.b12,
                iron: this._rootStore.filtersStore.filterValues.iron,
                antifibrinolytic: this._rootStore.filtersStore.filterValues.antifibrinolytic,
                los: toJS(this._rootStore.filtersStore.filterValues.los),
                death: this._rootStore.filtersStore.filterValues.death,
                vent: this._rootStore.filtersStore.filterValues.vent,
                stroke: this._rootStore.filtersStore.filterValues.stroke,
                ecmo: this._rootStore.filtersStore.filterValues.ecmo,
            },
            selections: {
                selectedTimePeriods: [],
            },
            dashboard: {
                chartConfigs: toJS(this._rootStore.dashboardStore.chartConfigs),
                statConfigs: toJS(this._rootStore.dashboardStore.statConfigs),
                chartLayouts: toJS(this._rootStore.dashboardStore.chartLayouts),
            },
        };

        const initialState = JSON.parse(JSON.stringify(rawInitialState));


        // Create new provenance instance
        this.provenance = initProvenance<ApplicationState, any, MyAnnotation>(initialState);

        // Set up observer again
        this.provenance.addGlobalObserver((_graph, changeType) => {
            runInAction(() => {
                this.graphVersion++;
            });

            if (changeType === 'CurrentChanged') {
                const state = this.provenance.getState(this.provenance.current);

                if (!state || Object.keys(state).length === 0) {
                    console.error("CRITICAL: Empty state detected during CurrentChanged!");
                    return;
                }
                this.syncStateToStores(state);
            }
        });

        this.provenance.done();
    }

    // Actions -------------------------------------------------------------------

    actions = {
        updateFilter: (filterKey: keyof ApplicationState['filterValues'], value: any) => {
            // Update MobX store directly
            const currentFilters = this._rootStore.filtersStore.filterValues;
            const updatedFilters = {
                ...currentFilters,
                [filterKey]: value instanceof Date ? value : (Array.isArray(value) ? value : value)
            };
            (this._rootStore.filtersStore as any).loadState(updatedFilters);

            // Update Trrack state
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    if (!state || !state.filterValues) {
                        return {
                            state: state || {} as ApplicationState,
                            label: `Update Filter: ${filterKey}`,
                            stateSaveMode: 'Complete',
                            actionType: 'Regular',
                            eventType: 'Regular'
                        } as any;
                    }
                    const newState = {
                        ...state,
                        filterValues: {
                            ...state.filterValues,
                            [filterKey]: value
                        }
                    };
                    return {
                        state: newState,
                        label: `Update Filter: ${filterKey}`,
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, `Update Filter: ${filterKey}`);
        },
        resetAllFilters: () => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    return {
                        state: state,
                        label: 'Reset All Filters',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Reset All Filters');
        },
        updateSelection: (timePeriods: string[]) => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.selections) {
                        console.error(`Update Selection: Received invalid state`, state);
                        return {
                            state: state || {} as ApplicationState,
                            label: 'Update Selection',
                            stateSaveMode: 'Complete',
                            actionType: 'Regular',
                            eventType: 'Regular'
                        } as any;
                    }
                    const newState = {
                        ...state,
                        selections: {
                            ...state.selections,
                            selectedTimePeriods: timePeriods
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Selection',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Selection');
        },
        updateDashboardConfig: (chartConfigs: DashboardChartConfig[]) => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) return {
                        state: state || {} as ApplicationState,
                        label: 'Update Dashboard Config',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            chartConfigs: chartConfigs
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Dashboard Config',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Dashboard Config');
        },
        updateDashboardLayout: (layouts: { [key: string]: Layout[] }) => {
            // Guard against early calls or invalid state
            const currentState = this.provenance.getState(this.provenance.current);
            if (!currentState || !currentState.dashboard) {
                console.warn("Skipping updateDashboardLayout: Invalid current state", currentState);
                return;
            }

            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) {
                        console.error("Invalid state in updateDashboardLayout apply. Received:", state);
                        return {
                            state: state || {} as ApplicationState,
                            label: 'Update Dashboard Layout',
                            stateSaveMode: 'Complete',
                            actionType: 'Regular',
                            eventType: 'Regular'
                        } as any;
                    }
                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            chartLayouts: layouts
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Dashboard Layout',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Dashboard Layout');
        },
        addChart: (config: DashboardChartConfig, layouts: { [key: string]: Layout[] }) => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) return {
                        state: state || {} as ApplicationState,
                        label: 'Add Chart',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            chartConfigs: [config, ...state.dashboard.chartConfigs],
                            chartLayouts: layouts
                        }
                    };
                    return {
                        state: newState,
                        label: 'Add Chart',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Add Chart');
        },
        removeChart: (chartId: string) => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) return {
                        state: state || {} as ApplicationState,
                        label: 'Remove Chart',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            chartConfigs: state.dashboard.chartConfigs.filter(c => c.chartId !== chartId)
                        }
                    };
                    return {
                        state: newState,
                        label: 'Remove Chart',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Remove Chart');
        },
        // Generic update for complex dashboard changes
        updateDashboardState: (dashboardState: ApplicationState['dashboard'], label: string = 'Update Dashboard') => {
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state) return {
                        state: state || {} as ApplicationState,
                        label: label,
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: dashboardState
                    };
                    return {
                        state: newState,
                        label: label,
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, label);
        }
    };

    // Sync Logic ----------------------------------------------------------------

    syncStateToStores(state: ApplicationState) {
        if (!state) return;

        // Sync Filters
        const { filterValues } = state;
        if (filterValues) {
            // We need to convert string dates back to Date objects
            const parsedFilters = {
                ...filterValues,
                dateFrom: new Date(filterValues.dateFrom),
                dateTo: new Date(filterValues.dateTo),
            };
            (this._rootStore.filtersStore as any).loadState(parsedFilters);
        }

        // Sync Selections
        if (state.selections) {
            (this._rootStore.selectionsStore as any).loadState(state.selections.selectedTimePeriods);
        }

        // Sync Dashboard
        if (state.dashboard) {
            (this._rootStore.dashboardStore as any).loadState(state.dashboard);
        }
    }

    // Save/Restore --------------------------------------------------------------

    saveState(name: string) {
        // In Trrack, every state is already "saved" in the graph.
        // We just need to mark this node as a "saved" state for the UI.
        // We can use annotations or just store the NodeID in a list.
        const currentNodeId = this.provenance.current.id;
        const currentState = this.provenance.getState(this.provenance.current);




        // Use addArtifact for structured data. addAnnotation is for strings only.
        this.provenance.addArtifact({ type: 'name', value: name }, currentNodeId);
    }

    get savedStates() {
        // Access graphVersion to ensure this computed property updates when the graph changes
        // eslint-disable-next-line no-unused-expressions
        this.graphVersion;

        // Return a list of nodes that have the 'name' artifact
        const nodes = Object.values(this.provenance.graph.nodes);


        return nodes.filter(node => {
            const artifacts = this.provenance.getAllArtifacts(node.id);
            return artifacts.some(a => a.artifact.type === 'name');
        })
            .map(node => {
                const artifacts = this.provenance.getAllArtifacts(node.id);
                const nameArtifact = artifacts.find(a => a.artifact.type === 'name');
                return {
                    id: node.id,
                    name: nameArtifact?.artifact.value,
                    // timestamp: node.createdOn // createdOn might be on metadata or different property
                    // Let's assume metadata.createdOn or just use Date.now() if not available, or check node structure
                    // Trrack nodes usually have createdOn. If lint fails, we can cast to any or check type.
                    // @ts-ignore
                    timestamp: node.createdOn || node.metadata?.createdOn || 0
                };
            });
    }

    restoreState(nodeId: NodeID) {

        const targetState = this.provenance.getState(nodeId);

        this.provenance.goToNode(nodeId);
    }
}
