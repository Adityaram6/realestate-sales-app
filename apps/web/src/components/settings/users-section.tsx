"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { settingsApi } from "@/lib/settings-api";
import { extractApiError } from "@/lib/api-client";
import { UserRole } from "@realestate/shared";

export function UsersSection() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => settingsApi.listUsers(),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      settingsApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
      toast.show({ title: "Role updated", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't update role",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Team members</h2>
        <p className="text-sm text-muted-foreground">
          Admins can change roles. Sales only see their assigned leads;
          managers and admins see everything.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    {u.phone ? (
                      <div className="text-xs text-muted-foreground">
                        {u.phone}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "default" : "muted"}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          roleMut.mutate({ id: u.id, role: v as UserRole })
                        }
                        disabled={roleMut.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.MANAGER}>
                            Manager
                          </SelectItem>
                          <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
