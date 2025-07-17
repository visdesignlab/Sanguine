import { createTheme } from '@mantine/core';

// Icon border colors and styles ------------------
const BORDER_COLOR = 'var(--mantine-color-black)';
const BORDER_STYLE = {
  borderWidth: '1px',
  borderStyle: 'solid' as const,
};

const BLACK_BORDER = {
  ...BORDER_STYLE,
  borderTopColor: BORDER_COLOR,
  borderRightColor: BORDER_COLOR,
  borderBottomColor: BORDER_COLOR,
  borderLeftColor: BORDER_COLOR,
};

const TRANSPARENT_BORDER = {
  ...BORDER_STYLE,
  borderTopColor: 'transparent',
  borderRightColor: 'transparent',
  borderBottomColor: 'transparent',
  borderLeftColor: 'transparent',
};

// Default theme stylings throughout entire application
export const mantineTheme = createTheme({
  headings: {
    sizes: {
      h1: {
        fontWeight: '600',
        fontSize: '1.5rem',
      },
      h2: {
        fontWeight: '600',
        fontSize: '1.25rem',
      },
      h3: {
        fontWeight: '600',
        fontSize: '1.125rem',
      },
      h4: {
        fontWeight: '400',
        fontSize: '1rem',
      },
    },
  },
  components: {
    ActionIcon: {
      styles: {
        root: {
          ...TRANSPARENT_BORDER,
        },
      },
    },
    Tooltip: {
      defaultProps: {
        withArrow: true,
        arrowSize: 10,
      },
      styles: {
        tooltip: {
          backgroundColor: 'white',
          ...BLACK_BORDER,
          color: BORDER_COLOR,
        },
        arrow: {
          ...BLACK_BORDER,
          backgroundColor: 'white',
        },
      },
    },
  },
});
