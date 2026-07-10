import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PNMA — Plateforme Numérique de Mobilité et d’Assistance',
  description:
    'Assistance routière 24/7 au Sénégal : centre d’appel, partenaires, remorquage, préfinancement médical et orchestration numérique.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
