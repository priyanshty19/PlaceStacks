import { Link, useLocation } from "react-router-dom";

// One list, two presentations: a row in the header on desktop, a tab bar pinned
// to the bottom on phones. Same routes, so there is nothing to keep in sync.
const TABS = [
  { to: "/", label: "Home", icon: "✦" },
  { to: "/reviews", label: "Reviews", icon: "★" },
  { to: "/plan", label: "Plan", icon: "🧭" },
];

export function DesktopNav() {
  const { pathname } = useLocation();

  return (
    <nav className="header-nav desktop-nav">
      {TABS.filter((tab) => tab.to !== "/").map((tab) => (
        <Link key={tab.to} to={tab.to} className={pathname === tab.to ? "is-current" : ""}>
          {tab.label}
        </Link>
      ))}
      <Link to="/plan" className="header-cta">
        Plan a trip →
      </Link>
    </nav>
  );
}

export default function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="mobile-tab-bar" aria-label="Primary">
      {TABS.map((tab) => {
        const current = pathname === tab.to;

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`tab-item ${current ? "is-current" : ""}`}
            aria-current={current ? "page" : undefined}
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
