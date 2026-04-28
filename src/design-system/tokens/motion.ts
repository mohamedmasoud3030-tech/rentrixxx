export const motionTokens = {
  fast: 150,
  base: 200,
  slow: 300,
  page: 260,
  modal: 220,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const typographyTokens = {
  h1: 'text-3xl md:text-4xl font-black',
  h2: 'text-2xl font-extrabold',
  h3: 'text-xl font-bold',
  body: 'text-sm md:text-base font-medium',
  caption: 'text-xs font-medium',
} as const;
