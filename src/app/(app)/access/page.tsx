import { requireModule } from "@/lib/authz/dal";
import { AccessManagement } from "@/components/access/AccessManagement";

export default async function AccessPage() {
  await requireModule("access");
  return <AccessManagement />;
}
