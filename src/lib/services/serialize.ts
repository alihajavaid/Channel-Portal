import "server-only";
import type { getChannelAccount } from "@/lib/services/channelAccount.service";
import type { getCustomer } from "@/lib/services/customer.service";
import type { ChecklistState } from "@/lib/constants/phaseChecklists";

type ChannelAccountRecord = NonNullable<Awaited<ReturnType<typeof getChannelAccount>>>;
type CustomerRecord = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

function serializeDocuments<T extends { uploadedAt: Date }>(documents: T[]) {
  return documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() }));
}

// Server Component pages call the service layer directly (real Date/JsonValue objects), but
// client components are typed against the JSON shape the API returns (dates as ISO strings).
// This bridges the two without duplicating field lists across every detail page.
export function serializeChannelAccount(record: ChannelAccountRecord) {
  return {
    ...record,
    requestDate: record.requestDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    checklistState: record.checklistState as unknown as ChecklistState,
    documents: serializeDocuments(record.documents),
  };
}

export function serializeCustomer(record: CustomerRecord) {
  return {
    ...record,
    renewalDate: record.renewalDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    documents: serializeDocuments(record.documents),
  };
}
