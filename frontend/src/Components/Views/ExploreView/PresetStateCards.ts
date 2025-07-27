import {
  IconDropletHalf2Filled, IconTestPipe2, IconVaccineBottle, IconRecycle, IconCoin, IconProps,
} from '@tabler/icons-react';

export type PresetOption = { question: string; Icon: React.ComponentType<IconProps>; state: string };
export type PresetGroup = { groupLabel: string; options: PresetOption[] };

export const presetStateCards: PresetGroup[] = [
  {
    groupLabel: 'Guideline Adherence',
    options: [
      { question: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: IconDropletHalf2Filled, state: '' },
      { question: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: IconTestPipe2, state: '' },
    ],
  },
  {
    groupLabel: 'Outcomes',
    options: [
      { question: 'What are the outcomes of cases using antifibrinolytics?', Icon: IconVaccineBottle, state: '' },
      { question: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: IconRecycle, state: '' },
    ],
  },
  {
    groupLabel: 'Cost / Savings',
    options: [
      { question: 'What are the costs and potential savings for surgical blood products?', Icon: IconCoin, state: '' },
    ],
  },
];
