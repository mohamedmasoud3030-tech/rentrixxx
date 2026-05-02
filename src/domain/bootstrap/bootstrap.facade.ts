import { supabaseData } from '@/services/supabaseDataService';
import type { Database, Serials, Settings } from '@/types';

export type BootstrapFacadeDelegates = {
  initializeApp?: () => Promise<void>;
  refreshState?: () => Promise<Database>;
};

export const createBootstrapFacade = (delegates: BootstrapFacadeDelegates = {}) => ({
  initializeApp: () => delegates.initializeApp?.(),

  seedDefaults: (
    settings: Settings,
    accounts: Record<string, unknown>[],
    templates: Record<string, unknown>[],
    serials: Serials,
  ) => supabaseData.seedDefaults(
    settings,
    accounts,
    templates,
    serials,
  ),

  refreshState: () => delegates.refreshState?.() ?? supabaseData.getAllData(),
});

export const bootstrapFacade = createBootstrapFacade();
