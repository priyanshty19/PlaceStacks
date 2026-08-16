const categories = [
  { icon: "🛕", title: "Places", copy: "Forts, temples, viewpoints, markets, that unmarked lane everyone says to walk down." },
  { icon: "🍽", title: "Food", copy: "From tasting menus to the cart outside the station — the cart usually wins." },
  { icon: "🏨", title: "Stays", copy: "Homestays, hostels, heritage hotels. What the photos left out." },
  { icon: "🚕", title: "Getting around", copy: "Routes, fares, night buses, whether the ferry actually runs in monsoon." },
  { icon: "🎟", title: "Experiences", copy: "Guides, workshops, treks, ticket queues worth their wait." },
  { icon: "🛍", title: "Things", copy: "The shop, the fabric, the price you should have paid." },
];

export default function ReviewUniverse() {
  return (
    <section className="landing-section" id="universe">
      <div className="section-head">
        <span className="landing-eyebrow">The universal part</span>
        <h3>Most review sites cover one slice. A trip is not one slice.</h3>
        <p>
          You book a stay in one app, find dinner in another, and then stand in front of a ticket
          counter with no idea whether it is worth it. Every one of those is a review problem, and
          they all belong in the same place.
        </p>
      </div>

      <div className="universe-grid">
        {categories.map((category) => (
          <article key={category.title} className="universe-card panel-card">
            <span className="universe-icon" aria-hidden="true">
              {category.icon}
            </span>
            <h4>{category.title}</h4>
            <p>{category.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
