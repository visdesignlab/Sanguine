import { observer } from 'mobx-react';
import {
  useContext, useRef, useLayoutEffect,
  useState,
} from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Container, Tab, Tabs, Typography } from '@mui/material';
import Store from '../Interfaces/Store';
import { LayoutElement } from '../Interfaces/Types/LayoutTypes';
import WrapperCostBar from './Charts/CostBarChart';
import WrapperDumbbell from './Charts/DumbbellChart/WrapperDumbbell';
import WrapperHeatMap from './Charts/HeatMap/WrapperHeatMap';
import WrapperScatter from './Charts/ScatterPlot/WrapperScatter';
import HospitalDashboard from './Dashboards/HospitalDashboard';

function LayoutGenerator() {
  const store = useContext(Store);
  const [tabValue, setTabValue] = useState(0);
  const handleChange = (_: unknown, newValue: number) => {
    setTabValue(newValue);
  };

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

  const tabLabelStyle = {
    typography: 'h5',
    mt: 2,
    opacity: 1,
    textTransform: 'none',
  };

  return (
    <Container ref={tabRef}>
      {store.provenanceState.layoutArray.length === 0 && (
        <>
          <Tabs
            value={tabValue}
            onChange={handleChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Hospital" sx={tabLabelStyle} />
            <Tab label="Departments" sx={tabLabelStyle} />
            <Tab label="Providers" sx={tabLabelStyle} />
            <Tab label="Explore" sx={tabLabelStyle} />
          </Tabs>
          {/* render dashboard when Hospital tab is selected */}
          {tabValue === 0 && <HospitalDashboard />}
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
