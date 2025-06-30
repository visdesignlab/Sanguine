/** @jsxImportSource @emotion/react */
import {
  Box, Button, ButtonGroup, Grid,
} from '@mui/material';
import { observer } from 'mobx-react';
import {
  useContext, useRef, useState,
} from 'react';
import { css } from '@emotion/react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import styled from '@emotion/styled';
import { bloodComponentOutlierHandler } from '../../../HelperFunctions/CaseListProducer';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import {
  basicGray, postopColor, preopColor, hgbPreOpTargetRange, hgbPostOpTargetRange,
} from '../../../Presets/Constants';
import DumbbellChart from './DumbbellChart';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import { TargetRangeInput } from '../ChartAccessories/TargetRangeInput';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv, ChartWrapperContainer } from '../../../Presets/StyledComponents';
import { DumbbellLayoutElement } from '../../../Interfaces/Types/LayoutTypes';
import useComponentSize from '../../Hooks/UseComponentSize';

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
  padding: '2px',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
});

function WrapperDumbbell({ layout }: { layout: DumbbellLayoutElement }) {
  const {
    xAxisVar, i: chartId, annotationText,
  } = layout;

  const store = useContext(Store);
  const { filteredCases } = store;
  const { proceduresSelection, showZero, rawDateRange } = store.provenanceState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [xMin, setXMin] = useState(Infinity);
  const [xMax, setXMax] = useState(0);
  const yRangePadding = 1;
  const [sortMode, setSortMode] = useState<'preop' | 'postop' | 'gap'>('postop');
  const [showPreop, setShowPreop] = useState(true);
  const [showPostop, setShowPostop] = useState(true);
  const [data, setData] = useState<DumbbellDataPoint[]>([]);

  // Pre-op & post-op hemoglobin target range
  const [hgbPreTargetRange, setHgbPreTargetRange] = useState<(number)[]>(hgbPreOpTargetRange);
  const [hgbPostTargetRange, setHgbPostTargetRange] = useState<(number)[]>(hgbPostOpTargetRange);

  const size = useComponentSize(svgRef);

  useDeepCompareEffect(() => {
    let caseCount = 0;
    let tempXMin = Infinity;
    let tempXMax = 0;
    const existingCaseID = new Set();
    const dataOutput: (DumbbellDataPoint | undefined)[] = filteredCases.map((ob) => {
      const preopHgb = ob.PREOP_HEMO;
      const postopHgb = ob.POSTOP_HEMO;
      let yAxisVal;
      yAxisVal = ob[xAxisVar] as number;
      if (yAxisVal !== undefined && preopHgb > 0 && postopHgb > 0 && !existingCaseID.has(ob.CASE_ID)) {
        if ((showZero) || (!showZero && yAxisVal > 0)) {
          yAxisVal = bloodComponentOutlierHandler(yAxisVal, xAxisVar);
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

    // Set Min and Max Ranges
    setXMin(tempXMin - yRangePadding);
    setXMax(tempXMax + yRangePadding);
    setHgbPreTargetRange([hgbPreOpTargetRange[0], tempXMax + yRangePadding]);
  }, [rawDateRange, proceduresSelection, filteredCases, xAxisVar, showZero]);

  return (
    <Grid container direction="row" alignItems="center" height="100%">
      <Grid
        item
        xs={1}
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <DumbbellUtilTitle>Sort By</DumbbellUtilTitle>
        <ButtonGroup
          variant="outlined"
          size="small"
          aria-label="small outlined button group"
          orientation="vertical"
          minHeight={75}
        >
          {showPreop && (
            <Button
              css={sortMode === 'preop' ? ButtonStyles.preopButtonActive : ButtonStyles.preopButtonOutline}
              onClick={() => { setSortMode('preop'); }}
            >
              Preop
            </Button>
          )}
          {showPostop && (
            <Button
              css={sortMode === 'postop' ? ButtonStyles.postopButtonActive : ButtonStyles.postopButtonOutline}
              onClick={() => { setSortMode('postop'); }}
            >
              Postop
            </Button>
          )}
          {showPreop && showPostop && (
            <Button
              css={sortMode === 'gap' ? ButtonStyles.gapButtonActive : ButtonStyles.gapButtonOutline}
              onClick={() => { setSortMode('gap'); }}
            >
              Gap
            </Button>
          )}
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
        </ButtonGroup>
        <DumbbellUtilTitle style={{ marginTop: '8px' }}>Pre-op target</DumbbellUtilTitle>
        <Box display="flex" gap={0.5} mt={0.5}>
          <TargetRangeInput
            targetRange={hgbPreTargetRange}
            setTargetRange={setHgbPreTargetRange}
            xMin={xMin}
            xMax={xMax}
          />
        </Box>

        <DumbbellUtilTitle style={{ marginTop: '4px', textAlign: 'center' }}>
          Post-op target
          <br />
          Transfused
        </DumbbellUtilTitle>
        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
          <TargetRangeInput
            targetRange={hgbPostTargetRange}
            setTargetRange={setHgbPostTargetRange}
            xMin={xMin}
            xMax={xMax}
          />
        </Box>
      </Grid>
      <Grid item xs={11} style={{ height: '100%' }}>
        <ChartWrapperContainer>
          <ChartAccessoryDiv>
            Dumbbell Chart
            <ChartConfigMenu layout={layout} />
            <ChartStandardButtons chartID={chartId} />
          </ChartAccessoryDiv>
          <Box style={{ height: 'calc(100% - 100px)', overflow: 'auto' }}>
            <svg ref={svgRef} style={{ height: 'calc(100% - 10px)' }}>
              <DumbbellChart
                data={data}
                svg={svgRef}
                showPostop={showPostop}
                showPreop={showPreop}
                sortMode={sortMode}
                xAxisVar={xAxisVar}
                dimensionWidth={size.width}
                dimensionHeight={size.height}
                xMin={xMin}
                xMax={xMax}
                hgbPreOpTargetRange={hgbPreTargetRange}
                hgbPostOpTargetRange={hgbPostTargetRange}
              />
            </svg>
          </Box>
          <AnnotationForm chartI={chartId} annotationText={annotationText} />
        </ChartWrapperContainer>
      </Grid>
    </Grid>
  );
}

export default observer(WrapperDumbbell);
