/**
 * FormRunner — player multi-step para worksheets (structured_form).
 *
 * Reutilizado em:
 *  - /p/$token (magic link público)
 *  - In-session modal no /patients/$id
 *
 * UX: um passo por vez, barra de progresso, navegação prev/next,
 * campos dinâmicos renderizados por tipo. Estilo Terapily premium.
 */

import { useCallback, useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { StructuredFormConfig, FormStep, FormField } from "./form-types";

// ---------- Helpers ----------

function isStepComplete(step: FormStep, responses: Record<string, unknown>): boolean {
  return step.fields
    .filter((f) => f.required !== false)
    .every((f) => {
      const val = responses[f.id];
      if (val === undefined || val === null || val === "") return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    });
}

function getFormCompletion(config: StructuredFormConfig, responses: Record<string, unknown>) {
  const allFields = (config.steps ?? []).flatMap((s) => s.fields);
  const required = allFields.filter((f) => f.required !== false);
  const answered = required.filter((f) => {
    const val = responses[f.id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  });
  const total = required.length || 1;
  return {
    total: required.length,
    answered: answered.length,
    completion: Math.round((answered.length / total) * 100),
    allAnswered: answered.length >= required.length,
  };
}

// ---------- Field renderers ----------

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.required === false && (
              <span className="ml-1 text-muted-foreground text-xs">(opcional)</span>
            )}
          </Label>
          {field.helperText && (
            <p className="text-xs text-muted-foreground leading-relaxed">{field.helperText}</p>
          )}
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows ?? 4}
            className="resize-none bg-background/50 border-border/60 focus:border-[var(--sage)] transition-colors"
          />
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.required === false && (
              <span className="ml-1 text-muted-foreground text-xs">(opcional)</span>
            )}
          </Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="bg-background/50 border-border/60 focus:border-[var(--sage)]"
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
          </Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <Input
            id={field.id}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-background/50 border-border/60 focus:border-[var(--sage)] w-32"
          />
        </div>
      );

    case "slider":
      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <div className="px-2">
            <Slider
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              value={[(value as number) ?? field.min ?? 0]}
              onValueChange={([v]) => onChange(v)}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {field.minLabel ?? field.min ?? 0}
              </span>
              <span className="text-sm font-medium text-[var(--sage)]">
                {(value as number) ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {field.maxLabel ?? field.max ?? 100}
              </span>
            </div>
          </div>
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="bg-background/50 border-border/60">
              <SelectValue placeholder={field.placeholder ?? "Selecione…"} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "radio":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <RadioGroup
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(v)}
            className="space-y-2"
          >
            {(field.options ?? []).map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3">
                <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                <Label htmlFor={`${field.id}-${opt.value}`} className="text-sm cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-start space-x-3">
          <Checkbox
            id={field.id}
            checked={(value as boolean) ?? false}
            onCheckedChange={(v) => onChange(v)}
          />
          <div className="space-y-1">
            <Label htmlFor={field.id} className="text-sm font-medium cursor-pointer">
              {field.label}
            </Label>
            {field.helperText && (
              <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
          </div>
        </div>
      );

    case "multi_select":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    onChange(
                      selected ? current.filter((v) => v !== opt.value) : [...current, opt.value],
                    );
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    selected
                      ? "bg-[var(--sage)]/15 border-[var(--sage)] text-[var(--sage)] font-medium"
                      : "bg-card border-border text-foreground/70 hover:border-[var(--sage)]/50",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "emotion_picker": {
      const emotions = field.emotions ?? [
        "Tristeza",
        "Ansiedade",
        "Raiva",
        "Culpa",
        "Vergonha",
        "Medo",
        "Frustração",
        "Esperança",
        "Alívio",
      ];
      const emotionData = (value as
        | { emotions: { name: string; intensity: number }[] }
        | undefined) ?? { emotions: [] };
      const toggleEmotion = (name: string) => {
        const current = emotionData.emotions;
        const exists = current.find((e) => e.name === name);
        if (exists) {
          onChange({ emotions: current.filter((e) => e.name !== name) });
        } else {
          onChange({ emotions: [...current, { name, intensity: 50 }] });
        }
      };
      const updateIntensity = (name: string, intensity: number) => {
        onChange({
          emotions: emotionData.emotions.map((e) => (e.name === name ? { ...e, intensity } : e)),
        });
      };
      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
          <div className="flex flex-wrap gap-2">
            {emotions.map((em) => {
              const selected = emotionData.emotions.some((e) => e.name === em);
              return (
                <button
                  key={em}
                  type="button"
                  onClick={() => toggleEmotion(em)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    selected
                      ? "bg-[var(--mauve)]/15 border-[var(--mauve)] text-[var(--mauve)] font-medium"
                      : "bg-card border-border text-foreground/70 hover:border-[var(--mauve)]/50",
                  )}
                >
                  {em}
                </button>
              );
            })}
          </div>
          {emotionData.emotions.length > 0 && (
            <div className="space-y-3 pt-2">
              {emotionData.emotions.map((em) => (
                <div key={em.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{em.name}</span>
                    <span className="text-xs font-medium text-[var(--mauve)]">{em.intensity}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[em.intensity]}
                    onValueChange={([v]) => updateIntensity(em.name, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="text-xs text-muted-foreground">
          Campo tipo "{field.type}" não suportado.
        </div>
      );
  }
}

// ---------- Main component ----------

interface FormRunnerProps {
  config: StructuredFormConfig;
  responses: Record<string, unknown>;
  onResponse: (fieldId: string, value: unknown) => void;
  currentStepIndex?: number;
  onStepChange?: (stepIndex: number) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function FormRunner({
  config,
  responses,
  onResponse,
  currentStepIndex,
  onStepChange,
  onSubmit,
  submitting,
  submitLabel = "Enviar respostas",
}: FormRunnerProps) {
  const steps = useMemo(() => config?.steps ?? [], [config]);
  const [currentIdx, setCurrentIdx] = useState(currentStepIndex ?? 0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const total = steps.length;
  const step = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === total - 1;
  const stepComplete = step ? isStepComplete(step, responses) : false;
  const { answered, completion, allAnswered } = getFormCompletion(config, responses);

  useEffect(() => {
    if (currentStepIndex === undefined) return;
    const safeIndex = Math.min(Math.max(currentStepIndex, 0), Math.max(total - 1, 0));
    setCurrentIdx(safeIndex);
  }, [currentStepIndex, total]);

  const commitStepIndex = useCallback(
    (nextIndex: number) => {
      const safeIndex = Math.min(Math.max(nextIndex, 0), Math.max(total - 1, 0));
      setCurrentIdx(safeIndex);
      onStepChange?.(safeIndex);
    },
    [onStepChange, total],
  );

  const goTo = useCallback(
    (dir: "prev" | "next") => {
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        commitStepIndex(dir === "next" ? currentIdx + 1 : currentIdx - 1);
        setAnimating(false);
      }, 200);
    },
    [commitStepIndex, currentIdx],
  );

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !isFirst) goTo("prev");
      if (e.key === "ArrowRight" && !isLast && stepComplete) goTo("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, isFirst, isLast, stepComplete]);

  if (total === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta atividade ainda não está pronta para resposta automática. Fale com sua terapeuta.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Step progress bar */}
      <div className="flex items-center justify-center gap-1.5 py-4 px-6">
        {steps.map((s, i) => {
          const done = isStepComplete(s, responses);
          const isCurrent = i === currentIdx;
          return (
            <button
              key={s.id}
              onClick={() => {
                setDirection(i > currentIdx ? "next" : "prev");
                setAnimating(true);
                setTimeout(() => {
                  commitStepIndex(i);
                  setAnimating(false);
                }, 200);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isCurrent
                  ? "w-8 bg-[var(--sage)]"
                  : done
                    ? "w-2 bg-[var(--sage)]/60"
                    : "w-2 bg-border",
              )}
              aria-label={`Passo ${i + 1}: ${s.title}`}
            />
          );
        })}
      </div>

      {/* Counter */}
      <div className="text-center">
        <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Passo {currentIdx + 1} de {total}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className={cn(
            "w-full max-w-lg mx-auto transition-all duration-200",
            animating
              ? direction === "next"
                ? "opacity-0 translate-x-8"
                : "opacity-0 -translate-x-8"
              : "opacity-100 translate-x-0",
          )}
        >
          {step && (
            <>
              <h2 className="font-display text-xl md:text-2xl text-foreground leading-snug mb-2">
                <span className="text-[var(--sage)] mr-1.5">{currentIdx + 1}.</span>
                {step.title}
              </h2>
              {step.description && (
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {step.description}
                </p>
              )}

              <div className="space-y-6">
                {step.fields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={responses[field.id]}
                    onChange={(val) => onResponse(field.id, val)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-6 py-5 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <button
          onClick={() => goTo("prev")}
          disabled={isFirst}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            isFirst
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-foreground hover:bg-[var(--sage)]/10",
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <span className="text-xs text-muted-foreground">{completion}% completo</span>

        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={!allAnswered || submitting}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
              !allAnswered || submitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90 shadow-sm",
            )}
          >
            {submitting ? "Enviando…" : submitLabel}
          </button>
        ) : (
          <button
            onClick={() => goTo("next")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              "text-foreground hover:bg-[var(--sage)]/10",
            )}
          >
            Próxima
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Utility: count answered and total from config */
export { getFormCompletion };
