import { createTheme, useMantineTheme, px } from '@mantine/core';

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
      defaultProps: {
        variant: 'subtle',
        color: 'dark',
        size: 'lg',
      },
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
          filter: 'drop-shadow(0 1px 0 black)',
        }
      },
    },
    Paper: {
      defaultProps: {
        withBorder: true,
        p: 'md',
        radius: 'md',
      },
    },
    Button: {
      defaultProps: {
        variant: 'outline',
        color: 'dark',
        style: { borderWidth: 1, fontWeight: 400 },
      },
    },
  },
  other: {
    iconSizes: {
      card: 22,
      button: 18,
    },
    iconStroke: {
      base: 1,
      card: 1.5,
    },
  },
});

/**
 * @returns Object containing theme constants for use in components.
 */
export function useThemeConstants() {
  // Use Mantine's "MantineTheme" hook to access theme values
  const theme = useMantineTheme();

  const spacingPx = Object.fromEntries(
    Object.entries(theme.spacing).map(([key, value]) => [key, Number(px(value))]),
  );

  // Toolbar width - equal margin on both sides of 'lg' icons.
  const toolbarWidth = 3 * Number(px(theme.spacing.lg));
  return {
    cardIconSize: theme.other.iconSizes.card,
    cardIconStroke: theme.other.iconStroke.card,
    buttonIconSize: theme.other.iconSizes.button,
    iconStroke: theme.other.iconStroke.base,
    /**
     * Mantine theme spacing in pixels
     *
     ***Example:** spacingPx.lg === 24 (24px)
     *
     ***Keys:** xs, sm, md, lg, xl
     */
    spacingPx,
    toolbarWidth,
  };
}
