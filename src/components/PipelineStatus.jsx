import Spinner from "./Spinner";

const stepLabels = {
  gemini: "Step 1 of 2 — Drafting your itinerary with Gemini...",
  groq: "Step 2 of 2 — Refining with Llama 3.3...",
  done: "Done — Your itinerary is ready",
};

export default function PipelineStatus({ pipeline, compact = false }) {
  const activeLabel = stepLabels[pipeline.stage];

  return (
    <div className={compact ? "status-chip status-chip-compact" : "pipeline-card"}>
      {compact ? (
        <>
          <div className="powered-copy">
            <span>Powered by Gemini + Llama</span>
          </div>
          <div className="powered-dots">
            <span className={`ai-dot ai-dot-blue ${pipeline.isGenerating ? "is-pulsing" : ""}`} />
            <span className={`ai-dot ai-dot-green ${pipeline.isGenerating ? "is-pulsing" : ""}`} />
          </div>
        </>
      ) : (
        <>
          <div className="pipeline-list">
            <div className={`pipeline-step ${pipeline.stage === "gemini" ? "is-active" : ""}`}>
              {pipeline.isGenerating && pipeline.stage === "gemini" ? <Spinner small /> : <span>✦</span>}
              <span>{stepLabels.gemini}</span>
            </div>
            <div className={`pipeline-step ${pipeline.stage === "groq" ? "is-active" : ""}`}>
              {pipeline.isGenerating && pipeline.stage === "groq" ? <Spinner small /> : <span>✦</span>}
              <span>{stepLabels.groq}</span>
            </div>
            <div className={`pipeline-step ${pipeline.stage === "done" ? "is-done" : ""}`}>
              <span>{pipeline.stage === "done" ? "✓" : "✦"}</span>
              <span>{stepLabels.done}</span>
            </div>
          </div>
          {pipeline.groqFallback ? (
            <div className="inline-muted">Llama critique fell back gracefully, so you’re seeing the Gemini draft.</div>
          ) : null}
          {pipeline.error ? <div className="inline-error">{pipeline.error}</div> : null}
          {!pipeline.error && activeLabel && pipeline.stage !== "done" ? (
            <div className="inline-muted">{activeLabel}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
