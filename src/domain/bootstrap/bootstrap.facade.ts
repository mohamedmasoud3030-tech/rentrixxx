import { supabaseData } from '@/services/supabaseDataService';
import type { Account, Database, NotificationTemplate, Serials, Settings } from '@/types';

export type BootstrapFacadeDelegates = {
  initializeApp?: () => Promise<void>;
  refreshState?: () => Promise<Database>;
};

export const createBootstrapFacade = (delegates: BootstrapFacadeDelegates = {}) => ({
  initializeApp: () => delegates.initializeApp?.(),

  seedDefaults: (
    settings: Settings,
    accounts: Account[],
    templates: NotificationTemplate[],
    serials: Serials,
  ) => supabaseData.seedDefaults(
    settings,
    accounts as unknown as Record<string, unknown>[],
    templates as unknown as Record<string, unknown>[],
    serials,
  ),

  refreshState: () => delegates.refreshState?.() ?? supabaseData.getAllData(),
});

export const bootstrapFacade = createBootstrapFacade();
