import { requireModule } from "@/lib/authz/dal";
import { CustomersTable } from "@/components/customers/CustomersTable";

export default async function CustomersPage() {
  await requireModule("customers");
  return <CustomersTable />;
}
