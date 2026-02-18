import {
  IconDropletHalf2Filled, IconTestPipe2, IconVaccineBottle, IconRecycle, IconCoin, IconProps,
} from '@tabler/icons-react';
import { Layout } from 'react-grid-layout';
import { ExploreChartConfig } from '../../../Types/application';

export type PresetOption = {
  question: string;
  Icon: React.ComponentType<IconProps>;
  chartConfigs: ExploreChartConfig[];
  chartLayouts: { [key: string]: Layout[] };
};
export type PresetGroup = { groupLabel: string; options: PresetOption[] };

export const presetStateCards: PresetGroup[] = [
  {
    groupLabel: 'Guideline Adherence',
    options: [
      {
        question: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?',
        Icon: IconDropletHalf2Filled,
        // Add a ExploreTable chart config so clicking this preset opens the ExploreTable.
        chartConfigs: [
          {
            chartId: 'preset-explore-table-preop-anemia',
            title: 'RBC Transfusions per Surgeon',
            chartType: 'exploreTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'attending_provider',
                aggregation: 'none',
                type: 'text',
                title: 'Surgeon',
              },
              {
                colVar: 'cases',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Cases',
              },
              {
                colVar: 'percent_0_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '0 RBC',
              },
              {
                colVar: 'percent_1_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '1 RBC',
              },
              {
                colVar: 'percent_2_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '2 RBC',
              },
              {
                colVar: 'percent_3_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '3 RBC',
              },
              {
                colVar: 'percent_4_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '4 RBC',
              },
              {
                colVar: 'percent_above_5_rbc',
                aggregation: 'avg',
                type: 'heatmap',
                title: '≥5 RBC',
              }],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-explore-table-preop-anemia',
              x: 0,
              y: 0,
              w: 1,
              h: 1,
            },
          ],
        },
      },
      {
        question: 'What were the pre-op and post-op HGB levels of cases per surgeon?',
        Icon: IconTestPipe2,
        chartConfigs: [],
        chartLayouts: {
          main: [],
        },
      },
    ],
  },
  {
    groupLabel: 'Outcomes',
    options: [
      {
        question: 'What are the outcomes of cases using antifibrinolytics?',
        Icon: IconVaccineBottle,
        chartConfigs: [],
        chartLayouts: {
          main: [],
        },
      },
      {
        question: 'What are the outcomes of using cell salvage, for each anesthesiologist?',
        Icon: IconRecycle,
        chartConfigs: [{
          chartId: '0',
          yAxisVar: 'post_op_hgb',
          xAxisVar: 'cell_saver_ml',
          aggregation: 'sum',
          chartType: 'scatterPlot',
        }],
        chartLayouts: {
          main: [{
            i: '0',
            x: 0,
            y: 0,
            w: 2,
            h: 2,
          }],
        },
      },
    ],
  },
  {
    groupLabel: 'Cost / Savings',
    options: [
      {
        question: 'What are the costs and potential savings for surgical blood products?',
        Icon: IconCoin,
        chartConfigs: [{
          chartId: '0',
          yAxisVar: 'surgeon_prov_id',
          xAxisVar: 'cost',
          aggregation: 'sum',
          chartType: 'cost',
        }],
        chartLayouts: {
          main: [{
            i: '0',
            x: 0,
            y: 0,
            w: 2,
            h: 2,
          }],
        },
      },
    ],
  },
];
