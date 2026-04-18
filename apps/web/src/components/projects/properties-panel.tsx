"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { PropertyFormDialog } from "@/components/projects/property-form-dialog";
import { formatCurrencyINR } from "@/lib/utils";
import { PropertyStatus, type Property } from "@realestate/shared";

const STATUS_VARIANT: Record<
  Property["status"],
  "default" | "warning" | "muted" | "destructive"
> = {
  [PropertyStatus.AVAILABLE]: "default",
  [PropertyStatus.RESERVED]: "warning",
  [PropertyStatus.SOLD]: "muted",
};

const STATUS_LABEL: Record<Property["status"], string> = {
  [PropertyStatus.AVAILABLE]: "Available",
  [PropertyStatus.RESERVED]: "Reserved",
  [PropertyStatus.SOLD]: "Sold",
};

interface PropertiesPanelProps {
  projectId: string;
  properties: Property[];
}

export function PropertiesPanel({ projectId, properties }: PropertiesPanelProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {properties.length} unit{properties.length === 1 ? "" : "s"} ·{" "}
            {
              properties.filter((p) => p.status === PropertyStatus.AVAILABLE)
                .length
            }{" "}
            available
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add property
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Add plots or units so your sales team can link opportunities to specific inventory."
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4" />
              Add the first property
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Facing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.unitNumber}</TableCell>
                  <TableCell>
                    {p.size} {p.sizeUnit === "sqyd" ? "sq. yd" : "sq. ft"}
                  </TableCell>
                  <TableCell>{formatCurrencyINR(p.price)}</TableCell>
                  <TableCell>{p.facing ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.unitNumber}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PropertyFormDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        initial={editing}
      />
    </div>
  );
}
