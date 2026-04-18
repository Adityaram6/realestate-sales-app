"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { UsersSection } from "@/components/settings/users-section";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { PipelineSection } from "@/components/settings/pipeline-section";
import { SocialAccountsSection } from "@/components/settings/social-accounts-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Team, channels, social accounts, and pipeline configuration."
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="social">Social accounts</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline stages</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersSection />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsSection />
        </TabsContent>
        <TabsContent value="social">
          <SocialAccountsSection />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
