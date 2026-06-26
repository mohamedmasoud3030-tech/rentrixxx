import { describe, expect, it, vi } from 'vitest';
import { preventSettingsUnload } from './settings-page';

describe('SettingsPage workflow helpers', () => {
  it('marks browser unload events as blocked when settings are dirty', () => {
    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as string | undefined,
    } as unknown as BeforeUnloadEvent;

    preventSettingsUnload(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe('');
  });
});
