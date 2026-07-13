'use client';

import { A11yProvider } from '@/components/A11yProvider';

export function A11yRoot({ children }: { children: React.ReactNode }) {
  return <A11yProvider>{children}</A11yProvider>;
}
