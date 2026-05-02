// @vitest-environment jsdom
/**
 * Tests: draft restore → correct question navigation + submit readiness.
 *
 * Validates that when a 100% draft is restored the player jumps to the
 * last question and enables the submit button; when a partial draft is
 * restored it jumps to the first unanswered question.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ActivityPlayer, QuizConfig } from "./ActivityPlayer";

// ---------- helpers ----------

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
  for (const q of config.questions ?? []) {
    r[q.id] = 1;
  }
  return r;
}

function partialResponses(
  config: QuizConfig,
  count: number,
): Record<string, number> {
  const r: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const q = config.questions![i];
    r[q.id] = 1;
  }
  return r;
}

// ---------- tests ----------

describe("ActivityPlayer — draft restore navigation", () => {
  it("starts at question 1 when no responses", () => {
    const config = makeConfig(5);
    render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );
    expect(screen.getByText("1 de 5")).toBeInTheDocument();
    expect(screen.getByText(/Question 1/)).toBeInTheDocument();
  });

  it("jumps to last question on 100% draft restore", () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );

    // Simulate draft restore: 0 → all responses at once
    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={fullResponses(config)}
          onResponse={vi.fn()}
        />,
      );
    });

    expect(screen.getByText("5 de 5")).toBeInTheDocument();
    expect(screen.getByText(/Question 5/)).toBeInTheDocument();
  });

  it("shows submit button (not Next) on last question after 100% restore", () => {
    const config = makeConfig(3);
    const { rerender } = render(
      <ActivityPlayer
        config={config}
        responses={{}}
        onResponse={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={fullResponses(config)}
          onResponse={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
    });

    expect(screen.getByText("3 de 3")).toBeInTheDocument();
    // Submit button should be visible and enabled
    const submitBtn = screen.getByText("Enviar respostas");
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.closest("button")).not.toBeDisabled();
  });

  it("submit button is disabled when submitDisabled=true even with 100% restore", () => {
    const config = makeConfig(3);
    const { rerender } = render(
      <ActivityPlayer
        config={config}
        responses={{}}
        onResponse={vi.fn()}
        onSubmit={vi.fn()}
        submitDisabled
      />,
    );

    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={fullResponses(config)}
          onResponse={vi.fn()}
          onSubmit={vi.fn()}
          submitDisabled
        />,
      );
    });

    const submitBtn = screen.getByText("Enviar respostas");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  it("jumps to first unanswered question on partial draft restore", () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );

    // Restore 3 of 5 → should jump to question 4 (first unanswered)
    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={partialResponses(config, 3)}
          onResponse={vi.fn()}
        />,
      );
    });

    expect(screen.getByText("4 de 5")).toBeInTheDocument();
    expect(screen.getByText(/Question 4/)).toBeInTheDocument();
  });

  it("shows Next button (not Submit) on partial restore", () => {
    const config = makeConfig(5);
    const { rerender } = render(
      <ActivityPlayer
        config={config}
        responses={{}}
        onResponse={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={partialResponses(config, 3)}
          onResponse={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
    });

    // Should show "Próxima" not "Enviar respostas"
    expect(screen.getByText("Próxima")).toBeInTheDocument();
    expect(screen.queryByText("Enviar respostas")).not.toBeInTheDocument();
  });

  it("does NOT re-jump when responses update incrementally (not a restore)", () => {
    const config = makeConfig(5);
    // Start with 2 responses already (simulates user already answering)
    const initial = partialResponses(config, 2);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={initial} onResponse={vi.fn()} />,
    );

    // Add one more response (incremental, not restore from 0)
    const updated = { ...initial, q3: 1 };
    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={updated}
          onResponse={vi.fn()}
        />,
      );
    });

    // Should stay on question 3 (where the component was), not jump
    // Since we started with 2 responses, the initial render would have
    // jumped to q3 already. The incremental update should not change position.
    expect(screen.getByText("3 de 5")).toBeInTheDocument();
  });

  it("displays correct progress stats after 100% restore", () => {
    const config = makeConfig(4);
    const { rerender } = render(
      <ActivityPlayer config={config} responses={{}} onResponse={vi.fn()} />,
    );

    act(() => {
      rerender(
        <ActivityPlayer
          config={config}
          responses={fullResponses(config)}
          onResponse={vi.fn()}
        />,
      );
    });

    expect(screen.getByText("4 de 4 respondidas")).toBeInTheDocument();
  });
});

describe("getCompletionStats", () => {
  // Imported inline to avoid circular dep issues in test
  it("returns correct stats", async () => {
    const { getCompletionStats } = await import("./ActivityPlayer");
    const config = makeConfig(4);
    const full = fullResponses(config);
    const partial = partialResponses(config, 2);

    expect(getCompletionStats(config, full)).toEqual({
      total: 4,
      answered: 4,
      completion: 100,
      allAnswered: true,
    });

    expect(getCompletionStats(config, partial)).toEqual({
      total: 4,
      answered: 2,
      completion: 50,
      allAnswered: false,
    });

    expect(getCompletionStats(config, {})).toEqual({
      total: 4,
      answered: 0,
      completion: 0,
      allAnswered: false,
    });
  });
});
