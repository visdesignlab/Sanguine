import { createTheme, useMantineTheme, px } from '@mantine/core';

// Standard text sizes across application ----------------
const standardTextSizes = {
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
    fontWeight: '500',
    fontSize: '1rem',
  },
};

// Application stroke styles ------------------
// Stroke color
const BLACK_STROKE_COLOR = 'var(--mantine-color-black)';
const HIGHLIGHT_STROKE_COLOR = 'var(--mantine-color-blue-6)';
// Stroke widths
const STROKE_WIDTH = '1px';
const DIMMED_STROKE_WIDTH = '1.5px';

// Tooltip styles --------------
const TOOLTIP_STYLES = {
  borderWidth: STROKE_WIDTH,
  borderStyle: 'solid' as const,
  color: BLACK_STROKE_COLOR,
  backgroundColor: 'white',
};
// Icon button styles -------------
const BUTTON_STYLES = {
  variant: 'white',
  color: 'dark',
};

// Default theme stylings throughout entire application
export const mantineTheme = createTheme({
  headings: {
    sizes: standardTextSizes,
  },
  components: {
    ActionIcon: {
      defaultProps: {
        ...BUTTON_STYLES,
        size: 'lg',
      },
      styles: {
        root: {
          '--ai-hover-color': HIGHLIGHT_STROKE_COLOR,
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
          ...TOOLTIP_STYLES,
        },
        arrow: {
          ...TOOLTIP_STYLES,
          filter: 'drop-shadow(0 1px 0 black)',
        },
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
      defaultProps: BUTTON_STYLES,
      styles: {
        root: {
          borderColor: 'var(--button-bd)',
          borderWidth: STROKE_WIDTH,
          fontWeight: standardTextSizes.h4.fontWeight,
          '--button-hover-color': HIGHLIGHT_STROKE_COLOR,
        },
      },
    },
    Modal: {
      styles: {
        title: {
          fontSize: standardTextSizes.h3.fontSize,
          fontWeight: standardTextSizes.h3.fontWeight,
        },
      },
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
  const toolbarWidth = 3 * spacingPx.lg;
  return {
    // Icon sizes
    buttonIconSize: spacingPx.md,
    cardIconSize: spacingPx.lg,
    // Icon stroke widths
    cardIconStroke: DIMMED_STROKE_WIDTH,
    iconStroke: STROKE_WIDTH,
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
