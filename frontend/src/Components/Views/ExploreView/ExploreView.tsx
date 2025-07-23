import { Title } from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
  IconShieldHeart,
} from '@tabler/icons-react';

export function ExploreView() {
  // Groups of preset visualization questions with labels and icons
const presetGroups: {
  groupLabel: string;
  options: { label: string; Icon: React.FC; state: any }[];
}[] = [
  {
    groupLabel: 'Guideline Adherence',
    options: [
      { label: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: IconTestPipe2, state: '' },
      { label: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: IconTestPipe2, state: '' },
    ],
  },
  {
    groupLabel: 'Outcomes',
    options: [
      { label: 'What are the outcomes of cases using antifibrinolytics?', Icon: IconTestPipe2, state: '' },
      { label: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: IconTestPipe2, state: '' },
    ],
  },
  {
    groupLabel: 'Cost / Savings',
    options: [
      { label: 'What are the costs and potential savings for surgical blood products?', Icon: IconCoin, state: '' },
    ],
  },
];
  return <Title order={1}>Default States</Title>;
}
