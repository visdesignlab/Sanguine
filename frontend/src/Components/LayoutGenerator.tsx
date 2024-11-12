import { observer } from 'mobx-react';
import {
  useContext, useRef, useLayoutEffect,
} from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Container, Typography } from '@mui/material';
import Store from '../Interfaces/Store';
import { LayoutElement } from '../Interfaces/Types/LayoutTypes';
import WrapperCostBar from './Charts/CostBarChart';
import WrapperDumbbell from './Charts/DumbbellChart/WrapperDumbbell';
import WrapperHeatMap from './Charts/HeatMap/WrapperHeatMap';
import WrapperScatter from './Charts/ScatterPlot/WrapperScatter';
import { isAggregation, isBloodComponent, isHemoOption } from '../Presets/DataDict';

function LayoutGenerator() {
  const store = useContext(Store);

  const createElement = (layout: LayoutElement) => {
    switch (layout.plotType) {
      case 'DUMBBELL':
        if (isAggregation(layout.xAxisVar) || isBloodComponent(layout.xAxisVar)) {
          return (
            <div key={layout.i} className={`parent-node${layout.i}`}>
              <WrapperDumbbell
                layoutW={layout.w}
                chartId={layout.i}
                layoutH={layout.h}
                xAxisVar={layout.xAxisVar}
                annotationText={layout.notation}
              />
            </div>
          );
        }
        throw new Error('Invalid dumbbell chart variable');

      case 'SCATTER':
        if (isBloodComponent(layout.xAxisVar) && isHemoOption(layout.yAxisVar)) {
          return (
            <div
              key={layout.i}
              className={`parent-node${layout.i}`}
            >
              <WrapperScatter
                xAxisVar={layout.xAxisVar}
                layoutW={layout.w}
                yAxisVar={layout.yAxisVar}
                layoutH={layout.h}
                chartId={layout.i}
                annotationText={layout.notation}
              />
            </div>
          );
        }
        throw new Error('Invalid scatter chart variable');

      case 'HEATMAP':
        if (isBloodComponent(layout.xAxisVar) && isAggregation(layout.yAxisVar)) {
          return (
            <div
              key={layout.i}
              className={`parent-node${layout.i}`}
            >
              <WrapperHeatMap
                annotationText={layout.notation}
                chartId={layout.i}
                layoutW={layout.w}
                layoutH={layout.h}
                extraPairArrayString={layout.extraPair || ''}
                xAxisVar={layout.xAxisVar}
                yAxisVar={layout.yAxisVar}
                comparisonDate={layout.outcomeComparison ? undefined : layout.interventionDate}
                outcomeComparison={layout.outcomeComparison}
              />
            </div>
          );
        }
        throw new Error('Invalid heatmap chart variable');

      case 'COST':
        if (isAggregation(layout.yAxisVar)) {
          return (
            <div
              key={layout.i}
              className={`parent-node${layout.i}`}
            >
              <WrapperCostBar
                extraPairArrayString={layout.extraPair || ''}
                layoutW={layout.w}
                layoutH={layout.h}
                yAxisVar={layout.yAxisVar}
                chartId={layout.i}
                comparisonOption={layout.outcomeComparison}
                annotationText={layout.notation}
              />
            </div>
          );
        }
        throw new Error('Invalid cost chart variable');

      default:
        return null;
    }
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

  return (
    <Container ref={tabRef}>
      {store.provenanceState.layoutArray.length === 0 && (
        <Typography variant="h4" mt={2} sx={{ opacity: 0.4 }}>Click &quot;Add Chart&quot; above to visualize transfusion data.</Typography>
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
