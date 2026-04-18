"use client";

import { LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { NotificationsButton } from "@/components/notifications/notifications-button";

export function Topbar() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search leads, projects, opportunities…"
          className="pl-9"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <NotificationsButton />
        {user ? (
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="text-xs capitalize text-muted-foreground">
              {user.role}
            </div>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
