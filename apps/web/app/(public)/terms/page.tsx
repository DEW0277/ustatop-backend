import type { Metadata } from 'next';
import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { termsOfUse } from '@/lib/legal/terms';

export const metadata: Metadata = { title: 'Foydalanish shartlari — Aka Uka' };

export default function TermsPage() {
  return <LegalDocumentView document={termsOfUse} />;
}
