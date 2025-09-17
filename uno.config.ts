import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'penguin';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    50: '#FFF0F7',
    100: '#FFE0EF',
    200: '#FFC1DF',
    300: '#FF95C5',
    400: '#FF6DB1',
    500: '#FE2E92',
    600: '#EE016D',
    700: '#D10A5D',
    800: '#A8094B',
    900: '#8A0A3D',
    950: '#5A0628',
  },
  penguin: {
    primary: '#FE2E92',
    secondary: '#FF6DB1',
    tertiary: '#FF95C5',
    dark: '#A8094B',
    darker: '#8A0A3D',
    light: '#FFC1DF',
    lighter: '#FFE0EF',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-penguin:${x}`)],
  shortcuts: {
    'penguin-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 penguin-ease-cubic-bezier',
    kdb: 'bg-penguin-elements-code-background text-penguin-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      penguin: {
        elements: {
          borderColor: 'var(--penguin-elements-borderColor)',
          borderColorActive: 'var(--penguin-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--penguin-elements-bg-depth-1)',
              2: 'var(--penguin-elements-bg-depth-2)',
              3: 'var(--penguin-elements-bg-depth-3)',
              4: 'var(--penguin-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--penguin-elements-textPrimary)',
          textSecondary: 'var(--penguin-elements-textSecondary)',
          textTertiary: 'var(--penguin-elements-textTertiary)',
          code: {
            background: 'var(--penguin-elements-code-background)',
            text: 'var(--penguin-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--penguin-elements-button-primary-background)',
              backgroundHover: 'var(--penguin-elements-button-primary-backgroundHover)',
              text: 'var(--penguin-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--penguin-elements-button-secondary-background)',
              backgroundHover: 'var(--penguin-elements-button-secondary-backgroundHover)',
              text: 'var(--penguin-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--penguin-elements-button-danger-background)',
              backgroundHover: 'var(--penguin-elements-button-danger-backgroundHover)',
              text: 'var(--penguin-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--penguin-elements-item-contentDefault)',
            contentActive: 'var(--penguin-elements-item-contentActive)',
            contentAccent: 'var(--penguin-elements-item-contentAccent)',
            contentDanger: 'var(--penguin-elements-item-contentDanger)',
            backgroundDefault: 'var(--penguin-elements-item-backgroundDefault)',
            backgroundActive: 'var(--penguin-elements-item-backgroundActive)',
            backgroundAccent: 'var(--penguin-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--penguin-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--penguin-elements-actions-background)',
            code: {
              background: 'var(--penguin-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--penguin-elements-artifacts-background)',
            backgroundHover: 'var(--penguin-elements-artifacts-backgroundHover)',
            borderColor: 'var(--penguin-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--penguin-elements-artifacts-inlineCode-background)',
              text: 'var(--penguin-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--penguin-elements-messages-background)',
            linkColor: 'var(--penguin-elements-messages-linkColor)',
            code: {
              background: 'var(--penguin-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--penguin-elements-messages-inlineCode-background)',
              text: 'var(--penguin-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--penguin-elements-icon-success)',
            error: 'var(--penguin-elements-icon-error)',
            primary: 'var(--penguin-elements-icon-primary)',
            secondary: 'var(--penguin-elements-icon-secondary)',
            tertiary: 'var(--penguin-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--penguin-elements-preview-addressBar-background)',
              backgroundHover: 'var(--penguin-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--penguin-elements-preview-addressBar-backgroundActive)',
              text: 'var(--penguin-elements-preview-addressBar-text)',
              textActive: 'var(--penguin-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--penguin-elements-terminals-background)',
            buttonBackground: 'var(--penguin-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--penguin-elements-dividerColor)',
          loader: {
            background: 'var(--penguin-elements-loader-background)',
            progress: 'var(--penguin-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--penguin-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--penguin-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--penguin-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--penguin-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--penguin-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--penguin-elements-cta-background)',
            text: 'var(--penguin-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
