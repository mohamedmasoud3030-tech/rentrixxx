export type UIPackId = 'minimal' | 'enterprise' | 'glass';

export interface UIPack {
  id: UIPackId;
  name: string;
  description: string;
  className: string;
  defaultTheme: 'light' | 'dark' | 'glass';
  enabledByDefault?: boolean;
}

export const uiPackRegistry: UIPack[] = [
  {
    id: 'minimal',
    name: 'Minimal Pack',
    description: 'Clean SaaS defaults with minimal decoration.',
    className: 'ui-pack-minimal',
    defaultTheme: 'light',
    enabledByDefault: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    description: 'Denser dashboards with elevated hierarchy and depth.',
    className: 'ui-pack-enterprise',
    defaultTheme: 'dark',
  },
  {
    id: 'glass',
    name: 'Glass Pack',
    description: 'Premium glass depth for floating surfaces.',
    className: 'ui-pack-glass',
    defaultTheme: 'glass',
  },
];

export const getUIPack = (id?: string): UIPack =>
  uiPackRegistry.find((pack) => pack.id === id) ?? uiPackRegistry[0];

export const applyUIPack = (id?: string): UIPack => {
  const selected = getUIPack(id);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.uiPack = selected.id;
    root.classList.remove('ui-pack-minimal', 'ui-pack-enterprise', 'ui-pack-glass');
    root.classList.add(selected.className);
  }
  return selected;
};
