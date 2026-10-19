import { ReactNode } from 'react';
import Link from 'next/link';
import { LanguageSelector } from './LanguageSelector';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-slate text-neutral">
      <header className="flex items-center justify-between border-b border-elevated-slate p-4">
        <Link href="/en" className="font-bold text-2xl">
          CortexDrive
        </Link>
        <LanguageSelector />
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="border-t border-elevated-slate p-4 text-center text-sm text-muted-text">
        &copy; 2024 CortexDrive. All rights reserved.
      </footer>
    </div>
  );
}
