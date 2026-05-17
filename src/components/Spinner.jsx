export default function Spinner({ label, small = false }) {
  return (
    <span className={`spinner-wrap ${small ? "is-small" : ""}`}>
      <span className="spinner-ring" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
