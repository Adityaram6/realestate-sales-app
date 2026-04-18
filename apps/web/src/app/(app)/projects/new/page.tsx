import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>
      </Button>
      <PageHeader
        title="Create project"
        description="Add a project, then add plots and documents on the detail page."
      />
      <ProjectForm />
    </div>
  );
}
