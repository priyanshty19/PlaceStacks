const steps = [
  {
    number: "01",
    title: "Drafted",
    copy: "Gemini turns your route, dates, budget and interests into a structured plan of real, named places.",
  },
  {
    number: "02",
    title: "Edited",
    copy: "Llama 3.3 passes over it like a local editor — fixing the order, cutting the tourist traps, sharpening the detail.",
  },
  {
    number: "03",
    title: "Located",
    copy: "Every stop is geocoded and plotted, so the plan is something you can follow rather than read.",
  },
  {
    number: "04",
    title: "Reviewed",
    copy: "Next: an honest verdict attached to each stop, and to everything you find between them.",
    upcoming: true,
  },
];

export default function HowItWorks() {
  return (
    <section className="landing-section" id="how">
      <div className="section-head">
        <span className="landing-eyebrow">How it works</span>
        <h3>Two models, one map, no filler.</h3>
      </div>

      <ol className="steps-row">
        {steps.map((step) => (
          <li key={step.number} className={`step-card panel-card ${step.upcoming ? "is-upcoming" : ""}`}>
            <span className="step-number">{step.number}</span>
            <h4>
              {step.title}
              {step.upcoming ? <span className="soon-tag">Soon</span> : null}
            </h4>
            <p>{step.copy}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
