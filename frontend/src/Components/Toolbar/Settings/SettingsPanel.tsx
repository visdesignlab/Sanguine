import {
  Button, Flex, LoadingOverlay, Modal, NumberInput, Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useContext, useState } from 'react';
import { Store } from '../../../Store/Store';

export function SettingsPanel() {
  const store = useContext(Store);

  const [openedBlood, { open: openBlood, close: closeBlood }] = useDisclosure(false);
  const [bloodLoading, setBloodLoading] = useState(false);
  const [rbcCost, setRbcCost] = useState<string | number>(store.unitCosts.rbc_units_cost);
  const [pltCost, setPltCost] = useState<string | number>(store.unitCosts.plt_units_cost);
  const [ffpCost, setFfpCost] = useState<string | number>(store.unitCosts.ffp_units_cost);
  const [cryoCost, setCryoCost] = useState<string | number>(store.unitCosts.cryo_units_cost);
  // Save blood product costs to global state
  const saveCosts = useCallback((rbc: string | number, plt: string | number, ffp: string | number, cryo: string | number) => {
    setBloodLoading(true);
    store.unitCosts.rbc_units_cost = Number(rbc);
    store.unitCosts.plt_units_cost = Number(plt);
    store.unitCosts.ffp_units_cost = Number(ffp);
    store.unitCosts.cryo_units_cost = Number(cryo);
    setBloodLoading(false);
  }, [store.unitCosts]);

  const [openedGuideline, { open: openGuideline, close: closeGuideline }] = useDisclosure(false);

  return (
    <Stack p="md">
      <Button onClick={openBlood}>Set Blood Product Costs</Button>
      <Modal opened={openedBlood} onClose={() => closeBlood()} title="Set Blood Product Costs" centered>
        <LoadingOverlay visible={bloodLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
        <NumberInput
          label="Red Blood Cell Unit Cost"
          value={rbcCost}
          onChange={setRbcCost}
        />
        <NumberInput
          label="Platelet Unit Cost"
          value={pltCost}
          onChange={setPltCost}
        />
        <NumberInput
          label="Fresh Frozen Plasma Unit Cost"
          value={ffpCost}
          onChange={setFfpCost}
        />
        <NumberInput
          label="Cryoprecipitate Unit Cost"
          value={cryoCost}
          onChange={setCryoCost}
        />
        <Flex direction="row" justify="flex-end">
          <Button mt="md" onClick={() => { saveCosts(rbcCost, pltCost, ffpCost, cryoCost); closeBlood(); }} variant="filled" color="blue">Save</Button>
        </Flex>
      </Modal>

      <Button onClick={openGuideline}>Set Guidline Adherence</Button>
      <Modal opened={openedGuideline} onClose={closeGuideline} title="Set Guideline Adherence">
        some content
      </Modal>
    </Stack>
  );
}
