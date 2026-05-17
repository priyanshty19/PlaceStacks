import { useEffect, useRef } from "react";
import PipelineStatus from "./PipelineStatus";
import { clampPeople, getDateConstraints } from "../utils/helpers";

const interests = ["Culture", "Food", "Nature", "Nightlife", "Adventure", "Shopping", "History", "Wellness"];
const budgets = ["Budget", "Mid-range", "Premium"];

function attachAutocomplete(input, onSelect) {
  if (!window.google?.maps?.places || !input) {
    return null;
  }

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "in" },
    fields: ["formatted_address", "geometry", "name"],
  });

  const listener = autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    onSelect({
      name: place.name || input.value,
      lat: place.geometry?.location?.lat?.() ?? null,
      lng: place.geometry?.location?.lng?.() ?? null,
    });
  });

  return () => {
    window.google.maps.event.removeListener(listener);
  };
}

export default function InputForm({
  form,
  onChange,
  onSubmit,
  pipeline,
  collapsed,
  onToggleCollapsed,
  summaryBar,
  mapsReady,
}) {
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    if (!mapsReady) {
      return undefined;
    }

    const cleanupFrom = attachAutocomplete(fromRef.current, (value) =>
      onChange((current) => ({ ...current, from: value })),
    );
    const cleanupTo = attachAutocomplete(toRef.current, (value) =>
      onChange((current) => ({ ...current, to: value })),
    );

    return () => {
      cleanupFrom?.();
      cleanupTo?.();
    };
  }, [mapsReady, onChange]);

  const constraints = getDateConstraints(form.startDate);

  if (collapsed) {
    return (
      <section className="summary-bar panel-card">
        <div>{summaryBar}</div>
        <button type="button" className="ghost-button" onClick={onToggleCollapsed}>
          Edit ↑
        </button>
      </section>
    );
  }

  return (
    <section className="panel-card input-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">AI-powered itinerary planner for India</div>
          <h2>Plan My Trip</h2>
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>From</span>
          <input
            ref={fromRef}
            className="field"
            type="text"
            placeholder="Delhi"
            value={form.from.name}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                from: { ...current.from, name: event.target.value },
              }))
            }
          />
        </label>

        <label>
          <span>To</span>
          <input
            ref={toRef}
            className="field"
            type="text"
            placeholder="Goa"
            value={form.to.name}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                to: { ...current.to, name: event.target.value },
              }))
            }
          />
        </label>

        <label>
          <span>Start Date</span>
          <input
            className="field"
            type="date"
            min={constraints.minStart}
            value={form.startDate}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                startDate: event.target.value,
                endDate:
                  current.endDate && current.endDate < event.target.value ? event.target.value : current.endDate,
              }))
            }
          />
        </label>

        <label>
          <span>End Date</span>
          <input
            className="field"
            type="date"
            min={constraints.minEnd}
            max={constraints.maxEnd}
            value={form.endDate}
            onChange={(event) => onChange((current) => ({ ...current, endDate: event.target.value }))}
          />
        </label>
      </div>

      <div className="people-row">
        <span>People</span>
        <div className="stepper">
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange((current) => ({ ...current, people: clampPeople(current.people - 1) }))}
          >
            −
          </button>
          <strong>{form.people}</strong>
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange((current) => ({ ...current, people: clampPeople(current.people + 1) }))}
          >
            +
          </button>
        </div>
      </div>

      <div>
        <span className="field-label">Budget</span>
        <div className="segmented-row">
          {budgets.map((budget) => (
            <button
              key={budget}
              type="button"
              className={`segment-pill ${form.budget === budget ? "is-active" : ""}`}
              onClick={() => onChange((current) => ({ ...current, budget }))}
            >
              {budget === "Budget" ? "₹ Budget" : budget === "Mid-range" ? "₹₹ Mid-range" : "₹₹₹ Premium"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Interests</span>
        <div className="interest-row">
          {interests.map((interest) => {
            const active = form.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                className={`interest-pill ${active ? "is-active" : ""}`}
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    interests: active
                      ? current.interests.filter((item) => item !== interest)
                      : [...current.interests, interest],
                  }))
                }
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="primary-button submit-button" disabled={pipeline.isGenerating} onClick={onSubmit}>
        {pipeline.isGenerating
          ? pipeline.stage === "groq"
            ? "Refining with Llama..."
            : "Drafting with Gemini..."
          : "Plan My Trip →"}
      </button>

      <PipelineStatus pipeline={pipeline} />
    </section>
  );
}
