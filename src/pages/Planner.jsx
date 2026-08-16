import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import MobileTabBar from "../components/AppNav";
import InputForm from "../components/InputForm";
import ItineraryPanel from "../components/ItineraryPanel";
import MapPanel from "../components/MapPanel";
import NearbySidebar from "../components/NearbySidebar";
import ReviewPanel from "../components/ReviewPanel";
import { createMapController, loadGoogleMapsScript } from "../utils/maps";
import { generateItinerary, fetchNearbyPlaces } from "../utils/places";
import { buildTripSummaryBar, normalizeItinerary } from "../utils/helpers";

const initialTripForm = {
  from: { name: "", lat: null, lng: null },
  to: { name: "", lat: null, lng: null },
  startDate: "",
  endDate: "",
  people: 2,
  budget: "Mid-range",
  interests: ["Culture", "Food"],
};

const initialPipeline = {
  isGenerating: false,
  stage: "idle",
  error: "",
  groqFallback: false,
};

export default function Planner() {
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [tripForm, setTripForm] = useState(initialTripForm);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [itinerary, setItinerary] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [hoveredPlaceId, setHoveredPlaceId] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [reviewPlace, setReviewPlace] = useState(null);
  const [ratings, setRatings] = useState({});
  const [nearbyState, setNearbyState] = useState({
    open: false,
    sourcePlace: null,
    activeTab: "eat",
  });

  const mapNodeRef = useRef(null);
  const mapControllerRef = useRef(null);
  const dayRefs = useRef({});
  const nearbyCacheRef = useRef(new Map());
  const pipelineTimersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMapsError(error.message || "Unable to load Google Maps.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapNodeRef.current || mapControllerRef.current) {
      return;
    }

    mapControllerRef.current = createMapController(mapNodeRef.current, {
      onMarkerClick: (place) => {
        setSelectedPlace(place);
      },
      onNearbyRequest: (place) => {
        setSelectedPlace(place);
        setNearbyState({
          open: true,
          sourcePlace: place,
          activeTab: "eat",
        });
      },
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!itinerary || !mapControllerRef.current) {
      return;
    }

    mapControllerRef.current.plotItinerary(itinerary);
  }, [itinerary]);

  useEffect(() => {
    if (!mapControllerRef.current) {
      return;
    }

    mapControllerRef.current.setHoveredPlace(hoveredPlaceId || null);
  }, [hoveredPlaceId]);

  useEffect(() => () => {
    pipelineTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const summaryBar = useMemo(() => buildTripSummaryBar(tripForm), [tripForm]);

  const setPipelineTimers = () => {
    pipelineTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pipelineTimersRef.current = [
      window.setTimeout(() => {
        setPipeline((current) => (current.isGenerating ? { ...current, stage: "gemini" } : current));
      }, 0),
      window.setTimeout(() => {
        setPipeline((current) => (current.isGenerating ? { ...current, stage: "groq" } : current));
      }, 2600),
    ];
  };

  const handleSubmit = async () => {
    setPipeline({
      isGenerating: true,
      stage: "gemini",
      error: "",
      groqFallback: false,
    });
    setPipelineTimers();

    try {
      const response = await generateItinerary(tripForm);
      const normalized = normalizeItinerary(response.itinerary);

      setItinerary(normalized);
      setActiveDay(1);
      setSelectedPlace(null);
      setFormCollapsed(true);
      setPipeline((current) => ({
        ...current,
        isGenerating: false,
        stage: "done",
        groqFallback: Boolean(response.meta?.groqFallback),
      }));
    } catch (error) {
      setPipeline({
        isGenerating: false,
        stage: "idle",
        error: error.message || "Unable to generate itinerary.",
        groqFallback: false,
      });
    } finally {
      pipelineTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pipelineTimersRef.current = [];
    }
  };

  const handleDaySelect = (day) => {
    setActiveDay(day.day);
    dayRefs.current[day.day]?.scrollIntoView({ behavior: "smooth", block: "start" });
    mapControllerRef.current?.fitToPlaces(day.allPlaces || []);
  };

  const handleMapPlace = (place) => {
    setSelectedPlace(place);
    mapControllerRef.current?.focusPlace(place.clientId, true);
  };

  const handleNearbyOpen = (place) => {
    setSelectedPlace(place);
    setNearbyState({
      open: true,
      sourcePlace: place,
      activeTab: "eat",
    });
  };

  return (
    <div className="app-shell">
      <Header pipeline={pipeline} />
      <main className="app-main">
        <section className="left-column">
          <InputForm
            form={tripForm}
            onChange={setTripForm}
            onSubmit={handleSubmit}
            pipeline={pipeline}
            collapsed={formCollapsed}
            onToggleCollapsed={() => setFormCollapsed((value) => !value)}
            summaryBar={summaryBar}
            mapsReady={mapsReady}
          />

          <ItineraryPanel
            itinerary={itinerary}
            activeDay={activeDay}
            onSelectDay={handleDaySelect}
            dayRefs={dayRefs}
            onHoverPlace={setHoveredPlaceId}
            onLeavePlace={() => setHoveredPlaceId("")}
            onMapPlace={handleMapPlace}
            onNearbyPlace={handleNearbyOpen}
            onReviewPlace={setReviewPlace}
            ratings={ratings}
            pipeline={pipeline}
          />
        </section>

        <section className="right-column">
          <MapPanel mapNodeRef={mapNodeRef} mapsReady={mapsReady} mapsError={mapsError} />
          <NearbySidebar
            open={nearbyState.open}
            activeTab={nearbyState.activeTab}
            onTabChange={(tab) => setNearbyState((current) => ({ ...current, activeTab: tab }))}
            onClose={() => setNearbyState((current) => ({ ...current, open: false }))}
            sourcePlace={nearbyState.sourcePlace || selectedPlace}
            cacheRef={nearbyCacheRef}
            fetchNearbyPlaces={fetchNearbyPlaces}
            onFocusPlace={(place) => mapControllerRef.current?.showNearbyResult(place)}
          />

        </section>

        {reviewPlace ? (
          <ReviewPanel
            // Remount per place: a draft written for one fort must not follow
            // you to the next one. Cheaper and safer than resetting by hand.
            key={reviewPlace.clientId}
            place={reviewPlace}
            onClose={() => setReviewPlace(null)}
            onRatingChange={(clientId, place) =>
              setRatings((current) => ({ ...current, [clientId]: place }))
            }
          />
        ) : null}
      </main>
      <MobileTabBar />
    </div>
  );
}
