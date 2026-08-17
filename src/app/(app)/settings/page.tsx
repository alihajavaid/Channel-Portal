import { requireSession } from "@/lib/authz/dal";
import { AccountSettings } from "@/components/settings/AccountSettings";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <AccountSettings
      name={session.user.name}
      email={session.user.email}
      role={session.user.role}
      mfaEnabled={session.user.mfaEnabled}
    />
  );
}
