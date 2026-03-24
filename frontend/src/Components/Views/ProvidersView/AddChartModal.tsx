import {
  Button,
  Modal,
  Select,
  Stack,
  Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';
import {
  AGGREGATION_OPTIONS,
  ProviderChartConfig,
  TIME_AGGREGATION_OPTIONS,
  providerXAxisOptions,
} from '../../../Types/application';
import { ProvidersStore } from '../../../Store/Store';

const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

const variableOptions = providerXAxisOptions.map((opt) => ({
  value: opt.value,
  label: opt.label.base,
}));

const timeGroupingOptions = Object.entries(TIME_AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

interface AddChartModalProps {
  providerName: string;
  providersStore: ProvidersStore;
}

/**
 * Modal for adding a new chart to the Provider view.
 * Supports two tabs: Compare to Population (histogram) and Progress over Time (line).
 */
export function AddChartModal({ providerName, providersStore }: AddChartModalProps) {
  const [isOpen, { open, close }] = useDisclosure(false);
  const [selectedAggregation, setSelectedAggregation] = useState('avg');
  const [selectedChartType, setSelectedChartType] = useState('population-histogram');
  const [selectedVar, setSelectedVar] = useState('');
  const [selectedTimeGrouping, setSelectedTimeGrouping] = useState('month');

  const openModal = useCallback(() => {
    setSelectedAggregation('avg');
    setSelectedVar('');
    setSelectedChartType('population-histogram');
    setSelectedTimeGrouping('month');
    open();
  }, [open]);

  const handleAddChart = useCallback(() => {
    const isHistogram = selectedChartType === 'population-histogram';

    const xAxisVar = isHistogram
      ? (selectedVar as ProviderChartConfig['xAxisVar'])
      : (selectedTimeGrouping as ProviderChartConfig['xAxisVar']);

    const yAxisVar = isHistogram
      ? ('attending_provider' as ProviderChartConfig['yAxisVar'])
      : (selectedVar as ProviderChartConfig['yAxisVar']);

    providersStore.addChart({
      chartId: `chart-${Date.now()}`,
      xAxisVar,
      yAxisVar,
      aggregation: selectedAggregation as ProviderChartConfig['aggregation'],
      chartType: selectedChartType as ProviderChartConfig['chartType'],
      group: 'Anemia Management',
    });

    close();
  }, [selectedAggregation, selectedVar, selectedChartType, selectedTimeGrouping, close, providersStore]);

  return {
    openModal,
    modal: (
      <Modal
        opened={isOpen}
        onClose={close}
        title={`Add chart for ${providerName}`}
        centered
      >
        <Tabs
          defaultValue="compare"
          style={{ width: '100%' }}
          onChange={(val) => setSelectedChartType(val === 'progress' ? 'time-series-line' : 'population-histogram')}
        >
          <Tabs.List grow>
            <Tabs.Tab value="compare">Compare to Population</Tabs.Tab>
            <Tabs.Tab value="progress">Progress over Time</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="compare" pt="md">
            <Stack gap="md">
              <Select
                label="Aggregation"
                placeholder="Choose aggregation type"
                data={aggregationOptions}
                value={selectedAggregation}
                onChange={(value) => setSelectedAggregation(value || 'avg')}
              />
              <Select
                label="Variable"
                placeholder="Choose Variable"
                data={variableOptions}
                value={selectedVar}
                onChange={(value) => setSelectedVar(value || '')}
              />
              <Button mt="md" onClick={handleAddChart} disabled={!selectedVar} fullWidth>
                Done
              </Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="progress" pt="md">
            <Stack gap="md">
              <Select
                label="Aggregation"
                placeholder="Choose aggregation type"
                data={aggregationOptions}
                value={selectedAggregation}
                onChange={(value) => setSelectedAggregation(value || 'avg')}
              />
              <Select
                label="Variable"
                placeholder="Choose Variable"
                data={variableOptions}
                value={selectedVar}
                onChange={(value) => setSelectedVar(value || '')}
              />
              <Select
                label="Time Grouping"
                placeholder="Month / Quarter / Year"
                data={timeGroupingOptions}
                value={selectedTimeGrouping}
                onChange={(value) => setSelectedTimeGrouping(value || 'month')}
              />
              <Button mt="md" onClick={handleAddChart} disabled={!selectedVar} fullWidth>
                Done
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    ),
  };
}
