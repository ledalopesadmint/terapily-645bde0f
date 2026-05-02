// @vitest-environment jsdom
/**
 * Tests: draft restore → correct question navigation + submit readiness.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ActivityPlayer, QuizConfig } from "./ActivityPlayer";

function makeConfig(n: number): QuizConfig {
  return {
    questions: Array.from({ length: n }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}`,
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Sometimes" },
        { value: 2, label: "Often" },
        { value: 3, label: "Always" },
      ],
    })),
  };
}

function fullResponses(config: QuizConfig): Record<string, number> {
  const r: Record<string, number> = {};
  for (const q of config.questions ?? []) r[q.id] = 1;
  return r;
}

function partialResponses(config: QuizConfig, count: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (let i = 0; i < count; i++) r[config.questions![i].id] = 1;
  return r;
}

describe("ActivityPlayer — draft restore navigation", () => {
  it("starts at question 1 when no responses", () => {
    render(<ActivityPlayer config={makeConfig(5)} responses={{}} onResponse={vi.fn()} />);
    expect(screen.getByText("1 de 5")).toBeInTheDocument();
  });

  it("jumps to last question on 100% draft restore", async () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );
    rerender(
      <ActivityPlayer config={config} responses={fullResponses(config)} onResponse={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByText("5 de 5")).toBeInTheDocument();
    });
  });

  it("shows submit button (enabled) on last question after 100% restore", async () => {
    const config = makeConfig(3);
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} onSubmit={onSubmit} />,
    );
    rerender(
      <ActivityPlayer config={config} responses={fullResponses(config)} onResponse={vi.fn()} onSubmit={onSubmit} />,
    );
    await waitFor(() => {
      const btn = screen.getByText("Enviar respostas");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeDisabled();
    });
  });

  it("submit button disabled when submitDisabled=true even with 100% restore", async () => {
    const config = makeConfig(3);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} onSubmit={vi.fn()} submitDisabled />,
    );
    rerender(
      <ActivityPlayer config={config} responses={fullResponses(config)} onResponse={vi.fn()} onSubmit={vi.fn()} submitDisabled />,
    );
    await waitFor(() => {
      const btn = screen.getByText("Enviar respostas");
      expect(btn.closest("button")).toBeDisabled();
    });
  });

  it("jumps to first unanswered question on partial draft restore", async () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );
    rerender(
      <ActivityPlayer config={config} responses={partialResponses(config, 3)} onResponse={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByText("4 de 5")).toBeInTheDocument();
    });
  });

  it("shows Next button (not Submit) on partial restore", async () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} onSubmit={vi.fn()} />,
    );
    rerender(
      <ActivityPlayer config={config} responses={partialResponses(config, 3)} onResponse={vi.fn()} onSubmit={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByText("Próxima")).toBeInTheDocument();
      expect(screen.queryByText("Enviar respostas")).not.toBeInTheDocument();
    });
  });

  it("does NOT re-jump on incremental response updates", async () => {
    const config = makeConfig(5);
    // Start with 2 responses — effect will jump to q3 (first unanswered)
    const initial = partialResponses(config, 2);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={initial} onResponse={vi.fn()} />,
    );
    // Wait for initial jump to settle
    await waitFor(() => {
      expect(screen.getByText("3 de 5")).toBeInTheDocument();
    });

    // Add one more response incrementally (not from 0)
    rerender(
      <ActivityPlayer config={config} responses={{ ...initial, q3: 1 }} onResponse={vi.fn()} />,
    );
    // Should still be on q3 — no re-jump
    await waitFor(() => {
      expect(screen.getByText("3 de 5")).toBeInTheDocument();
    });
  });

  it("displays correct progress stats after 100% restore", async () => {
    const config = makeConfig(4);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );
    rerender(
      <ActivityPlayer config={config} responses={fullResponses(config)} onResponse={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByText("4 de 4 respondidas")).toBeInTheDocument();
    });
  });
});

describe("getCompletionStats", () => {
  it("returns correct stats", async () => {
    const { getCompletionStats } = await import("./ActivityPlayer");
    const config = makeConfig(4);
    expect(getCompletionStats(config, fullResponses(config))).toEqual({
      total: 4, answered: 4, completion: 100, allAnswered: true,
    });
    expect(getCompletionStats(config, partialResponses(config, 2))).toEqual({
      total: 4, answered: 2, completion: 50, allAnswered: false,
    });
    expect(getCompletionStats(config, {})).toEqual({
      total: 4, answered: 0, completion: 0, allAnswered: false,
    });
  });
});
