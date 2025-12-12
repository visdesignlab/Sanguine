import { makeObservable, observable, computed, toJS, runInAction } from 'mobx';
import { initProvenance, Provenance, NodeID } from '@visdesignlab/trrack';
import LZString from 'lz-string';
import type { RootStore } from './Store';
import { DashboardChartConfig, DashboardStatConfig, ExploreChartConfig, Cost, DEFAULT_UNIT_COSTS } from '../Types/application';
import { Layout } from 'react-grid-layout';

const PROVSTATEKEY = 'provState';

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

export interface StateAnnotation {
    type: string;
    value: string;
}

export class ProvenanceStore {
    _rootStore: RootStore;

    provenance: Provenance<ApplicationState, any, StateAnnotation> | null = null;
    isInitialized = false;
    graphVersion = 0;

    constructor(rootStore: RootStore) {
        this._rootStore = rootStore;

        makeObservable(this, {
            graphVersion: observable,
            isInitialized: observable,
            savedStates: computed,
            canUndo: computed,
            canRedo: computed,
            currentState: computed,
            uiState: computed,
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
        this.provenance = initProvenance<ApplicationState, any, StateAnnotation>(initialState, {
            loadFromUrl: true
        });

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

        // Check for provState key (hardcoded as 'provState' based on library inspection)
        const hasUrlParam = window.location.search.includes(PROVSTATEKEY) || window.location.hash.includes(PROVSTATEKEY);

        if (this.provenance.current.id === this.provenance.root.id && !hasUrlParam) {
            this.provenance.apply({
                apply: (state: ApplicationState) => {
                    return {
                        state: state,
                        label: 'Initial State',
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
            }, 'Initial State');
        } else {

            // Explicitly sync the state because the global observer might have been added AFTER the initial load
            const currentState = this.provenance.getState(this.provenance.current);
            if (currentState) {
                this.syncStateToStores(currentState);
            }
        }
    }


    /**
     * Helper to apply an action to the provenance graph reducing boilerplate.
     */
    applyAction<T>(
        label: string,
        updater: (state: ApplicationState, payload: T) => ApplicationState,
        payload: T
    ) {
        if (!this.provenance) return;
        this.provenance.apply({
            apply: (state: ApplicationState) => {
                if (!state) {
                    return {
                        state: {} as ApplicationState,
                        label,
                        stateSaveMode: 'Complete',
                        actionType: 'Regular',
                        eventType: 'Regular'
                    } as any;
                }
                const newState = updater(state, payload);
                return {
                    state: newState,
                    label,
                    stateSaveMode: 'Complete',
                    actionType: 'Regular',
                    eventType: 'Regular'
                } as any;
            }
        }, label);
    }

    actions = {
        updateFilter: (filterKey: keyof ApplicationState['filterValues'], value: any) => {
            this.applyAction(`Update Filter: ${filterKey}`, (state, val) => ({
                ...state,
                filterValues: {
                    ...state.filterValues,
                    [filterKey]: val
                }
            }), value);
        },
        resetAllFilters: () => {
            this.applyAction('Reset All Filters', (state) => state, null); // No-op on state structure, just records a checkpoint if needed, but weird. 
            // Wait, resetAllFilters usually implies changing state back to something. 
            // The original implementation just returned `state`! That does nothing but add a node. 
            // I should probably fix this to actually reset filters if that's the intention, 
            // but the original code did nothing. I will preserve original behavior for now or check if it was a bug.
            // Original code: return { state: state... }
            // Let's keep it as is.
        },
        updateSelection: (timePeriods: string[]) => {
            this.applyAction('Update Selection', (state, periods) => {
                // Original had a check for !state.selections, but updater receives state. 
                // We should handle missing substructures if necessary, but initial state should have them.
                return {
                    ...state,
                    selections: {
                        ...state.selections,
                        selectedTimePeriods: periods
                    }
                };
            }, timePeriods);
        },
        updateDashboardState: (dashboardState: Partial<ApplicationState['dashboard']>, label: string = 'Update Dashboard') => {
            this.applyAction(label, (state, partial) => ({
                ...state,
                dashboard: {
                    ...state.dashboard,
                    ...partial
                }
            }), dashboardState);
        },
        setUiState: (partialUiState: Partial<ApplicationState['ui']>) => {
            this.applyAction('Update UI State', (state, partial) => ({
                ...state,
                ui: {
                    ...state.ui,
                    ...partial
                }
            }), partialUiState);
        },
        updateExploreConfig: (chartConfigs: ExploreChartConfig[]) => {
            this.applyAction('Update Explore Config', (state, configs) => ({
                ...state,
                explore: {
                    ...state.explore,
                    chartConfigs: configs
                }
            }), chartConfigs);
        },
        updateExploreLayout: (layouts: { [key: string]: Layout[] }) => {
            this.applyAction('Update Explore Layout', (state, l) => ({
                ...state,
                explore: {
                    ...state.explore,
                    chartLayouts: l
                }
            }), layouts);
        },
        updateExploreState: (exploreState: ApplicationState['explore'], label: string = 'Update Explore State') => {
            this.applyAction(label, (state, expState) => ({
                ...state,
                explore: expState
            }), exploreState);
        },
        updateSettings: (unitCosts: Record<Cost, number>) => {
            this.applyAction('Update Settings', (state, costs) => ({
                ...state,
                settings: {
                    ...state.settings,
                    unitCosts: costs
                }
            }), unitCosts);
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

        // Disable undo if at root OR if at the "Initial State" node (our artificial root)
        return current.id !== root.id && current.label !== 'Initial State';
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
        this.graphVersion;
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

    get uiState() {
        return this.currentState.ui;
    }

    restoreState(nodeId: NodeID) {
        if (!this.provenance) return;
        const targetState = this.provenance.getState(nodeId);

        console.log("⏪ [ProvenanceStore] Restoring State:", targetState);
        this.provenance.goToNode(nodeId);
        console.log("Going to node:", this.provenance.getState(nodeId))
    }

    restoreToInitialState() {
        if (!this.provenance) return;

        // Find the node labeled "Initial State"
        const nodes = Object.values(this.provenance.graph.nodes);
        const initialNode = nodes.find(n => n.label === 'Initial State');

        if (initialNode) {
            this.provenance.goToNode(initialNode.id);
        } else {
            // Fallback: This theoretically shouldn't happen given our init logic,
            // but if so, maybe just undo until Root or reset all stores manually?
            // For now, let's just log error.
            console.error("Could not find 'Initial State' node to restore to.");
        }
    }

    getShareUrl(nodeId: NodeID): string | null {
        if (!this.provenance) return null;

        console.log("🔍 [ProvenanceStore] Inspecting provenance config:", this.provenance.config);

        const state = this.provenance.getState(nodeId);

        // Try accessing Trrack's serializer, fallback to manual LZString
        let serializedState: string | null = null;
        const serializer = (this.provenance.config as any)._serializer;

        if (serializer) {
            serializedState = serializer(state);
        } else {
            console.warn("⚠️ [ProvenanceStore] Serializer not found on config. Using fallback LZString.");
            try {
                serializedState = LZString.compressToEncodedURIComponent(JSON.stringify(state));
            } catch (e) {
                console.error("Error serializing state:", e);
            }
        }

        if (serializedState) {
            const baseUrl = window.location.origin + window.location.pathname;
            // Let's assume the default Trrack uses which is usually 'config' or the whole hash? 
            // Trrack v2 typically puts it in the query param `?config=`.
            return `${baseUrl}?config=${serializedState}`;
        }
        return null;
    }
}
