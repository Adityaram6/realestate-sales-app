import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { FlowForm } from "@/components/flows/flow-form";

export default function NewFlowPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/marketing/flows">
          <ArrowLeft className="h-4 w-4" />
          All flows
        </Link>
      </Button>
      <PageHeader
        title="New flow"
        description="Pick a trigger, drop in steps, and toggle it on from the detail page."
      />
      <FlowForm />
    </div>
  );
}
