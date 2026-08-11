import { requireModule } from "@/lib/authz/dal";
import { listDeliverables } from "@/lib/services/deliverable.service";
import { DeliverableList } from "@/components/deliverables/DeliverableList";

export default async function DeliverablesPage() {
  await requireModule("deliverables");
  const deliverables = await listDeliverables();
  return (
    <DeliverableList
      initialDeliverables={deliverables.map((d) => ({ ...d, lastUpdated: d.lastUpdated.toISOString() }))}
    />
  );
}
