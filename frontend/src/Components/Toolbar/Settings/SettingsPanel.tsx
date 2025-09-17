import {
  Button, Flex, LoadingOverlay, Modal, NumberInput, Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { Store } from '../../../Store/Store';

export function SettingsPanel() {
  const store = useContext(Store);

  const [openedBlood, { open: openBlood, close: closeBlood }] = useDisclosure(false);
  const [bloodLoading, setBloodLoading] = useState(false);
  const [rbcCost, setRbcCost] = useState<string | number>(store.unitCosts.rbc_units_cost);
  const [pltCost, setPltCost] = useState<string | number>(store.unitCosts.plt_units_cost);
  const [ffpCost, setFfpCost] = useState<string | number>(store.unitCosts.ffp_units_cost);
  const [cryoCost, setCryoCost] = useState<string | number>(store.unitCosts.cryo_units_cost);
  const [cellSaverCost, setCellSaverCost] = useState<string | number>(store.unitCosts.cell_saver_cost);
  // Save blood product costs to global state
  const saveCosts = useCallback((rbc: string | number, plt: string | number, ffp: string | number, cryo: string | number, cellSaver: string | number) => {
    setBloodLoading(true);
    store.unitCosts = {
      rbc_units_cost: Number(rbc),
      plt_units_cost: Number(plt),
      ffp_units_cost: Number(ffp),
      cryo_units_cost: Number(cryo),
      cell_saver_cost: Number(cellSaver),
    };
    setBloodLoading(false);
  }, [store]);

  const [openedGuideline, { open: openGuideline, close: closeGuideline }] = useDisclosure(false);

  useEffect(() => {
    setRbcCost(store.unitCosts.rbc_units_cost);
    setPltCost(store.unitCosts.plt_units_cost);
    setFfpCost(store.unitCosts.ffp_units_cost);
    setCryoCost(store.unitCosts.cryo_units_cost);
  }, [store.unitCosts, openedBlood]);

  return (
    <Stack p="md">
      <Button onClick={openBlood}>Set Blood Product Costs</Button>
      <Modal opened={openedBlood} onClose={() => closeBlood()} title="Set Blood Product Costs" centered>
        <LoadingOverlay visible={bloodLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
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
        <Flex direction="row" justify="flex-end">
          <Button mt="md" onClick={() => { saveCosts(rbcCost, pltCost, ffpCost, cryoCost, cellSaverCost); closeBlood(); }} variant="filled" color="blue">Save</Button>
        </Flex>
      </Modal>

      <Button onClick={openGuideline}>Set Guidline Adherence</Button>
      <Modal opened={openedGuideline} onClose={closeGuideline} title="Set Guideline Adherence">
        some content
      </Modal>
    </Stack>
  );
}
