import {
  IconDropletHalf2Filled, IconTestPipe2, IconVaccineBottle, IconRecycle, IconCoin, IconProps,
  IconReportSearch,
} from '@tabler/icons-react';
import { Layout } from 'react-grid-layout';
import { DepartmentChartConfig, DepartmentStatConfig } from '../../../Types/application';

export type PresetOption = {
  question: string;
  Icon: React.ComponentType<IconProps>;
  chartConfigs: DepartmentChartConfig[];
  chartLayouts: { [key: string]: Layout[] };
  statConfigs?: DepartmentStatConfig[];
};
export type PresetGroup = { groupLabel: string; options: PresetOption[] };

export const presetStateCards: PresetGroup[] = [
  {
    groupLabel: 'Overview',
    options: [
      {
        question: 'How many blood products were transfused in [department]?',
        Icon: IconReportSearch,
        chartConfigs: [
          {
            chartId: 'preset-overview-department',
            title: 'Blood Product Utilization per Provider',
            chartType: 'departmentTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'attending_provider',
                aggregation: 'none',
                type: 'text',
                title: 'Provider',
              },
              {
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
              },
              {
                colVar: 'cases',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Cases',
              },
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
              {
                colVar: 'death',
                aggregation: 'avg',
                type: 'numeric',
                title: 'Deaths',
              },
              {
                colVar: 'cryo_units',
                aggregation: 'avg',
                type: 'numeric',
                title: 'Cryo',
              },
              {
                colVar: 'plt_units',
                aggregation: 'avg',
                type: 'numeric',
                title: 'Platelets',
              },
              {
                colVar: 'ffp_units',
                aggregation: 'avg',
                type: 'numeric',
                title: 'FFP',
              },
              {
                colVar: 'whole_units',
                aggregation: 'avg',
                type: 'numeric',
                title: 'Whole Blood',
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-overview-department',
              x: 0,
              y: 0,
              w: 4,
              h: 60,
            },
          ],
        },
        statConfigs: [
          {
            statId: 'preset-stat-rbc-avg',
            yAxisVar: 'rbc_units',
            aggregation: 'avg',
            title: 'Average RBCs Transfused Per Visit',
          },
          {
            statId: 'preset-stat-cell-saver-sum',
            yAxisVar: 'cell_saver_ml',
            aggregation: 'sum',
            title: 'Total Cell Salvage Volume (ml) Used',
          },
          {
            statId: 'preset-stat-plt-adherent',
            yAxisVar: 'plt_units_adherent',
            aggregation: 'avg',
            title: 'Percentage of Platelet Units Transfused According to Guidelines',
          },
        ],
      },
    ],
  },
  {
    groupLabel: 'Guideline Adherence',
    options: [
      {
        question: 'How common is preoperative anemia in patients undergoing elective surgery?',
        Icon: IconDropletHalf2Filled,
        // Add a DepartmentTable chart config so clicking this preset opens the DepartmentTable.
        chartConfigs: [
          {
            chartId: 'preset-department-table-preop-anemia',
            title: 'RBC Transfusions per Provider',
            chartType: 'departmentTable',
            rowVar: 'attending_provider',
            columns: [
              {
                colVar: 'death',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Deaths',
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
                title: 'Provider',
              },
              {
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
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
              },
            ],
            twoValsPerRow: false,
            sort: { colVar: 'percent_above_5_rbc', direction: 'desc' },
          },
          {
            chartId: 'preset-scatter-prevent-anemia',
            chartType: 'scatterPlot',
            xAxisVar: 'rbc_units',
            yAxisVar: 'pre_hgb',
            aggregation: 'none',
          },
        ],
        chartLayouts: {
          main: [
            {
              i: 'preset-department-table-preop-anemia',
              x: 0,
              y: 0,
              w: 4,
              h: 45,
            },
            {
              i: 'preset-scatter-prevent-anemia',
              x: 0,
              y: 45,
              w: 4,
              h: 60,
            },
          ],
        },
      },
      {
        question: 'What is the postoperative hemoglobin value among patients transfused during surgery?',
        Icon: IconTestPipe2,
        chartConfigs: [
          {
            chartId: 'preset-dumbbell-hgb',
            chartType: 'dumbbell',
            xAxisVar: 'surgeon',
            yAxisVar: 'hgb',
            aggregation: 'none',
          },
          {
            chartId: 'preset-department-table-hgb',
            title: 'Transfusions per Provider',
            chartType: 'departmentTable',
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
                title: 'Provider',
              },
              {
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
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
              h: 75,
            },
            {
              i: 'preset-department-table-hgb',
              x: 0,
              y: 75,
              w: 4,
              h: 60,
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
        question: 'How often are antifibrinolytic agents used and what is the impact on outcomes?',
        Icon: IconVaccineBottle,
        chartConfigs: [
          {
            chartId: 'preset-department-table-antifib',
            title: 'Antifibrinolytic Usage & Outcomes per Provider',
            chartType: 'departmentTable',
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
                title: 'Provider',
              },
              {
                colVar: 'death',
                aggregation: 'avg',
                type: 'heatmap',
                title: 'Death',
              },
              {
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
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
              i: 'preset-department-table-antifib',
              x: 0,
              y: 0,
              w: 4,
              h: 60,
            },
          ],
        },
      },
      {
        question: 'How often do patients undergoing surgery receive 1+ allogeneic RBC transfusion but no cell salvage?',
        Icon: IconRecycle,
        chartConfigs: [
          {
            chartId: 'preset-department-table-cell-salvage',
            title: 'Cell Salvage per Anesthesiologist',
            chartType: 'departmentTable',
            rowVar: 'anesth_prov_id',
            columns: [
              {
                colVar: 'drg_weight',
                aggregation: 'none',
                type: 'violin',
                title: 'DRG Weight',
              },
              {
                colVar: 'anesth_prov_id',
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
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
              },
              {
                colVar: 'cases',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Cases',
              },
            ],
            twoValsPerRow: false,
          },
        ],
        chartLayouts: {
          main: [{
            i: 'preset-department-table-cell-salvage',
            x: 0,
            y: 0,
            w: 4,
            h: 60,
          }],
        },
      },
    ],
  },
  {
    groupLabel: 'Cost / Savings',
    options: [
      {
        question: 'What are the costs of blood products transfused intraoperatively by provider?',
        Icon: IconCoin,
        chartConfigs: [
          {
            chartId: 'preset-cost-savings-table',
            title: 'Intraoperative Blood Product Costs per Provider',
            chartType: 'departmentTable',
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
                title: 'Provider',
              },
              {
                colVar: 'visit_count',
                aggregation: 'sum',
                type: 'numeric',
                title: 'Visits',
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
              h: 60,
            },
          ],
        },
      },
    ],
  },
];
