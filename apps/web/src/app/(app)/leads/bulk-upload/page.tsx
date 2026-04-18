import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { BulkUploadWizard } from "@/components/leads/bulk-upload-wizard";

export default function BulkUploadPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/leads">
          <ArrowLeft className="h-4 w-4" />
          All leads
        </Link>
      </Button>
      <PageHeader
        title="Bulk upload leads"
        description="Import from CSV or Excel. Duplicates are matched on phone, then email — you choose how to handle them."
      />
      <BulkUploadWizard />
    </div>
  );
}
