import PipelineStatus from "./PipelineStatus";

export default function Header({ pipeline }) {
  return (
    <header className="app-header">
      <div className="brand-row">
        <div className="brand-mark">✦</div>
        <div className="brand-copy">
          <h1>PlaceStack</h1>
          <span className="beta-badge">BETA</span>
        </div>
      </div>
      <PipelineStatus pipeline={pipeline} compact />
    </header>
  );
}
