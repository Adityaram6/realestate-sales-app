import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/leads">
          <ArrowLeft className="h-4 w-4" />
          All leads
        </Link>
      </Button>
      <PageHeader
        title="New lead"
        description="Capture contact + consent. You'll attach projects next."
      />
      <LeadForm />
    </div>
  );
}
