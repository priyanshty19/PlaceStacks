import { Link } from "react-router-dom";

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-cta panel-card">
        <div>
          <h3>Start with a trip.</h3>
          <p>The review layer is coming. The planner works today.</p>
        </div>
        <Link to="/plan" className="primary-button">
          Plan my trip →
        </Link>
      </div>

      <div className="footer-base">
        <div className="brand-row">
          <span className="brand-mark">✦</span>
          <strong>PlaceStack</strong>
        </div>
        <span className="footer-meta">Built for India first · Powered by Gemini + Llama</span>
      </div>
    </footer>
  );
}
