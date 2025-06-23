import { observer } from 'mobx-react';
import {
  useContext, useRef, useLayoutEffect,
} from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import {
  Container, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider,
} from '@mui/material';
import {
  BloodCells, BloodTransfusion, MedicineBottle, BloodBag, Dollar,
} from 'healthicons-react';
import ArrowOutward from '@mui/icons-material/ArrowOutward';
import Store from '../Interfaces/Store';
import { LayoutElement } from '../Interfaces/Types/LayoutTypes';
import WrapperCostBar from './Charts/CostBarChart';
import WrapperDumbbell from './Charts/DumbbellChart/WrapperDumbbell';
import WrapperHeatMap from './Charts/HeatMap/WrapperHeatMap';
import WrapperScatter from './Charts/ScatterPlot/WrapperScatter';
import {
  costSavingsState, preopAnemiaState, dumbbellState, antifibrinState, cellSalvageState,
} from '../Interfaces/PresetStates/PresetStates';
import { ApplicationState } from '../Interfaces/Types/StateTypes';
import { ArrowUpward } from '@mui/icons-material';

// Groups of preset visualization questions with labels and icons
const presetGroups: {
  groupLabel: string;
  options: { label: string; Icon: React.FC; state: ApplicationState }[];
}[] = [
  {
    groupLabel: 'Guideline Adherence',
    options: [
      { label: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: BloodCells, state: preopAnemiaState },
      { label: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: BloodTransfusion, state: dumbbellState },
    ],
  },
  {
    groupLabel: 'Outcomes',
    options: [
      { label: 'What are the outcomes of cases using antifibrinolytics?', Icon: MedicineBottle, state: antifibrinState },
      { label: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: BloodBag, state: cellSalvageState },
    ],
  },
  {
    groupLabel: 'Cost / Savings',
    options: [
      { label: 'What are the costs and potential savings for surgical blood products?', Icon: Dollar, state: costSavingsState },
    ],
  },
];

function LayoutGenerator() {
  const store = useContext(Store);

  const createElement = (layout: LayoutElement) => {
    let chartElement: JSX.Element | null = null;
    switch (layout.chartType) {
      case 'DUMBBELL':
        chartElement = <WrapperDumbbell layout={layout} />;
        break;

      case 'SCATTER':
        chartElement = <WrapperScatter layout={layout} />;
        break;

      case 'HEATMAP':
        chartElement = <WrapperHeatMap layout={layout} />;
        break;

      case 'COST':
        chartElement = <WrapperCostBar layout={layout} />;
        break;

      default:
        break;
    }

    return <div key={layout.i}>{chartElement}</div>;
  };

  const colData = {
    lg: 2,
    md: 2,
    sm: 2,
    xs: 2,
    xxs: 2,
  };
  const generateGrid = () => {
    const output = store.provenanceState.layoutArray.map((d) => ({
      w: d.w, h: d.h, x: d.x, y: d.y, i: d.i,
    }));
    const newStuff = output.map((d) => ({ ...d }));
    return newStuff;
  };

  const tabRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (tabRef.current) {
      store.mainCompWidth = tabRef.current.clientWidth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabRef]);

  window.addEventListener('resize', () => {
    if (tabRef.current) {
      store.mainCompWidth = tabRef.current.clientWidth;
    }
  });

  // Loads a preset state into the store, making preset plots appear
  const loadPresetState = (state: ApplicationState) => () => {
    if (state) {
      // Remove layout array from the state (to avoid duplicating charts)
      const spreadState = { ...state };
      const stateWithoutLayout = { ...spreadState, layoutArray: [] };
      // Add the state (without layout array) to the store's provenance
      const jsonState = JSON.stringify(stateWithoutLayout);
      const jsonParsed = JSON.parse(jsonState);
      store.provenance.importState(jsonParsed);

      // Set the layout array to the chart store
      state.layoutArray.map((d: LayoutElement) => store.chartStore.addNewChart(d));
    }
  };

  return (
    <Container ref={tabRef}>
      {store.provenanceState.layoutArray.length === 0 && (
        <>
          <Typography
            variant="h5"
            mt={2}
            mb={2}
            sx={{ opacity: 0.4, fontStyle: 'italic', textAlign: 'right' }}
          >
            Create custom visualizations (Add Chart)
            <ArrowUpward fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, mr: 5 }} />
          </Typography>
          <Divider sx={{ width: '100%' }} />
          <List sx={{ width: '100%', mt: 1 }}>
            {/* For every question in presetOptions, show the group label, questions, and icons */}
            {presetGroups.map(({ groupLabel, options }) => (
              <div key={groupLabel}>
                {/* Group label for each preset group */}
                <Typography variant="h5" mt={2} sx={{ opacity: 0.4, fontStyle: 'italic' }}>
                  {groupLabel}
                </Typography>
                {/* Each question option */}
                {options.map(({ label, Icon, state }) => (
                  <ListItemButton
                    key={label}
                    // Hover actions, darken text and make arrow bounce
                    sx={{
                      alignItems: 'center',
                      '&:hover .arrow-icon': { transform: 'translateY(-8px)', opacity: 0.7 },
                      '&:hover .item-icon': { opacity: 0.7 },
                      '&:hover .MuiListItemText-primary': { opacity: 0.7 },
                      mt: 1,
                    }}
                    onClick={loadPresetState(state)}
                  >
                    <ListItemIcon className="item-icon" sx={{ opacity: 0.4 }}>
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        variant: 'h6',
                        sx: {
                          opacity: 0.4, fontStyle: 'italic', lineHeight: 1, fontWeight: 400,
                        },
                      }}
                    />
                    <ArrowOutward
                      className="arrow-icon"
                      sx={{
                        ml: 'auto',
                        opacity: 0.4,
                        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                      }}
                    />
                  </ListItemButton>
                ))}
              </div>
            ))}
          </List>
        </>
      )}
      <Responsive
        onResizeStop={(e) => { store.chartStore.onLayoutChange(e); }}
        onDragStop={(e) => { store.chartStore.onLayoutChange(e); }}
        draggableHandle=".move-icon"
        cols={colData}
        rowHeight={400}
        width={0.95 * store.mainCompWidth}
        layouts={{
          xxs: generateGrid(),
          xs: generateGrid(),
          sm: generateGrid(),
          md: generateGrid(),
          lg: generateGrid(),
        }}
        isBounded
      >
        {store.provenanceState.layoutArray.map((layoutE) => createElement(layoutE))}
      </Responsive>
    </Container>
  );
}

export default observer(LayoutGenerator);
