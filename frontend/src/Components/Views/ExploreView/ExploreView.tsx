import {
  Title, Card, Group, Box, Text, Stack, ActionIcon,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
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
  return (
    <Stack>
      {presetGroups.map(({ groupLabel, options }) => (
        <Box key={groupLabel}>
          <Title order={2} mb="md">{groupLabel}</Title>
          <Stack>
            {options.map(({ label, Icon }) => (
              <Card
                key={label}
                shadow="md"
                radius="md"
                p="lg"
                withBorder
                style={{ width: '100%', minHeight: 80 }}
              >
                <Group justify="space-between" align="center">
                  <Group>
                    <Box mr="md">
                      <Icon size={10} />
                    </Box>
                    <Text size="lg">{label}</Text>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    style={{
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                    }}
                  >
                    <IconArrowUpRight size={28} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
