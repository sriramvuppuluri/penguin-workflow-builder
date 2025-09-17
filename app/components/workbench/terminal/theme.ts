import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--penguin-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--penguin-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--penguin-elements-terminal-textColor'),
    background: cssVar('--penguin-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--penguin-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--penguin-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--penguin-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--penguin-elements-terminal-color-black'),
    red: cssVar('--penguin-elements-terminal-color-red'),
    green: cssVar('--penguin-elements-terminal-color-green'),
    yellow: cssVar('--penguin-elements-terminal-color-yellow'),
    blue: cssVar('--penguin-elements-terminal-color-blue'),
    magenta: cssVar('--penguin-elements-terminal-color-magenta'),
    cyan: cssVar('--penguin-elements-terminal-color-cyan'),
    white: cssVar('--penguin-elements-terminal-color-white'),
    brightBlack: cssVar('--penguin-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--penguin-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--penguin-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--penguin-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--penguin-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--penguin-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--penguin-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--penguin-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
