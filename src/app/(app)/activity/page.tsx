import { requireModule } from "@/lib/authz/dal";
import { ActivityLog } from "@/components/activity/ActivityLog";

export default async function ActivityPage() {
  await requireModule("access");
  return <ActivityLog />;
}
