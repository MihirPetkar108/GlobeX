import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface GeolocationState {
  status: GeolocationStatus;
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  error: string | null;
}

/**
 * Wraps the browser Geolocation API to fetch the user's live coordinates —
 * used to back the shipping ETA estimate with the buyer's real location
 * rather than an assumed country centroid. Falls back gracefully (status
 * "denied"/"unavailable") so callers can offer a manual country picker.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    lat: null,
    lng: null,
    accuracyMeters: null,
    error: null,
  });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unavailable", error: "Geolocation is not supported by this browser." }));
      return;
    }

    setState((s) => ({ ...s, status: "requesting", error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          error: null,
        });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
          lat: null,
          lng: null,
          accuracyMeters: null,
          error: err.message || "Failed to get your location.",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { ...state, request };
}

export default useGeolocation;
