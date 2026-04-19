"use client";

import {
  ArrowDown,
  ArrowUp,
  Clock,
  GripVertical,
  MessageSquare,
  Mail,
  Plus,
  Smartphone,
  Trash2,
  CheckSquare,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlowStepType,
  FLOW_STEP_LABEL,
  type FlowStepConfig,
} from "@realestate/shared";
import { cn } from "@/lib/utils";

export interface EditableStep {
  type: FlowStepType;
  config: FlowStepConfig;
}

interface StepEditorProps {
  steps: EditableStep[];
  onChange: (steps: EditableStep[]) => void;
  disabled?: boolean;
}

const ICON: Record<FlowStepType, typeof Clock> = {
  SEND_WHATSAPP: MessageSquare,
  SEND_EMAIL: Mail,
  SEND_SMS: Smartphone,
  WAIT: Clock,
  CREATE_TASK: CheckSquare,
  CONDITION: GitBranch,
};

const ACCENT: Record<FlowStepType, string> = {
  SEND_WHATSAPP: "bg-emerald-100 text-emerald-700",
  SEND_EMAIL: "bg-indigo-100 text-indigo-700",
  SEND_SMS: "bg-sky-100 text-sky-700",
  WAIT: "bg-amber-100 text-amber-700",
  CREATE_TASK: "bg-violet-100 text-violet-700",
  CONDITION: "bg-slate-100 text-slate-700",
};

export function StepEditor({ steps, onChange, disabled }: StepEditorProps) {
  const update = (index: number, next: Partial<EditableStep>) => {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...next } : s)));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next);
  };
  const remove = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };
  const addStep = (type: FlowStepType) => {
    onChange([
      ...steps,
      { type, config: defaultConfigFor(type) },
    ]);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const Icon = ICON[step.type];
          return (
            <li key={i}>
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      ACCENT[step.type],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Step {i + 1}
                        </span>
                        <span className="text-sm font-medium">
                          {FLOW_STEP_LABEL[step.type]}
                        </span>
                      </div>
                      {!disabled ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => move(i, 1)}
                            disabled={i === steps.length - 1}
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(i)}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <StepConfigInputs
                      step={step}
                      onConfigChange={(config) => update(i, { config })}
                      disabled={disabled}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      {!disabled ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3">
          <span className="text-sm text-muted-foreground">Add step:</span>
          <Select onValueChange={(v) => addStep(v as FlowStepType)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Pick a step type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(FlowStepType).map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="inline-flex items-center gap-2">
                    {(() => {
                      const I = ICON[t];
                      return <I className="h-3.5 w-3.5" />;
                    })()}
                    {FLOW_STEP_LABEL[t]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addStep(FlowStepType.WAIT)}
            className="ml-auto"
          >
            <Plus className="h-4 w-4" />
            Quick add wait
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StepConfigInputs({
  step,
  onConfigChange,
  disabled,
}: {
  step: EditableStep;
  onConfigChange: (config: FlowStepConfig) => void;
  disabled?: boolean;
}) {
  const { type, config } = step;

  if (
    type === FlowStepType.SEND_WHATSAPP ||
    type === FlowStepType.SEND_EMAIL ||
    type === FlowStepType.SEND_SMS
  ) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Message content</Label>
        <Textarea
          rows={3}
          value={config.content ?? ""}
          onChange={(e) =>
            onConfigChange({ ...config, content: e.target.value })
          }
          placeholder={
            type === FlowStepType.SEND_EMAIL
              ? "Subject: …\n\nBody…"
              : "Hi {{name}}, quick follow-up on the project."
          }
          disabled={disabled}
        />
        <p className="text-[11px] text-muted-foreground">
          Tokens: <code>{"{{name}}"}</code>, <code>{"{{fullName}}"}</code>,{" "}
          <code>{"{{phone}}"}</code>
        </p>
      </div>
    );
  }

  if (type === FlowStepType.WAIT) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Days</Label>
          <Input
            type="number"
            min={0}
            value={config.days ?? 0}
            onChange={(e) =>
              onConfigChange({ ...config, days: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-xs">Hours</Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={config.hours ?? 0}
            onChange={(e) =>
              onConfigChange({ ...config, hours: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-xs">Minutes</Label>
          <Input
            type="number"
            min={0}
            max={59}
            value={config.minutes ?? 0}
            onChange={(e) =>
              onConfigChange({ ...config, minutes: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (type === FlowStepType.CREATE_TASK) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Task title</Label>
          <Input
            value={config.title ?? ""}
            onChange={(e) =>
              onConfigChange({ ...config, title: e.target.value })
            }
            placeholder="Call lead — follow up on proposal"
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-xs">Due in (days from now)</Label>
          <Input
            type="number"
            min={0}
            value={config.dueInDays ?? 1}
            onChange={(e) =>
              onConfigChange({
                ...config,
                dueInDays: Number(e.target.value),
              })
            }
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (type === FlowStepType.CONDITION) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Field</Label>
          <Select
            value={config.field ?? "status"}
            onValueChange={(v) =>
              onConfigChange({ ...config, field: v as "status" | "score" | "source" })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Lead status</SelectItem>
              <SelectItem value="score">Lead score</SelectItem>
              <SelectItem value="source">Lead source</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Operator</Label>
          <Select
            value={config.op ?? "eq"}
            onValueChange={(v) =>
              onConfigChange({
                ...config,
                op: v as "eq" | "ne" | "gte" | "lte" | "in",
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="ne">not equals</SelectItem>
              <SelectItem value="gte">greater or equal</SelectItem>
              <SelectItem value="lte">less or equal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            value={String(config.value ?? "")}
            onChange={(e) =>
              onConfigChange({
                ...config,
                value:
                  config.field === "score"
                    ? Number(e.target.value)
                    : e.target.value,
              })
            }
            placeholder={config.field === "score" ? "75" : "hot"}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  return null;
}

function defaultConfigFor(type: FlowStepType): FlowStepConfig {
  switch (type) {
    case FlowStepType.WAIT:
      return { days: 1 };
    case FlowStepType.CREATE_TASK:
      return { title: "Follow-up", dueInDays: 1 };
    case FlowStepType.CONDITION:
      return { field: "status", op: "eq", value: "hot" };
    default:
      return { content: "" };
  }
}

// Silence unused — used from parent only.
export { type FlowStepConfig };
