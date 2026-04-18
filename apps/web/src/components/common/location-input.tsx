"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

interface LocationValue {
  text: string;
  latitude?: number;
  longitude?: number;
}

interface LocationInputProps {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Location input with optional Google Maps integration.
 *
 * Phase 1 client-provides-key model: if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is empty
 * we degrade to manual text entry. The Maps Places Autocomplete wiring goes here
 * once the key is provisioned — keeping it isolated behind this one component.
 */
export function LocationInput({
  value,
  onChange,
  id,
  placeholder = "e.g. Anandapuram, Visakhapatnam",
  className,
}: LocationInputProps) {
  const mapsEnabled = Boolean(env.googleMapsApiKey);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {!mapsEnabled ? (
        <p className="text-xs text-muted-foreground">
          Maps autocomplete disabled — set{" "}
          <code className="rounded bg-muted px-1">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to enable pin selection.
        </p>
      ) : null}
      {value.latitude != null && value.longitude != null ? (
        <p className="text-xs text-muted-foreground">
          Coords: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}
