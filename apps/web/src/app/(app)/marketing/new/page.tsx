import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { CampaignForm } from "@/components/marketing/campaign-form";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/marketing">
          <ArrowLeft className="h-4 w-4" />
          All campaigns
        </Link>
      </Button>
      <PageHeader
        title="New campaign"
        description="Set up a campaign skeleton. Add audience and messages on the next screen."
      />
      <CampaignForm />
    </div>
  );
}
