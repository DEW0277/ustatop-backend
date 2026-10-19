import type { Metadata } from 'next';
import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { deleteAccountInfo } from '@/lib/legal/delete-account';

export const metadata: Metadata = { title: "Akkauntni o'chirish — UstaTop" };

export default function DeleteAccountPage() {
  return <LegalDocumentView document={deleteAccountInfo} />;
}
