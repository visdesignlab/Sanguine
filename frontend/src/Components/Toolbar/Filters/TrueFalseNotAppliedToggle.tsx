import {
  Flex, Rating, ThemeIcon, Text,
} from '@mantine/core';
import { IconCircle, IconCircleFilled } from '@tabler/icons-react';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';

export function TrueFalseNotAppliedToggle({ label, currentFilterValue, setFilterCallback }: {label: string, currentFilterValue: boolean|null, setFilterCallback: (value: boolean|null) => void}) {
  return (
    <Flex>
      <Text w="45%" c={currentFilterValue === null ? undefined : 'blue'}>
        {label}
      </Text>
      <Rating
        value={
                     currentFilterValue === true
                       ? 3
                       : currentFilterValue === false
                         ? 1
                         : 2
                    }
        color={DEFAULT_DATA_COLOR}
        count={3}
        highlightSelectedOnly
        emptySymbol={(
          <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
            <IconCircle />
          </ThemeIcon>
                    )}
        fullSymbol={(
          <ThemeIcon
            variant="white"
            color={
                          currentFilterValue === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
            size="sm"
            mr="lg"
          >
            <IconCircleFilled />
          </ThemeIcon>
                    )}
        onChange={(value) => setFilterCallback(value === 3 ? true : value === 1 ? false : null)}
      />
    </Flex>
  );
}
