import {
  Modal, Text, Title, Group, Loader, Stack,
} from '@mantine/core';

export function DataRetrieval({ dataLoading, dataLoadingFailed }: { dataLoading: boolean; dataLoadingFailed: boolean; }) {
  return (
    <Modal
      opened={dataLoading || dataLoadingFailed}
      onClose={() => {}} // Prevent closing
      withCloseButton={false}
      centered
      size="md"
      title={<Title order={3}>{dataLoadingFailed ? 'Data Retrieval Failed' : 'Retrieving Data'}</Title>}
    >
      {/* Data loading modal, pass or fails */}
      {dataLoadingFailed ? (
          <>
            <Text>
              Please try later or contact your systems administrator.
            </Text>
          </>
      ) : (
          <>
            <Group>
              <Loader size="sm" />
              <Text>
                This may take a few seconds.
              </Text>
            </Group>
          </>
      )}
    </Modal>
  );
}
