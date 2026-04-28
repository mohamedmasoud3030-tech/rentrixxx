import { supabaseData } from '@/services/supabaseDataService';
import type { Governance, Settings } from '@/types';

export type SettingsFacadeDelegates = {
  getSettings?: () => Promise<Settings>;
  updateSettings?: (settings: Settings) => Promise<boolean>;
  saveGovernance?: (governance: Governance) => Promise<void>;
};

export const createSettingsFacade = (delegates: SettingsFacadeDelegates = {}) => ({
  getSettings: () => delegates.getSettings?.() ?? supabaseData.getSettings(),

  updateSettings: (settings: Settings) =>
    delegates.updateSettings?.(settings) ?? supabaseData.updateSettingsPartial(settings),

  saveGovernance: (governance: Governance) =>
    delegates.saveGovernance?.(governance) ?? supabaseData.saveGovernance(governance),
});

export const settingsFacade = createSettingsFacade();
