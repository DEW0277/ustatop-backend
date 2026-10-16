import type { Metadata } from 'next';
import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { privacyPolicy } from '@/lib/legal/privacy';

export const metadata: Metadata = { title: 'Maxfiylik siyosati — UstaTop' };

export default function PrivacyPage() {
  return <LegalDocumentView document={privacyPolicy} />;
}
