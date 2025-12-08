import { makeObservable, observable, computed, toJS, runInAction } from 'mobx';
import {
    initProvenance, Provenance, ProvenanceGraph, NodeID,
} from '@visdesignlab/trrack';
import type { RootStore } from './Store';
import { DashboardChartConfig, DashboardStatConfig, ExploreChartConfig, Cost } from '../Types/application';
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
    explore: {
        chartConfigs: ExploreChartConfig[];
        chartLayouts: { [key: string]: Layout[] };
    };
    settings: {
        unitCosts: Record<Cost, number>;
    };
    ui: {
        activeTab: string;
        leftToolbarOpened: boolean;
        activeLeftPanel: number | null;
        selectedVisitNo: number | null;
        filterPanelExpandedItems: string[];
        showFilterHistograms: boolean;
    };
}

export interface MyAnnotation {
    type: string;
    value: string;
}

export class ProvenanceStore {
    _rootStore: RootStore;

    provenance: Provenance<ApplicationState, any, MyAnnotation> | null = null;
    isInitialized = false;
    graphVersion = 0;

    constructor(rootStore: RootStore) {
        this._rootStore = rootStore;

        // Use makeObservable for precise control. 
        // We ONLY want graphVersion to be observable and savedStates to be computed.
        // Everything else (provenance, actions) must remain plain objects to avoid MobX proxying Trrack.
        makeObservable(this, {
            graphVersion: observable,
            isInitialized: observable,
            savedStates: computed,
            canUndo: computed,
            canRedo: computed,
        });

    }

    /**
     * Initialize the provenance store with current store values.
     * This should be called after data is loaded and default filter values are calculated.
     */
    init() {
        if (this.isInitialized) {
            console.warn("ProvenanceStore already initialized");
            return;
        }

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
            explore: {
                chartConfigs: toJS(this._rootStore.exploreStore.chartConfigs),
                chartLayouts: toJS(this._rootStore.exploreStore.chartLayouts),
            },
            settings: {
                unitCosts: toJS(this._rootStore.unitCosts),
            },
            ui: {
                activeTab: 'Dashboard',
                leftToolbarOpened: true,
                activeLeftPanel: null,
                selectedVisitNo: null,
                filterPanelExpandedItems: ['date-filters', 'blood-component-filters'],
                showFilterHistograms: false,
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
                const state = this.provenance!.getState(this.provenance!.current);

                if (!state || Object.keys(state).length === 0) {
                    console.error("CRITICAL: Empty state detected during CurrentChanged!");
                    return;
                }
                this.syncStateToStores(state);
            }
        });

        this.provenance.done();

        runInAction(() => {
            this.isInitialized = true;
        });
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

            if (!this.provenance) return;
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
            if (!this.provenance) return;
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
            if (!this.provenance) return;
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
            if (!this.provenance) return;
            console.log("💾 [ProvenanceStore] Saving Dashboard Config:", chartConfigs);
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
            if (!this.provenance) return;
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
            if (!this.provenance) return;
            console.log("➕ [ProvenanceStore] Adding Chart Config:", config);
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
        removeChart: (chartId: string, layouts: { [key: string]: Layout[] }) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    console.log("State before Remove Chart:", state);
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
                            chartConfigs: state.dashboard.chartConfigs.filter(c => c.chartId !== chartId),
                            chartLayouts: layouts
                        }
                    };

                    console.log("New State after Remove Chart:", newState);
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
        // Remove stat
        removeStat: (statId: string) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) return {
                        state: state || {} as ApplicationState,
                        label: 'Remove Stat',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            statConfigs: state.dashboard.statConfigs.filter(s => s.statId !== statId)
                        }
                    };

                    console.log("New State after Remove Stat:", newState);
                    return {
                        state: newState,
                        label: 'Remove Stat',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Remove Stat');
        },
        // Add Stat
        addStat: (config: DashboardStatConfig) => {
            if (!this.provenance) return;
            console.log("➕ [ProvenanceStore] Adding Stat Config:", config);
            this.provenance.apply({
                apply: (state: ApplicationState) => {

                    if (!state || !state.dashboard) return {
                        state: state || {} as ApplicationState,
                        label: 'Add Stat',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        dashboard: {
                            ...state.dashboard,
                            statConfigs: [config, ...state.dashboard.statConfigs],
                        }
                    };
                    return {
                        state: newState,
                        label: 'Add Stat',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Add Stat');
        },
        // Generic update for complex dashboard changes
        updateDashboardState: (dashboardState: ApplicationState['dashboard'], label: string = 'Update Dashboard') => {
            if (!this.provenance) return;
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
        },
        setUiState: (partialUiState: Partial<ApplicationState['ui']>) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    if (!state) return {
                        state: state || {} as ApplicationState,
                        label: 'Update UI State',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        ui: {
                            ...state.ui,
                            ...partialUiState
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update UI State',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update UI State');
        },
        updateExploreConfig: (chartConfigs: ExploreChartConfig[]) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    if (!state) return {
                        state: state || {} as ApplicationState,
                        label: 'Update Explore Config',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        explore: {
                            ...state.explore,
                            chartConfigs: chartConfigs
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Explore Config',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Explore Config');
        },
        updateExploreLayout: (layouts: { [key: string]: Layout[] }) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    if (!state) return {
                        state: state || {} as ApplicationState,
                        label: 'Update Explore Layout',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        explore: {
                            ...state.explore,
                            chartLayouts: layouts
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Explore Layout',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Explore Layout');
        },
        updateExploreState: (exploreState: ApplicationState['explore'], label: string = 'Update Explore State') => {
            if (!this.provenance) return;
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
                        explore: exploreState
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
        },
        updateSettings: (unitCosts: Record<Cost, number>) => {
            if (!this.provenance) return;
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    if (!state) return {
                        state: state || {} as ApplicationState,
                        label: 'Update Settings',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;

                    const newState = {
                        ...state,
                        settings: {
                            ...state.settings,
                            unitCosts: unitCosts
                        }
                    };
                    return {
                        state: newState,
                        label: 'Update Settings',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Update Settings');
        }
    };

    // Sync Logic ----------------------------------------------------------------

    syncStateToStores(state: ApplicationState) {
        if (!state) return;

        console.log("🔄 [ProvenanceStore] Syncing State to Stores (Retrieving):", state);

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
            console.log("📊 [ProvenanceStore] Restoring Dashboard Config:", state.dashboard.chartConfigs);
            (this._rootStore.dashboardStore as any).loadState(state.dashboard);
        }

        // Sync Explore
        if (state.explore) {
            (this._rootStore.exploreStore as any).loadState(state.explore);
        }

        // Sync Settings
        if (state.settings) {
            this._rootStore._unitCosts = state.settings.unitCosts;
            this._rootStore.updateCostsTable();
        }
    }

    // Save/Restore --------------------------------------------------------------

    saveState(name: string, screenshot?: string) {
        if (!this.provenance) return;
        const currentNodeId = this.provenance.current.id;
        console.log("Provenance Current Node:", this.provenance.current);

        console.log("🔖 [ProvenanceStore] Bookmarking State:", this.provenance.getState(currentNodeId));
        this.provenance.addArtifact({ type: 'name', value: name }, currentNodeId);
        if (screenshot) {
            this.provenance.addArtifact({ type: 'screenshot', value: screenshot }, currentNodeId);
        }

        // Trigger reactivity so UI updates
        runInAction(() => {
            this.graphVersion++;
        });
    }

    // Workaround: Trrack doesn't support removing artifacts, so we track deleted state IDs locally
    deletedStateIds: Set<NodeID> = new Set();

    removeState(nodeId: NodeID) {
        this.deletedStateIds.add(nodeId);
        // Trigger reactivity
        runInAction(() => {
            this.graphVersion++;
        });
    }

    renameState(nodeId: NodeID, newName: string) {
        if (!this.provenance) return;
        this.provenance.addArtifact({ type: 'name', value: newName }, nodeId);
        // Trigger reactivity
        runInAction(() => {
            this.graphVersion++;
        });
    }

    get savedStates() {
        // Access graphVersion to ensure this computed property updates when the graph changes
        // eslint-disable-next-line no-unused-expressions
        this.graphVersion;

        const provenance = this.provenance;
        // Return a list of nodes that have the 'name' artifact
        if (!provenance) return [];
        const nodes = Object.values(provenance.graph.nodes);


        return nodes.filter(node => {
            if (this.deletedStateIds.has(node.id)) return false;
            const artifacts = provenance.getAllArtifacts(node.id);
            return artifacts.some(a => a.artifact.type === 'name');
        })
            .map(node => {
                const artifacts = provenance.getAllArtifacts(node.id);
                // Find the LATEST name artifact
                const nameArtifact = artifacts.filter(a => a.artifact.type === 'name').pop();
                const screenshotArtifact = artifacts.find(a => a.artifact.type === 'screenshot');
                return {
                    id: node.id,
                    name: nameArtifact?.artifact.value,
                    screenshot: screenshotArtifact?.artifact.value,
                    // timestamp: node.createdOn // createdOn might be on metadata or different property
                    // Let's assume metadata.createdOn or just use Date.now() if not available, or check node structure
                    // Trrack nodes usually have createdOn. If lint fails, we can cast to any or check type.
                    // @ts-ignore
                    timestamp: node.createdOn || node.metadata?.createdOn || 0
                };
            });
    }

    get canUndo() {
        // Access graphVersion to ensure reactivity
        // eslint-disable-next-line no-unused-expressions
        this.graphVersion;

        if (!this.provenance) return false;
        const current = this.provenance.current;
        const root = this.provenance.root;
        return current.id !== root.id;
    }

    get canRedo() {
        // Access graphVersion to ensure reactivity
        // eslint-disable-next-line no-unused-expressions
        this.graphVersion;

        if (!this.provenance) return false;
        const current = this.provenance.current;
        return current.children.length > 0;
    }

    get currentState() {
        if (!this.provenance) {
            // Return default/empty state if not initialized
            return {
                filterValues: {},
                selections: {},
                dashboard: {},
                explore: {},
                settings: {},
                ui: {
                    activeTab: 'Dashboard',
                    leftToolbarOpened: true,
                    activeLeftPanel: null,
                    selectedVisitNo: null,
                    filterPanelExpandedItems: [],
                    showFilterHistograms: false,
                }
            } as any;
        }
        return this.provenance.getState(this.provenance.current);
    }

    restoreState(nodeId: NodeID) {
        if (!this.provenance) return;
        const targetState = this.provenance.getState(nodeId);

        console.log("⏪ [ProvenanceStore] Restoring State:", targetState);
        this.provenance.goToNode(nodeId);
        console.log("Going to node:", this.provenance.getState(nodeId))
    }
}
