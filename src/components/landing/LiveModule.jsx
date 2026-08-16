import { Link } from "react-router-dom";

const highlights = [
  "Day-by-day plan across morning, afternoon and evening",
  "Every stop mapped, in the order you would actually walk it",
  "Tap any stop to see what is worth eating, seeing or staying at nearby",
];

export default function LiveModule() {
  return (
    <section className="landing-section">
      <div className="live-module panel-card">
        <div className="live-copy">
          <span className="status-tag">
            <span className="live-dot" /> Live now
          </span>

          <h3>Module one — the itinerary planner</h3>
          <p>
            Reviews are most useful when they arrive attached to a plan. So the first thing we built
            is the plan: tell it where you are going, how long, and what you are into, and it drafts
            a real itinerary of named places, then puts them on a map.
          </p>

          <ul className="live-list">
            {highlights.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✦</span>
                {item}
              </li>
            ))}
          </ul>

          <Link to="/plan" className="primary-button live-cta">
            Open the planner →
          </Link>
        </div>

        <div className="live-visual" aria-hidden="true">
          <div className="visual-day">
            <span className="visual-day-badge">1</span>
            <div>
              <strong>Arrival &amp; old city</strong>
              <span>Tue, 01 Sept</span>
            </div>
          </div>

          <div className="visual-block">
            <span className="visual-time">Morning</span>
            <div className="visual-card type-see">
              <span className="visual-chip">Attraction</span>
              <strong>Amber Fort</strong>
              <span className="visual-meta">2–3 hours · ₹₹</span>
            </div>
          </div>

          <div className="visual-block">
            <span className="visual-time">Afternoon</span>
            <div className="visual-card type-eat">
              <span className="visual-chip">Food</span>
              <strong>Laxmi Mishthan Bhandar</strong>
              <span className="visual-meta">1 hour · ₹</span>
            </div>
          </div>

          <div className="visual-block">
            <span className="visual-time">Evening</span>
            <div className="visual-card type-stay">
              <span className="visual-chip">Experience</span>
              <strong>Chokhi Dhani</strong>
              <span className="visual-meta">3–4 hours · ₹₹</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
