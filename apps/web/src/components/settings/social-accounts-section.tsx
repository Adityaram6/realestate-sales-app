"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { extractApiError } from "@/lib/api-client";
import { socialApi } from "@/lib/social-api";
import {
  SocialPlatform,
  SOCIAL_PLATFORM_LABEL,
  UserRole,
} from "@realestate/shared";
import { formatDate } from "@/lib/utils";

const ICON: Record<SocialPlatform, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

export function SocialAccountsSection() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [connectOpen, setConnectOpen] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["social", "accounts"],
    queryFn: () => socialApi.listAccounts(),
  });

  const disconnectMut = useMutation({
    mutationFn: (id: string) => socialApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social", "accounts"] });
      toast.show({ title: "Disconnected", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Disconnect failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Social accounts</h2>
          <p className="text-sm text-muted-foreground">
            Connect Meta + LinkedIn accounts to publish campaign posts. Real
            publishing goes live once Meta Business Verification is approved
            — until then, publishing is a no-op stub.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" />
            Connect account
          </Button>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Access tokens are stored encrypted at rest in production.
          Self-serve OAuth handshake is Phase 3b — for now, paste tokens
          manually from the Meta/LinkedIn developer console.
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No accounts connected yet.
          {isAdmin ? " Click Connect account to add one." : ""}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((acc) => {
            const Icon = ICON[acc.platform];
            return (
              <Card key={acc.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {acc.accountName}
                      </CardTitle>
                      <CardDescription>
                        {SOCIAL_PLATFORM_LABEL[acc.platform]} · Connected{" "}
                        {formatDate(acc.createdAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={acc.status === "connected" ? "success" : "muted"}
                  >
                    {acc.status}
                  </Badge>
                </CardHeader>
                {isAdmin ? (
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            `Disconnect ${acc.accountName}? Scheduled posts on this account will fail.`,
                          )
                        ) {
                          disconnectMut.mutate(acc.id);
                        }
                      }}
                      disabled={disconnectMut.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </ul>
      )}

      <ConnectAccountDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

function ConnectAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<SocialPlatform>(
    SocialPlatform.FACEBOOK,
  );
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connectMut = useMutation({
    mutationFn: () =>
      socialApi.connect({ platform, accountName, accessToken }),
    onSuccess: (acc) => {
      queryClient.invalidateQueries({ queryKey: ["social", "accounts"] });
      toast.show({
        title: "Connected",
        description: acc.accountName,
        variant: "success",
      });
      setPlatform(SocialPlatform.FACEBOOK);
      setAccountName("");
      setAccessToken("");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.show({
        title: "Connect failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a social account</DialogTitle>
          <DialogDescription>
            Paste a long-lived access token. Use the Meta Graph Explorer or
            LinkedIn developer console to generate one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Platform">
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as SocialPlatform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SocialPlatform).map((p) => (
                  <SelectItem key={p} value={p}>
                    {SOCIAL_PLATFORM_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Account name" required>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Realty Sales Official"
            />
          </FormField>

          <FormField label="Access token" required>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAG…"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={connectMut.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={
              !accountName || accessToken.length < 10 || connectMut.isPending
            }
          >
            {connectMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
