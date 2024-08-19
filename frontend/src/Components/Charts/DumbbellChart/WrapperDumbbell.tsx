/** @jsxImportSource @emotion/react */
import { Button, ButtonGroup, Grid } from '@mui/material';
import { observer } from 'mobx-react';
import {
  useContext, useLayoutEffect, useRef, useState,
} from 'react';
import { css } from '@emotion/react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import styled from '@emotion/styled';
import { bloodComponentOutlierHandler } from '../../../HelperFunctions/CaseListProducer';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import { basicGray, postopColor, preopColor } from '../../../Presets/Constants';
import DumbbellChart from './DumbbellChart';
import { ChartSVG } from '../../../Presets/StyledSVGComponents';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv, ChartWrapperContainer } from '../../../Presets/StyledComponents';
import { AcronymDictionary } from '../../../Presets/DataDict';

const ButtonStyles = {
  preopButtonActive: css({
    fontSize: 'xx-small!important',
    backgroundColor: preopColor,
    color: 'white',
    '&:hover': {
      backgroundColor: '#2acc74',
    },
  }),
  postopButtonActive: css({
    fontSize: 'xx-small!important',
    backgroundColor: postopColor,
    color: 'white',
    '&:hover': {
      backgroundColor: '#2a82cc',
    },
  }),
  gapButtonActive: css({
    fontSize: 'xx-small!important',
    backgroundColor: basicGray,
    color: 'white',
    '&:hover': {
      backgroundColor: '#7b7b7b',
    },
  }),
  preopButtonOutline: css({
    fontSize: 'xx-small!important',
    color: preopColor,
    backgroundColor: 'white',
  }),
  postopButtonOutline: css({
    fontSize: 'xx-small!important',
    color: postopColor,
    backgroundColor: 'white',
  }),
  gapButtonOutline: css({
    fontSize: 'xx-small!important',
    color: basicGray,
    backgroundColor: 'white',
  }),
};

const DumbbellUtilTitle = styled.div({
  width: 'max-content',
  padding: '2px',
  fontSize: '0.8rem',
});

type Props = {
    xAggregationOption: keyof typeof AcronymDictionary;
    chartId: string;
    layoutH: number;
    layoutW: number;
    annotationText: string;
};

function WrapperDumbbell({
  annotationText, xAggregationOption, chartId, layoutH, layoutW,
}: Props) {
  const store = useContext(Store);
  const { filteredCases } = store;
  const { proceduresSelection, showZero, rawDateRange } = store.provenanceState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [xMin, setXMin] = useState(Infinity);
  const [xMax, setXMax] = useState(0);
  const [sortMode, setSortMode] = useState('Postop');
  const [showPreop, setShowPreop] = useState(true);
  const [showGap, setShowGap] = useState(true);
  const [showPostop, setShowPostop] = useState(true);
  const [data, setData] = useState<DumbbellDataPoint[]>([]);

  useLayoutEffect(() => {
    if (svgRef.current) {
      setWidth(svgRef.current.clientWidth);
      // setWidth(w === 1 ? 542.28 : 1146.97)
      setHeight(svgRef.current.clientHeight);
    }
  }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

  useDeepCompareEffect(() => {
    let caseCount = 0;
    let tempXMin = Infinity;
    let tempXMax = 0;
    const existingCaseID = new Set();
    const dataOutput: (DumbbellDataPoint | undefined)[] = filteredCases.map((ob) => {
      const preopHgb = ob.PREOP_HEMO;
      const postopHgb = ob.POSTOP_HEMO;
      let yAxisVal;
      yAxisVal = ob[xAggregationOption] as number;
      if (yAxisVal !== undefined && preopHgb > 0 && postopHgb > 0 && !existingCaseID.has(ob.CASE_ID)) {
        if ((showZero) || (!showZero && yAxisVal > 0)) {
          yAxisVal = bloodComponentOutlierHandler(yAxisVal, xAggregationOption);
          tempXMin = preopHgb < tempXMin ? preopHgb : tempXMin;
          tempXMin = postopHgb < tempXMin ? postopHgb : tempXMin;
          tempXMax = preopHgb > tempXMax ? preopHgb : tempXMax;
          tempXMax = postopHgb > tempXMax ? postopHgb : tempXMax;
          existingCaseID.add(ob.CASE_ID);
          caseCount += 1;
          const newOb: DumbbellDataPoint = {
            case: ob,
            startXVal: preopHgb,
            endXVal: postopHgb,
            yVal: yAxisVal,
          };
          return newOb;
        }
      }
      return undefined;
    });
    const filteredDataOutput = (dataOutput.filter((d) => d)) as DumbbellDataPoint[];
    store.chartStore.totalIndividualCaseCount = caseCount;
    stateUpdateWrapperUseJSON(data, filteredDataOutput, setData);
    setXMin(tempXMin);
    setXMax(tempXMax);
  }, [rawDateRange, proceduresSelection, filteredCases, xAggregationOption, showZero]);

  return (
    <Grid container direction="row" alignItems="center" style={{ height: '100%' }}>
      <Grid item xs={1}>
        <DumbbellUtilTitle>Sort By</DumbbellUtilTitle>
        <ButtonGroup
          variant="outlined"
          size="small"
          aria-label="small outlined button group"
          orientation="vertical"
        >
          <Button
            css={sortMode === 'Preop' ? ButtonStyles.preopButtonActive : ButtonStyles.preopButtonOutline}
            onClick={() => { setSortMode('Preop'); }}
          >
            Preop
          </Button>
          <Button
            css={sortMode === 'Postop' ? ButtonStyles.postopButtonActive : ButtonStyles.postopButtonOutline}
            onClick={() => { setSortMode('Postop'); }}
          >
            Postop
          </Button>
          <Button
            css={sortMode === 'Gap' ? ButtonStyles.gapButtonActive : ButtonStyles.gapButtonOutline}
            onClick={() => { setSortMode('Gap'); }}
          >
            Gap
          </Button>
        </ButtonGroup>
        <DumbbellUtilTitle>Show</DumbbellUtilTitle>
        <ButtonGroup size="small" orientation="vertical">
          <Button
            css={showPreop ? ButtonStyles.preopButtonActive : ButtonStyles.preopButtonOutline}
            onClick={() => { setShowPreop(!showPreop); }}
          >
            Preop
          </Button>
          <Button
            css={showPostop ? ButtonStyles.postopButtonActive : ButtonStyles.postopButtonOutline}
            onClick={() => { setShowPostop(!showPostop); }}
          >
            Postop
          </Button>
          <Button
            css={showGap ? ButtonStyles.gapButtonActive : ButtonStyles.gapButtonOutline}
            onClick={() => { setShowGap(!showGap); }}
          >
            Gap
          </Button>
        </ButtonGroup>

      </Grid>
      <Grid item xs={11} style={{ height: '100%' }}>
        <ChartWrapperContainer>
          <ChartAccessoryDiv>
            Dumbbell Chart
            <ChartConfigMenu
              xAggregationOption={xAggregationOption}
              yValueOption={'HGB_VALUE' as never}
              chartTypeIndexinArray={1}
              chartId={chartId}
              requireOutcome={false}
              requireSecondary={false}
            />
            <ChartStandardButtons chartID={chartId} />
          </ChartAccessoryDiv>
          <ChartSVG ref={svgRef}>
            <DumbbellChart data={data} svg={svgRef} showGap={showGap} showPostop={showPostop} showPreop={showPreop} sortMode={sortMode} valueToVisualize={xAggregationOption} dimensionWidth={width} dimensionHeight={height} xMin={xMin} xMax={xMax} />

          </ChartSVG>
          <AnnotationForm chartI={chartId} annotationText={annotationText} />
        </ChartWrapperContainer>
      </Grid>
    </Grid>
  );
}

export default observer(WrapperDumbbell);
