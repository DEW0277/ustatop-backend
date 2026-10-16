import { ChangePasswordForm } from '@/components/settings/change-password-form';

export const metadata = { title: 'Sozlamalar — UstaTop Admin' };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Sozlamalar</h1>
        <p className="text-sm text-muted-foreground">Administrator parolini almashtirish</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
