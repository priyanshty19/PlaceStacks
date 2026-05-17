export default function Stars({ rating = 0, size = 14 }) {
  return (
    <span className="stars-row">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} style={{ fontSize: size, color: rating >= index + 1 - 0.2 ? "#F4A535" : "#444" }}>
          ★
        </span>
      ))}
    </span>
  );
}
