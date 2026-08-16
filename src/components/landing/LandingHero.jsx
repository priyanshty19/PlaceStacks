import { Link } from "react-router-dom";

const anchors = [
  { label: "Any place", detail: "A fort, a beach, a backstreet café" },
  { label: "Any thing", detail: "The thali, the room, the guide, the ride" },
  { label: "Any location", detail: "Wherever you happen to be standing" },
];

export default function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="hero-glow" aria-hidden="true" />

      <div className="hero-inner">
        <span className="landing-eyebrow">Universal reviews for everywhere you go</span>

        <h2 className="hero-title">
          Review <em>anything</em> you meet on the way.
        </h2>

        <p className="hero-lede">
          Travel reviews are scattered across a dozen apps and none of them know where you are or what
          you are doing. PlaceStack is building one layer over all of it — so the thing in front of you,
          whatever it is, already has an honest answer waiting.
        </p>

        <div className="hero-actions">
          <Link to="/plan" className="primary-button hero-cta">
            Plan a trip →
          </Link>
          <a href="#universe" className="ghost-button hero-ghost">
            See what that means
          </a>
        </div>

        <p className="hero-note">
          <span className="live-dot" /> The AI itinerary planner is live today. The review layer is next.
        </p>

        <ul className="hero-anchors">
          {anchors.map((anchor) => (
            <li key={anchor.label}>
              <strong>{anchor.label}</strong>
              <span>{anchor.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
