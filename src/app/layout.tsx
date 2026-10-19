import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'CortexDrive',
  description: 'AI-assisted driving education and instructor marketplace in Pakistan',
};

// Root layout for paths without a locale segment. Middleware redirects users to /en by default.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
