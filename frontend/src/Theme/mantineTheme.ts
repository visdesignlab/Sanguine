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
  h5: {
    fontWeight: '500',
    fontSize: '0.875rem',
    c: 'dimmed',
  },
};

// Application stroke styles ------------------
// Stroke color
const BLACK_STROKE_COLOR = 'var(--mantine-color-black)';
const DIMMED_STROKE_COLOR = 'var(--mantine-color-gray-6)';
const POSITIVE_STROKE_COLOR = 'var(--mantine-color-teal-6, #12b886)';
const NEGATIVE_STROKE_COLOR = 'var(--mantine-color-red-6, #fa5252)';

// Selection and hover colors
export const smallHoverColor = '#FFCF76';
export const smallSelectColor = '#E29609';
export const backgroundHoverColor = '#FFE8BE';
export const backgroundSelectedColor = '#FFCF76';
export const highlightOrange = '#d98532';

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
  variant: 'subtle',
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
        },
      },
    },
    CloseButton: {
      styles: {
        root: {
          color: DIMMED_STROKE_COLOR,
        },
      },
    },
    Badge: {
      styles: {
        root: {
          '--badge-padding-x': '0.25rem',
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
    LineChart: {
      defaultProps: { activeDotProps: { r: 6, strokeWidth: 0, fill: smallHoverColor } },
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
    // Tooltip styles
    tooltipStyles: TOOLTIP_STYLES,
    /**
     * Mantine theme spacing in pixels
     *
     ***Example:** spacingPx.lg === 24 (24px)
     *
     ***Keys:** xs, sm, md, lg, xl
     */
    spacingPx,
    toolbarWidth,
    positiveColor: POSITIVE_STROKE_COLOR,
    negativeColor: NEGATIVE_STROKE_COLOR,
  };
}
