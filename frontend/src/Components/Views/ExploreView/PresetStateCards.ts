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
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
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
          {
            chartId: 'preset-scatter-prevent-anemia',
            chartType: 'scatterPlot',
            xAxisVar: 'rbc_units',
            yAxisVar: 'post_op_hgb',
            aggregation: 'sum',
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-explore-table-preop-anemia',
              x: 0,
              y: 0,
              w: 4,
              h: 3,
            },
            {
              i: 'preset-scatter-prevent-anemia',
              x: 0,
              y: 3,
              w: 4,
              h: 3,
            },
          ],
        },
      },
      {
        question: 'What were the pre-op and post-op HGB levels of cases per surgeon?',
        Icon: IconTestPipe2,
        chartConfigs: [
          {
            chartId: 'preset-dumbbell-hgb',
            chartType: 'dumbbell',
            xAxisVar: 'provider_visit',
            yAxisVar: 'hgb',
            aggregation: 'none',
          },
          {
            chartId: 'preset-explore-table-hgb',
            title: 'RBC Transfusions per Surgeon',
            chartType: 'exploreTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
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
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-dumbbell-hgb',
              x: 0,
              y: 0,
              w: 4,
              h: 4,
            },
            {
              i: 'preset-explore-table-hgb',
              x: 0,
              y: 4,
              w: 4,
              h: 4,
            },
          ],
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
        chartConfigs: [
          {
            chartId: 'preset-explore-table-antifib',
            title: 'Outcomes per Surgeon (Antifibrinolytics)',
            chartType: 'exploreTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'antifibrinolytic',
                aggregation: 'avg',
                type: 'numeric',
                title: 'Antifibrinolytics Used Pre-Surgery',
              },
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
              {
                colVar: 'attending_provider',
                aggregation: 'none',
                type: 'text',
                title: 'Surgeon',
              },
              {
                colVar: 'death',
                aggregation: 'avg',
                type: 'heatmap',
                title: 'Death',
              },
              {
                colVar: 'cases',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Cases',
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
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-explore-table-antifib',
              x: 0,
              y: 0,
              w: 4,
              h: 4,
            },
          ],
        },
      },
      {
        question: 'What are the outcomes of using cell salvage, for each anesthesiologist?',
        Icon: IconRecycle,
        chartConfigs: [
          {
            chartId: 'preset-explore-table-cell-salvage',
            title: 'Outcomes per Provider (Cell Salvage)',
            chartType: 'exploreTable',
            rowVar: 'anesth_prov_id',
            columns: [
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
              {
                colVar: 'surgeon_prov_id',
                aggregation: 'none',
                type: 'text',
                title: 'Anesthesiologist',
              },
              {
                colVar: 'cell_saver_ml',
                aggregation: 'avg',
                type: 'heatmap',
                title: 'Cell Salvage (mL)',
              },
              {
                colVar: 'cases',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Cases',
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
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [{
            i: 'preset-explore-table-cell-salvage',
            x: 0,
            y: 0,
            w: 4,
            h: 4,
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
        chartConfigs: [
          {
            chartId: 'preset-cost-savings-table',
            title: 'Cost Savings Analysis',
            chartType: 'exploreTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
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
                colVar: 'total_cost',
                aggregation: 'avg',
                type: 'stackedBar',
                title: 'Average Cost per Visit',
              },
              {
                colVar: 'salvage_savings',
                aggregation: 'sum',
                type: 'numericBar',
                title: 'Savings from Cell Salvage',
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-cost-savings-table',
              x: 0,
              y: 0,
              w: 12,
              h: 4,
            },
          ],
        },
      },
    ],
  },
];
