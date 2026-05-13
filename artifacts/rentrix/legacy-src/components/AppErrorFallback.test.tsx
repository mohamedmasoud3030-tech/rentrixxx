import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorFallback } from './AppErrorFallback';

describe('AppErrorFallback', () => {
  it('shows retry for recoverable errors', () => {
    const retry = vi.fn();
    render(<AppErrorFallback retry={retry} severity="recoverable" />);

    const button = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('hides retry for non-recoverable errors', () => {
    render(<AppErrorFallback retry={() => {}} severity="non-recoverable" />);

    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.getByText(/Refresh or contact support/i)).toBeTruthy();
  });
});
