import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Topbar from '@/components/print/layout/Topbar';
import '../../i18n';
import { MemoryRouter } from 'react-router-dom';

const mockLogout = vi.fn();


vi.mock('@/components/print/layout/Notifications', () => ({ default: () => <div /> }));
vi.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    auth: { currentUser: { username: 'tester', role: 'ADMIN' }, logout: mockLogout },
    settings: { appearance: { theme: 'light' } },
    updateSettings: vi.fn(),
  }),
}));

describe('i18n language switcher', () => {
  beforeEach(() => {
    localStorage.setItem('rentrix:lang', 'ar');
  });

  it('switches from Arabic to English and updates topbar labels', async () => {
    render(<MemoryRouter><Topbar setSidebarOpen={() => {}} /></MemoryRouter>);

    expect(screen.getByTitle('تسجيل الخروج')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('اللغة'), { target: { value: 'en' } });

    expect(await screen.findByTitle('Log out')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
