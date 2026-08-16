import { Link } from "react-router-dom";
import PipelineStatus from "./PipelineStatus";

export default function Header({ pipeline, variant = "app" }) {
  return (
    <header className={`app-header ${variant === "landing" ? "app-header-landing" : ""}`}>
      <Link to="/" className="brand-row">
        <div className="brand-mark">✦</div>
        <div className="brand-copy">
          <h1>PlaceStack</h1>
          <span className="beta-badge">BETA</span>
        </div>
      </Link>

      {pipeline ? (
        <PipelineStatus pipeline={pipeline} compact />
      ) : (
        <nav className="header-nav">
          <a href="#universe">What you can review</a>
          <a href="#roadmap">Roadmap</a>
          <Link to="/plan" className="header-cta">
            Plan a trip →
          </Link>
        </nav>
      )}
    </header>
  );
}
