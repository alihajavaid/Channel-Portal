import { requireModule } from "@/lib/authz/dal";
import { ChannelAccountBoard } from "@/components/channel-accounts/ChannelAccountBoard";

export default async function PartnersPage() {
  await requireModule("partners");
  return <ChannelAccountBoard group="partner" />;
}
