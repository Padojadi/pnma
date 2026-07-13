import type { Metadata } from 'next';
import './globals.css';
import { A11yRoot } from '@/components/A11yRoot';

export const metadata: Metadata = {
  title: 'PNMA — Plateforme Numérique de Mobilité et d’Assistance',
  description:
    'Assistance routière 24/7 au Sénégal : centre d’appel, partenaires, remorquage, préfinancement médical et orchestration numérique.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <A11yRoot>{children}</A11yRoot>
      </body>
    </html>
  );
}
