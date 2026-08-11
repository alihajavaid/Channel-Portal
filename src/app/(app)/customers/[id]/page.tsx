import { notFound } from "next/navigation";
import { requireModule } from "@/lib/authz/dal";
import { getCustomer } from "@/lib/services/customer.service";
import { CustomerDetail } from "@/components/customers/CustomerDetail";
import { serializeCustomer } from "@/lib/services/serialize";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("customers");
  const { id } = await params;
  const record = await getCustomer(id);
  if (!record) notFound();
  return <CustomerDetail record={serializeCustomer(record)} />;
}
