import { notFound, redirect } from "next/navigation";
import { requireModule } from "@/lib/authz/dal";
import { getChannelAccount } from "@/lib/services/channelAccount.service";
import { ChannelAccountDetail } from "@/components/channel-accounts/ChannelAccountDetail";
import { serializeChannelAccount } from "@/lib/services/serialize";

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("partners");
  const { id } = await params;
  const record = await getChannelAccount(id);
  if (!record) notFound();
  if (record.phase <= 3) redirect(`/prospects/${id}`);
  return <ChannelAccountDetail record={serializeChannelAccount(record)} group="partner" />;
}
