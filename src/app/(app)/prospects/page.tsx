import { requireModule } from "@/lib/authz/dal";
import { ChannelAccountBoard } from "@/components/channel-accounts/ChannelAccountBoard";

export default async function ProspectsPage() {
  await requireModule("prospects");
  return <ChannelAccountBoard group="prospect" />;
}
