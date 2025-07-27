import { IconCoin, IconTestPipe2, IconShieldHeart } from '@tabler/icons-react';

export const icons = {
  coin: IconCoin,
  tube: IconTestPipe2,
  shield: IconShieldHeart,
};

export const stats = [
  {
    title: 'Estimated Savings', icon: 'coin', value: '$13,456', diff: 34,
  },
  {
    title: 'Guideline Adherence', icon: 'tube', value: '85%', diff: 18,
  },
  {
    title: 'AVG Length of Stay', icon: 'shield', value: '10 days', diff: -30,
  },
] as const;
