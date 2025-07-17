import {
  Modal, Text, Title, Group, Loader, Stack,
} from '@mantine/core';
import { observer } from 'mobx-react';

function DataRetrievalModal({ dataLoading, dataLoadingFailed }: { dataLoading: boolean; dataLoadingFailed: boolean; }) {
  return (
    <Modal
      opened={dataLoading || dataLoadingFailed}
      onClose={() => {}} // Prevent closing
      withCloseButton={false}
      centered
      size="md"
    >
      {/* Data loading modal, pass or fails */}
      {dataLoadingFailed ? (
        <Stack align="center">
          <Title order={2}>Failed</Title>
          <Text>
            Data retrieval failed. Please try later or contact the admins.
          </Text>
        </Stack>
      ) : (
        <Stack align="center">
          <Title order={2}>One moment ...</Title>
          <Group>
            <Loader size="sm" />
            <Text>
              Retrieving data, this may take a few seconds.
            </Text>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default observer(DataRetrievalModal);
