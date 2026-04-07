/**
 * Anatomi — Renk Paleti
 * Web (index.css) ile 1:1 senkron
 */
export const Colors = {
  // Primary
  primary: '#59dcb5',
  primaryContainer: '#006c54',
  primaryFixed: '#79f9d0',
  onPrimary: '#00382a',
  onPrimaryContainer: '#6eefc7',

  // Secondary (Sky Blue)
  secondary: '#7dd3fc',
  secondaryContainer: '#0369a1',
  onSecondary: '#0c4a6e',

  // Tertiary
  tertiary: '#f8acff',
  tertiaryContainer: '#a200be',
  onTertiary: '#570067',

  // Surfaces
  background: '#0b141b',
  surface: '#0b141b',
  surfaceDim: '#0b141b',
  surfaceBright: '#313a42',
  surfaceContainerLowest: '#060f16',
  surfaceContainerLow: '#141d24',
  surfaceContainer: '#182128',
  surfaceContainerHigh: '#222b33',
  surfaceContainerHighest: '#2d363e',
  onSurface: '#dae3ee',
  onSurfaceVariant: '#bec9c5',
  surfaceVariant: '#2d363e',

  // Outline
  outline: '#889390',
  outlineVariant: '#3e4946',

  // Error
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',

  // Extras
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
}

// Story gradient presets (for LinearGradient)
export const StoryGradients = {
  emerald: ['#0b141b', '#006c54', '#004d3d'],
  purple: ['#0b141b', '#570067', '#350040'],
  blue: ['#0b141b', '#0369a1', '#082f49'],
  fire: ['#0b141b', '#93000a', '#690005'],
  mixed: ['#0b141b', '#006c54', '#570067', '#0b141b'],
}

// Mood colors for history cards
export const MoodColors = {
  Romantic: { bg: 'rgba(248,172,255,0.15)', text: Colors.tertiary },
  Toxic: { bg: 'rgba(255,180,171,0.15)', text: Colors.error },
  Chaotic: { bg: 'rgba(255,200,100,0.15)', text: '#ffd700' },
  Chill: { bg: 'rgba(89,220,181,0.15)', text: Colors.primary },
  Balanced: { bg: 'rgba(125,211,252,0.15)', text: Colors.secondary },
}

export const MoodIcons = {
  Romantic: '💕',
  Toxic: '🔥',
  Chaotic: '🌪️',
  Chill: '☕',
  Balanced: '⚖️',
}
