const milestones = [
  {
    status: "shipped",
    title: "AI itinerary planner",
    copy: "Plan a trip anywhere in India, mapped stop by stop.",
  },
  {
    status: "building",
    title: "Universal review search",
    copy: "Ask about any place, dish, stay or route and get one synthesised answer instead of ten tabs.",
  },
  {
    status: "next",
    title: "Review it while you are there",
    copy: "Capture a verdict in seconds from wherever you are standing — pinned to the exact spot.",
  },
  {
    status: "next",
    title: "Visit-verified reviews",
    copy: "Reviews weighted by people who actually turned up, so the ratings mean something again.",
  },
];

const statusLabel = {
  shipped: "Live",
  building: "Building",
  next: "Next",
};

export default function Roadmap() {
  return (
    <section className="landing-section" id="roadmap">
      <div className="section-head">
        <span className="landing-eyebrow">Where this goes</span>
        <h3>The planner is the beginning, not the product.</h3>
        <p>Being straight about what exists today and what does not.</p>
      </div>

      <ul className="roadmap-list">
        {milestones.map((milestone) => (
          <li key={milestone.title} className={`roadmap-item is-${milestone.status}`}>
            <span className="roadmap-marker" aria-hidden="true" />
            <div className="roadmap-body">
              <div className="roadmap-title">
                <h4>{milestone.title}</h4>
                <span className={`roadmap-tag tag-${milestone.status}`}>{statusLabel[milestone.status]}</span>
              </div>
              <p>{milestone.copy}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
