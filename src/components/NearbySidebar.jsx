import { useEffect, useMemo, useState } from "react";
import NearbyPlaceCard from "./NearbyPlaceCard";
import Spinner from "./Spinner";

const tabs = [
  { id: "eat", label: "🍽 Eat", type: "restaurant", colorClass: "tab-eat" },
  { id: "coffee", label: "☕ Coffee", type: "cafe", colorClass: "tab-coffee" },
  { id: "see", label: "👁 See", type: "tourist_attraction", colorClass: "tab-see" },
  { id: "stay", label: "🏨 Stay", type: "lodging", colorClass: "tab-stay" },
];

export default function NearbySidebar({
  open,
  activeTab,
  onTabChange,
  onClose,
  sourcePlace,
  cacheRef,
  fetchNearbyPlaces,
  onFocusPlace,
}) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    items: [],
  });

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === activeTab) || tabs[0], [activeTab]);

  useEffect(() => {
    if (!open || !sourcePlace?.coordinates) {
      return;
    }

    const cacheKey = `${sourcePlace.clientId}_${selectedTab.id}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setState({
        loading: false,
        error: "",
        items: cached,
      });
      return;
    }

    setState({
      loading: true,
      error: "",
      items: [],
    });

    fetchNearbyPlaces({
      lat: sourcePlace.coordinates.lat,
      lng: sourcePlace.coordinates.lng,
      type: selectedTab.type,
      radius: 1000,
    })
      .then((items) => {
        cacheRef.current.set(cacheKey, items);
        setState({
          loading: false,
          error: "",
          items,
        });
      })
      .catch((error) => {
        setState({
          loading: false,
          error: error.message || "Unable to load nearby places.",
          items: [],
        });
      });
  }, [activeTab, cacheRef, fetchNearbyPlaces, open, selectedTab.id, selectedTab.type, sourcePlace]);

  return (
    <aside className={`nearby-sidebar ${open ? "is-open" : ""}`}>
      <div className="nearby-header">
        <div>
          <h3>{sourcePlace?.name || "Nearby places"}</h3>
          <p>Nearby places</p>
        </div>
        <button type="button" className="ghost-button close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="nearby-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nearby-tab ${tab.colorClass} ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="nearby-content">
        {state.loading ? <Spinner label="Loading nearby places..." /> : null}
        {state.error ? <div className="inline-error">{state.error}</div> : null}
        {state.items.map((item) => (
          <NearbyPlaceCard key={item.id} place={item} sourcePlace={sourcePlace} onClick={() => onFocusPlace(item)} />
        ))}
      </div>
    </aside>
  );
}
