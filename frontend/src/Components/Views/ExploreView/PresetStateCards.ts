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
        chartConfigs: [],
        chartLayouts: {
          main: [],
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
        // Scatter plot config: sum of cell_saver_ml by month
        chartConfigs: [{
          chartId: 'sum_post_op_hgb_cell_saver_ml',
          yAxisVar: 'post_op_hgb',
          xAxisVar: 'cell_saver_ml',
          aggregation: 'sum',
          chartType: 'scatterChart',
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
