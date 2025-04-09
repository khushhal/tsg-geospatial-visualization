import {
  CensusProfile,
  FeatureCollection,
  NearbyCity,
  Region,
} from "@/types/geo";

/**
 * Helper to make GET requests to a given endpoint
 */
const fetchGet = async <T>(endpoint: string): Promise<T> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
  }
  return res.json();
};

/**
 * Helper to make POST requests with JSON body
 */
const fetchPost = async <T>(endpoint: string, body: object): Promise<T> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to post ${endpoint}: ${res.statusText}`);
  }
  return res.json();
};

/**
 * Fetch census demographic + economic profile by type and UUID
 */
export const fetchCensusData = (
  type: string,
  objectUuid: string
): Promise<CensusProfile> => fetchGet(`/census/profile/${type}/${objectUuid}/`);

/**
 * Fetch geographic boundaries for a given type, bbox, and zoom
 */
export const fetchBoundaries = (
  type: string,
  bbox: string,
  zoom: number
): Promise<FeatureCollection> =>
  fetchGet(`/boundaries/?type=${type}&bbox=${bbox}&zoom=${zoom}`);

/**
 * Fetch cities within a given radius (meters) of lat/lng
 */
export const fetchNearbyCities = (
  lat: number,
  lng: number,
  radius = 25000
): Promise<NearbyCity[]> =>
  fetchGet(`/query/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`);

/**
 * Fetch the encompassing city/county/MSA for a given point
 */
export const fetchEncompassingRegions = (
  lat: number,
  lng: number
): Promise<Region> => fetchGet(`/query/encompassing/?lat=${lat}&lng=${lng}`);

/**
 * Fetch all cities contained within a drawn polygon
 */
export const fetchByPolygon = (
  geometry: GeoJSON.Geometry
): Promise<NearbyCity[]> => fetchPost(`/query/by-polygon/`, { geometry });
