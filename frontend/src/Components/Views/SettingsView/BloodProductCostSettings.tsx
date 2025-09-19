import {
  Accordion, Box, Button, Divider, Flex, LoadingOverlay, NumberInput,
} from '@mantine/core';
import {
  useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { Store } from '../../../Store/Store';
import { getIconForVar } from '../../../Utils/icons';

export function BloodProductCostSettings() {
  const store = useContext(Store);

  const [loading, setLoading] = useState(false);
  const [rbcCost, setRbcCost] = useState<string | number>(store.unitCosts.rbc_units_cost);
  const [pltCost, setPltCost] = useState<string | number>(store.unitCosts.plt_units_cost);
  const [ffpCost, setFfpCost] = useState<string | number>(store.unitCosts.ffp_units_cost);
  const [cryoCost, setCryoCost] = useState<string | number>(store.unitCosts.cryo_units_cost);
  const [cellSaverCost, setCellSaverCost] = useState<string | number>(store.unitCosts.cell_saver_cost);

  // Save blood product costs to global state
  const saveCosts = useCallback((rbc: string | number, plt: string | number, ffp: string | number, cryo: string | number, cellSaver: string | number) => {
    setLoading(true);
    store.unitCosts = {
      rbc_units_cost: Number(rbc),
      plt_units_cost: Number(plt),
      ffp_units_cost: Number(ffp),
      cryo_units_cost: Number(cryo),
      cell_saver_cost: Number(cellSaver),
    };
    setLoading(false);
  }, [store]);

  useEffect(() => {
    setRbcCost(store.unitCosts.rbc_units_cost);
    setPltCost(store.unitCosts.plt_units_cost);
    setFfpCost(store.unitCosts.ffp_units_cost);
    setCryoCost(store.unitCosts.cryo_units_cost);
  }, [store.unitCosts]);

  const dirty = useMemo(() => (
    rbcCost !== store.unitCosts.rbc_units_cost
    || pltCost !== store.unitCosts.plt_units_cost
    || ffpCost !== store.unitCosts.ffp_units_cost
    || cryoCost !== store.unitCosts.cryo_units_cost
    || cellSaverCost !== store.unitCosts.cell_saver_cost
  ), [rbcCost, pltCost, ffpCost, cryoCost, cellSaverCost, store.unitCosts]);

  const ControlIcon = getIconForVar('rbc_units');

  return (
    <Accordion.Item value="bloodProductCosts">
      <Accordion.Control icon={<ControlIcon size={16} />}>Blood Product Costs</Accordion.Control>
      <Accordion.Panel>
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Divider mb="sm" />
        <Box mx="auto" maw={1000}>
          <NumberInput
            label="Red Blood Cell Unit Cost"
            value={rbcCost}
            onChange={setRbcCost}
            decimalScale={2}
            fixedDecimalScale
            allowLeadingZeros={false}
            prefix="$"
            isAllowed={(value) => value.value.length < 12}
          />
          <NumberInput
            label="Platelet Unit Cost"
            value={pltCost}
            onChange={setPltCost}
            decimalScale={2}
            fixedDecimalScale
            allowLeadingZeros={false}
            prefix="$"
            isAllowed={(value) => value.value.length < 12}
          />
          <NumberInput
            label="Fresh Frozen Plasma Unit Cost"
            value={ffpCost}
            onChange={setFfpCost}
            decimalScale={2}
            fixedDecimalScale
            allowLeadingZeros={false}
            prefix="$"
            isAllowed={(value) => value.value.length < 12}
          />
          <NumberInput
            label="Cryoprecipitate Unit Cost"
            value={cryoCost}
            onChange={setCryoCost}
            decimalScale={2}
            fixedDecimalScale
            allowLeadingZeros={false}
            prefix="$"
            isAllowed={(value) => value.value.length < 12}
          />
          <NumberInput
            label="Cell Saver Cost"
            value={cellSaverCost}
            onChange={setCellSaverCost}
            decimalScale={2}
            fixedDecimalScale
            allowLeadingZeros={false}
            prefix="$"
            isAllowed={(value) => value.value.length < 12}
          />
          {dirty && (
          <Flex direction="row" justify="flex-end">
            <Button mt="md" onClick={() => { saveCosts(rbcCost, pltCost, ffpCost, cryoCost, cellSaverCost); }} variant="filled" color="blue">Apply</Button>
          </Flex>
          )}
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
