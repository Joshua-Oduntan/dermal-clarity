import { createServerFn } from "@tanstack/react-start";

export type Dermatologist = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  mapsUrl: string;
  location?: { lat: number; lng: number };
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const findDermatologists = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => {
    const address = String(input?.address ?? "").trim().slice(0, 200);
    if (!address) throw new Error("Address is required");
    return { address };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Google Maps connector is not configured");
    }

    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: `dermatologist near ${data.address}`,
        maxResultCount: 10,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Places API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
        rating?: number;
        userRatingCount?: number;
        googleMapsUri?: string;
      }>;
    };

    const results: Dermatologist[] = (json.places ?? []).map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "Unknown clinic",
      address: p.formattedAddress ?? "",
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      mapsUrl:
        p.googleMapsUri ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          p.displayName?.text ?? data.address,
        )}`,
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : undefined,
    }));

    return { results };
  });
