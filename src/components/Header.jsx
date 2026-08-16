import { Link } from "react-router-dom";
import PipelineStatus from "./PipelineStatus";
import { DesktopNav } from "./AppNav";

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

      {pipeline ? <PipelineStatus pipeline={pipeline} compact /> : <DesktopNav />}

    </header>
  );
}
