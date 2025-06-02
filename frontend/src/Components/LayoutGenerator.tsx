import { observer } from 'mobx-react';
import {
  useContext, useRef, useLayoutEffect,
} from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import {
  Container, List, ListItemButton, ListItemIcon, ListItemText, Typography,
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

  const defaultOptions = [
    { label: 'How many RBCs transfused per surgeon in CABG cases?', Icon: BloodCells },
    { label: 'Transfusion appropriateness - pre-op & post-op HGB levels?', Icon: BloodTransfusion },
    { label: 'What are the outcomes of cases using antifibrinolytics?', Icon: MedicineBottle },
    { label: 'What is the cell salvage usage by anesthesiologist?', Icon: BloodBag },
    { label: 'What are the costs and potential savings of surgical blood products?', Icon: Dollar },
  ];
  const loadPresetState = (label: string) => () => {
    // store.provenanceState.loadPresetState(label);
  };

  return (
    <Container ref={tabRef}>
      {store.provenanceState.layoutArray.length === 0 && (
        <>
          <Typography variant="h4" mt={2} sx={{ opacity: 0.4, fontStyle: 'italic' }}>
            Preset Visualizations ...
          </Typography>
          <List sx={{ width: '100%', mt: 1 }}>
            {defaultOptions.map(({ label, Icon }) => (
              <ListItemButton
                key={label}
                sx={{
                  alignItems: 'center',
                  // lift arrow
                  '&:hover .arrow-icon': {
                    transform: 'translateY(-8px)',
                    opacity: 0.7,
                  },
                  // darken the icon wrapper
                  '&:hover .item-icon': {
                    opacity: 0.7,
                  },
                  // darken the primary text
                  '&:hover .MuiListItemText-primary': {
                    opacity: 0.7,
                  },
                  mt: 1,
                }}
                onClick={loadPresetState(label)}
              >
                <ListItemIcon className="item-icon" sx={{ opacity: 0.4 }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    variant: 'h5',
                    sx: {
                      opacity: 0.4,
                      fontStyle: 'italic',
                      lineHeight: 1,
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
