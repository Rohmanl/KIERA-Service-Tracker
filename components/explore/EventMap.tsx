import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { Building2, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

// Custom pin using lucide MapPin rendered as a divIcon (transparent bg)
const pinSvg = renderToStaticMarkup(
  <MapPin
    size={36}
    strokeWidth={2}
    className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
    style={{ color: "hsl(var(--accent))", fill: "hsl(var(--accent) / 0.85)" }}
  />
);

const eventIcon = L.divIcon({
  html: pinSvg,
  className: "lucide-map-pin",
  iconSize: [36, 36],
  iconAnchor: [18, 34], // bottom tip of pin
  popupAnchor: [0, -32],
});


interface MapEvent {
  id: string;
  title: string;
  org_name: string;
  event_date: string;
  location: string;
}

interface Props {
  events: MapEvent[];
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [33.8366, -117.9143]; // Anaheim, CA
const CACHE_KEY = "event_geocode_cache_v1";

type Coords = { lat: number; lng: number };
type CacheMap = Record<string, Coords | null>;

function loadCache(): CacheMap {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: CacheMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

async function geocode(address: string): Promise<Coords | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export function EventMap({ events, onSelect }: Props) {
  const [coords, setCoords] = useState<Record<string, Coords | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cache = loadCache();
    const initial: Record<string, Coords | null> = {};
    const toFetch: MapEvent[] = [];

    for (const ev of events) {
      const key = ev.location.trim().toLowerCase();
      if (key in cache) {
        initial[ev.id] = cache[key];
      } else {
        toFetch.push(ev);
      }
    }
    setCoords(initial);
    setLoading(toFetch.length > 0);

    (async () => {
      for (const ev of toFetch) {
        if (cancelled) return;
        const key = ev.location.trim().toLowerCase();
        const result = await geocode(ev.location);
        cache[key] = result;
        saveCache(cache);
        if (!cancelled) {
          setCoords((prev) => ({ ...prev, [ev.id]: result }));
        }
        // Respect Nominatim's 1 req/sec usage policy
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [events]);

  const placed = events.filter((ev) => coords[ev.id]);

  return (
    <div className="relative">
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "70vh", minHeight: 480 }}>
        <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {placed.map((ev) => {
            const c = coords[ev.id]!;
            return (
              <Marker key={ev.id} position={[c.lat, c.lng]} icon={eventIcon}>
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div className="font-semibold text-base leading-tight">{ev.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {ev.org_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(ev.event_date + "T00:00:00"), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                    <Button size="sm" className="w-full mt-1" onClick={() => onSelect(ev.id)}>
                      Sign Up / View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      {loading && (
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground shadow">
          Locating events… {placed.length}/{events.length}
        </div>
      )}
      {!loading && placed.length < events.length && (
        <p className="text-xs text-muted-foreground mt-2">
          {events.length - placed.length} event(s) couldn't be located on the map.
        </p>
      )}
    </div>
  );
}
