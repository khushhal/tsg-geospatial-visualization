import React, { useState, useEffect, useRef } from "react";
import mapboxgl, { MapMouseEvent } from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, Pencil } from "lucide-react";

import { BOUNDARY_COLORS, BOUNDARY_HOVER_COLORS } from "@/global_constants";
import {
  fetchBoundaries,
  fetchNearbyCities,
  fetchEncompassingRegions,
  fetchByPolygon,
  fetchCensusData,
} from "@/lib/api";
import {
  BoundaryType,
  CensusProfile,
  Feature,
  NearbyCity,
  Region,
} from "@/types/geo";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";

// Replace with your actual Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

type MapEventHandler = (e: MapMouseEvent) => void;
interface MapModeChangeEvent {
  mode: "draw_polygon" | "simple_select" | "direct_select" | string;
}
interface BoundaryClickEvent extends MapMouseEvent {
  features?: Feature[];
  lngLat: {
    lng: number;
    lat: number;
  };
}

// Component props interface
interface MapboxBoundariesProps {
  onCensusProfileChange?: (data: CensusProfile) => void;
}

// Main component
const MapboxBoundaries: React.FC<MapboxBoundariesProps> = ({
  onCensusProfileChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const latestBoundaryType = useRef<BoundaryType>("state");
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const boundaryClickHandlerRef = useRef<MapEventHandler | null>(null);
  const mapClickHandlerRef = useRef<MapEventHandler | null>(null);

  // Keep track of loaded features to prevent duplicates and maintain colors
  const loadedFeaturesRef = useRef<Map<string, Feature>>(new Map());

  const [boundaryType, setBoundaryType] = useState<BoundaryType>("state");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);
  const [loadingPolygonResults, setLoadingPolygonResults] =
    useState<boolean>(false);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(false);
  const [loadingCensus, setLoadingCensus] = useState<boolean>(false);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [nearbyCities, setNearbyCities] = useState<NearbyCity[]>([]);
  const [polygonResults, setPolygonResults] = useState<NearbyCity[]>([]);
  const [encompassingRegions, setEncompassingRegions] = useState<Region | null>(
    null
  );
  const [hasPolygon, setHasPolygon] = useState<boolean>(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v10",
      center: [-119.4179, 36.7783],
      zoom: 5,
    });

    // Initialize drawing control with higher contrast colors
    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      // Limit to one polygon
      styles: [
        // Base polygon style - higher opacity and contrast
        {
          id: "gl-draw-polygon-fill-inactive",
          type: "fill",
          filter: [
            "all",
            ["==", "active", "false"],
            ["==", "$type", "Polygon"],
          ],
          paint: {
            "fill-color": "#3bb2d0",
            "fill-outline-color": "#3bb2d0",
            "fill-opacity": 0.3, // Increased from 0.1
          },
        },
        // Active polygon style - higher opacity and contrast
        {
          id: "gl-draw-polygon-fill-active",
          type: "fill",
          filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": "#fbb03b",
            "fill-outline-color": "#fbb03b",
            "fill-opacity": 0.3, // Increased from 0.1
          },
        },
        // Vertex points - larger for better interaction
        {
          id: "gl-draw-polygon-midpoint",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
          paint: {
            "circle-radius": 4, // Increased from 3
            "circle-color": "#fbb03b",
          },
        },
        // Polygon outline style - thicker and more visible
        {
          id: "gl-draw-polygon-stroke-inactive",
          type: "line",
          filter: [
            "all",
            ["==", "active", "false"],
            ["==", "$type", "Polygon"],
          ],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#3bb2d0",
            "line-width": 3, // Increased from 2
            "line-opacity": 0.9, // Added for more visibility
          },
        },
        // Active polygon outline - thicker and more visible
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#fbb03b",
            "line-dasharray": [0.2, 2],
            "line-width": 3, // Increased from 2
            "line-opacity": 0.9, // Added for more visibility
          },
        },
        // Vertex point halos - larger for better interaction
        {
          id: "gl-draw-polygon-and-line-vertex-halo-inactive",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
          paint: {
            "circle-radius": 6, // Increased from 5
            "circle-color": "#fff",
          },
        },
        // Vertex points - larger for better interaction
        {
          id: "gl-draw-polygon-and-line-vertex-inactive",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
          paint: {
            "circle-radius": 4, // Increased from 3
            "circle-color": "#fbb03b",
          },
        },
      ],
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Initialize map when loaded
    mapRef.current.on("load", () => {
      // Add the draw control to the map
      mapRef.current?.addControl(drawRef.current, "top-left");

      initializeMapLayers();
      setupEventHandlers();
      loadBoundaries();
    });

    // Initialize popup for city names
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "300px",
    });

    return () => {
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      // Reset the loaded features when unmounting
      loadedFeaturesRef.current = new Map();
    };
  }, []);

  // Handle draw.create and draw.delete events
  useEffect(() => {
    if (!mapRef.current || !drawRef.current) return;

    // Function to handle when polygon drawing starts
    const handleDrawStart = () => {
      // If there's already a polygon, delete it before drawing a new one
      if (hasPolygon) {
        drawRef.current.deleteAll();
        setPolygonResults([]);

        // Clear polygon results
        const resultsSource = mapRef.current?.getSource("polygon-results");
        if (resultsSource) {
          resultsSource.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      }
    };

    // Function to handle when a polygon is created
    const handleDrawCreate = async (
      e: MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      }
    ) => {
      if (e.features && e.features.length > 0) {
        const polygon = e.features[0];

        // Set hasPolygon to true
        setHasPolygon(true);

        // Call API with the polygon geometry
        await fetchPolygonResults(polygon.geometry);

        // Exit drawing mode
        setDrawingMode(false);
      }
    };

    // Function to handle when a polygon is deleted
    const handleDrawDelete = () => {
      // Clear polygon results
      setPolygonResults([]);
      setHasPolygon(false);

      // Clear polygon results source
      const resultsSource = mapRef.current?.getSource("polygon-results");
      if (resultsSource) {
        resultsSource.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    };

    // Handle mode change
    const handleModeChange = (e: MapModeChangeEvent) => {
      if (e.mode === "draw_polygon") {
        handleDrawStart();
      } else if (e.mode === "simple_select" || e.mode === "direct_select") {
        if (drawingMode) {
          // Only exit drawing mode if we were in drawing mode
          setDrawingMode(false);

          // Re-enable all map interactions
          enableMapInteractions();
        }
      }
    };

    // Add event listeners
    mapRef.current.on("draw.create", handleDrawCreate);
    mapRef.current.on("draw.delete", handleDrawDelete);
    mapRef.current.on("draw.modechange", handleModeChange);

    // Clean up event listeners
    return () => {
      if (mapRef.current) {
        mapRef.current.off("draw.create", handleDrawCreate);
        mapRef.current.off("draw.delete", handleDrawDelete);
        mapRef.current.off("draw.modechange", handleModeChange);
      }
    };
  }, [mapRef.current, drawRef.current, drawingMode, hasPolygon]);

  // Initialize map sources and layers
  const initializeMapLayers = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Add source for boundaries
    map.addSource("boundaries", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    // Add source for selected feature
    map.addSource("selected-feature", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    // Add source for nearby cities
    map.addSource("nearby-cities", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    // Add source for polygon results
    map.addSource("polygon-results", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    // Add fill layer for boundaries using expressions for hover effect
    map.addLayer({
      id: "boundaries-fill",
      type: "fill",
      source: "boundaries",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.7,
      },
    });

    // Add hover layer (separate layer for hover effect)
    map.addLayer({
      id: "boundaries-hover",
      type: "fill",
      source: "boundaries",
      paint: {
        "fill-color": ["get", "hoverColor"],
        "fill-opacity": 0.7,
      },
      // This is the key - only show this layer when hovering
      filter: ["==", ["get", "uuid"], ""],
    });

    // Add line layer for boundaries with normal state
    map.addLayer({
      id: "boundaries-line",
      type: "line",
      source: "boundaries",
      paint: {
        "line-color": "rgba(0, 0, 0, 0.3)",
        "line-width": 1,
        "line-opacity": 0.5,
      },
    });

    // Add hover line effect (separate layer)
    map.addLayer({
      id: "boundaries-line-hover",
      type: "line",
      source: "boundaries",
      paint: {
        "line-color": "#000000",
        "line-width": 3,
        "line-opacity": 0.9,
      },
      // This is the key - only show this layer when hovering
      filter: ["==", ["get", "uuid"], ""],
    });

    // Add line layer for selected feature
    map.addLayer({
      id: "selected-feature-line",
      type: "line",
      source: "selected-feature",
      paint: {
        "line-color": "#000000",
        "line-width": 3,
      },
    });

    // Add label layer for boundaries
    map.addLayer({
      id: "boundaries-label",
      type: "symbol",
      source: "boundaries",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1,
      },
    });

    // Add marker layer for selected point
    map.addLayer({
      id: "selected-marker",
      type: "circle",
      source: "selected-feature",
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 8,
        "circle-color": "#FF0000",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFFFFF",
        "circle-opacity": 0.9,
      },
    });

    // Add nearby cities layer (on top)
    map.addLayer({
      id: "nearby-cities",
      type: "circle",
      source: "nearby-cities",
      paint: {
        "circle-radius": 5,
        "circle-color": "#3887be",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#FFFFFF",
        "circle-opacity": 0.8,
      },
    });

    // Add polygon results layer (with a different color)
    map.addLayer({
      id: "polygon-results",
      type: "circle",
      source: "polygon-results",
      paint: {
        "circle-radius": 5,
        "circle-color": "#6b35e6", // Purple
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#FFFFFF",
        "circle-opacity": 0.8,
      },
    });
  };

  // Set up map event handlers
  const setupEventHandlers = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Mouse enter events - use simple filter update for hover
    map.on("mousemove", "boundaries-fill", (e) => {
      // Skip if in drawing mode
      if (drawingMode) return;

      if (!e.features || e.features.length === 0) return;

      map.getCanvas().style.cursor = "pointer";
      const feature = e.features[0];
      const featureId = feature.properties.uuid;

      // Update the filter on hover layers to show only the current feature
      map.setFilter("boundaries-hover", ["==", ["get", "uuid"], featureId]);
      map.setFilter("boundaries-line-hover", [
        "==",
        ["get", "uuid"],
        featureId,
      ]);
    });

    // Mouse leave events - clear hover
    map.on("mouseleave", "boundaries-fill", () => {
      // Skip if in drawing mode
      if (drawingMode) return;

      map.getCanvas().style.cursor = "";

      // Clear the hover by setting an impossible filter
      map.setFilter("boundaries-hover", ["==", ["get", "uuid"], ""]);
      map.setFilter("boundaries-line-hover", ["==", ["get", "uuid"], ""]);
    });

    // Mouse enter events for nearby cities
    map.on("mouseenter", "nearby-cities", (e) => {
      // Skip if in drawing mode
      if (drawingMode) return;

      if (!e.features || e.features.length === 0 || !popupRef.current) return;

      map.getCanvas().style.cursor = "pointer";

      const feature = e.features[0];
      const coordinates = feature.geometry.coordinates.slice();
      const name = feature.properties.name;
      const distance = feature.properties.distance_km.toFixed(1);

      // Create popup content
      const popupContent = `
        <div class="city-popup">
          <strong>${name}</strong>
          <div>${distance} km away</div>
        </div>
      `;

      // Set popup content and position
      popupRef.current.setLngLat(coordinates).setHTML(popupContent).addTo(map);
    });

    // Mouse leave events for nearby cities
    map.on("mouseleave", "nearby-cities", () => {
      // Skip if in drawing mode
      if (drawingMode) return;

      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    // Mouse enter events for polygon results
    map.on("mouseenter", "polygon-results", (e) => {
      // Skip if in drawing mode
      if (drawingMode) return;

      if (!e.features || e.features.length === 0 || !popupRef.current) return;

      map.getCanvas().style.cursor = "pointer";

      const feature = e.features[0];
      const coordinates = feature.geometry.coordinates.slice();
      const name = feature.properties.name;

      // Create popup content - no distance shown
      const popupContent = `
        <div class="city-popup">
          <strong>${name}</strong>
        </div>
      `;

      // Set popup content and position
      popupRef.current.setLngLat(coordinates).setHTML(popupContent).addTo(map);
    });

    // Mouse leave events for polygon results
    map.on("mouseleave", "polygon-results", () => {
      // Skip if in drawing mode
      if (drawingMode) return;

      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    // Create a map click event handler and store it in a ref
    const handleMapClick = (e: MapMouseEvent) => {
      // Skip if in drawing mode or if clicking on a feature
      if (drawingMode || map.getCanvas().style.cursor === "pointer") return;

      const clickLngLat = e.lngLat;

      // Clear any existing selection
      clearSelection();

      // Update selected point
      const selectedSource = map.getSource("selected-feature");
      if (selectedSource) {
        selectedSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [clickLngLat.lng, clickLngLat.lat],
              },
              properties: {
                type: "click-point",
              },
            },
          ],
        });
      }

      // Load nearby cities and regions
      loadNearbyCities(clickLngLat.lng, clickLngLat.lat);
      loadEncompassingRegions(clickLngLat.lng, clickLngLat.lat);
    };

    // Store the handler in a ref for later removal
    mapClickHandlerRef.current = handleMapClick;

    // Add the click event
    map.on("click", handleMapClick);

    // Create a boundary click event handler and store it in a ref
    const handleBoundaryClick = async (e: BoundaryClickEvent) => {
      // Skip if in drawing mode
      if (drawingMode) return;

      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];

      // Get the actual click point coordinates
      const clickLngLat = e.lngLat;

      // Update selected feature
      const selectedSource = map.getSource("selected-feature");
      if (selectedSource) {
        selectedSource.setData({
          type: "FeatureCollection",
          features: [
            feature,
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [clickLngLat.lng, clickLngLat.lat],
              },
              properties: feature.properties,
            },
          ],
        });
      }

      // Load nearby cities and regions
      loadNearbyCities(clickLngLat.lng, clickLngLat.lat);
      loadEncompassingRegions(clickLngLat.lng, clickLngLat.lat);

      const actualBoundaryType = feature.properties
        .boundaryType as BoundaryType;

      // Fetch census data using the boundary type from the feature itself
      await loadCensusData(actualBoundaryType, feature.properties.uuid);
    };

    // Store the handler in a ref for later removal
    boundaryClickHandlerRef.current = handleBoundaryClick;

    // Add the click event for boundaries
    map.on("click", "boundaries-fill", handleBoundaryClick);

    // Map move events - load more boundaries when the map moves
    map.on("moveend", () => {
      // Only load if we've moved significantly and not in drawing mode
      if (!drawingMode) {
        loadBoundaries(false); // false means don't clear existing boundaries
      }
    });

    // Map zoom events - load appropriate boundaries for the zoom level
    map.on("zoomend", () => {
      // Only load if not in drawing mode
      if (!drawingMode) {
        loadBoundaries(false); // false means don't clear existing boundaries
      }
    });
  };

  // Load census data for a boundary
  const loadCensusData = async (type: BoundaryType, uuid: string) => {
    if (!onCensusProfileChange) return;

    try {
      setLoadingCensus(true);

      // Fetch census data from API
      const censusData = await fetchCensusData(type, uuid);

      // Send data to parent component
      onCensusProfileChange(censusData);
    } catch (error) {
      console.error("Error loading census data:", error);
    } finally {
      setLoadingCensus(false);
    }
  };

  // Toggle drawing mode
  const toggleDrawingMode = () => {
    if (!mapRef.current || !drawRef.current) return;

    const newMode = !drawingMode;
    setDrawingMode(newMode);

    if (newMode) {
      // Clear selection and results
      clearSelection();

      // If there's already a polygon, remove it first
      if (hasPolygon) {
        drawRef.current.deleteAll();
        setPolygonResults([]);
        setHasPolygon(false);

        // Clear polygon results
        const resultsSource = mapRef.current.getSource("polygon-results");
        if (resultsSource) {
          resultsSource.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      }

      // Start polygon drawing
      drawRef.current.changeMode("draw_polygon");

      // Disable map interactions to prevent interference with drawing
      disableMapInteractions();
    } else {
      // Cancel drawing if active
      drawRef.current.trash();
      drawRef.current.changeMode("simple_select");

      // Re-enable map interactions
      enableMapInteractions();
    }
  };

  // Disable map interactions to avoid conflicts with drawing mode
  const disableMapInteractions = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Disable drag pan
    map.dragPan.disable();

    // Remove event handlers temporarily
    if (mapClickHandlerRef.current) {
      map.off("click", mapClickHandlerRef.current);
    }

    if (boundaryClickHandlerRef.current) {
      map.off("click", "boundaries-fill", boundaryClickHandlerRef.current);
    }

    // Clear any existing popup
    popupRef.current?.remove();

    // Reset cursor
    map.getCanvas().style.cursor = "";

    // Clear any hover states
    map.setFilter("boundaries-hover", ["==", ["get", "uuid"], ""]);
    map.setFilter("boundaries-line-hover", ["==", ["get", "uuid"], ""]);
  };

  // Re-enable map interactions after drawing is complete
  const enableMapInteractions = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Re-enable drag pan
    map.dragPan.enable();

    // Re-add event handlers
    if (mapClickHandlerRef.current) {
      map.on("click", mapClickHandlerRef.current);
    }

    if (boundaryClickHandlerRef.current) {
      map.on("click", "boundaries-fill", boundaryClickHandlerRef.current);
    }
  };

  // Fetch results based on polygon
  const fetchPolygonResults = async (geometry: GeoJSON.Geometry) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    try {
      setLoadingPolygonResults(true);

      // Fetch cities within the polygon
      const cities = await fetchByPolygon(geometry);
      setPolygonResults(cities);

      // Convert to GeoJSON
      const features = cities.map((city) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [city.lng, city.lat],
        },
        properties: {
          uuid: city.uuid,
          name: city.name,
          // Not including distance_km in the properties
        },
      }));

      // Update the polygon results source
      const resultsSource = map.getSource("polygon-results");
      if (resultsSource) {
        resultsSource.setData({
          type: "FeatureCollection",
          features,
        });
      }
    } catch (error) {
      console.error("Error loading polygon results:", error);
    } finally {
      setLoadingPolygonResults(false);

      // Re-enable map interactions after fetching results
      enableMapInteractions();
    }
  };

  // Load nearby cities
  const loadNearbyCities = async (lng: number, lat: number) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    try {
      setLoadingCities(true);

      // Fetch nearby cities from API
      const cities = await fetchNearbyCities(lat, lng);
      setNearbyCities(cities);

      // Convert to GeoJSON
      const features = cities.map((city) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [city.lng, city.lat],
        },
        properties: {
          uuid: city.uuid,
          name: city.name,
          distance_km: city.distance_km,
        },
      }));

      // Update the nearby cities source
      const citiesSource = map.getSource("nearby-cities");
      if (citiesSource) {
        citiesSource.setData({
          type: "FeatureCollection",
          features,
        });
      }
    } catch (error) {
      console.error("Error loading nearby cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Load encompassing regions (MSA and county)
  const loadEncompassingRegions = async (lng: number, lat: number) => {
    try {
      setLoadingRegions(true);

      // Fetch regions from API
      const regions = await fetchEncompassingRegions(lat, lng);
      setEncompassingRegions(regions);

      // No visualization, just store the data for the card
    } catch (error) {
      console.error("Error loading regions:", error);
    } finally {
      setLoadingRegions(false);
    }
  };

  // Load boundaries from API
  const loadBoundaries = async (clearExisting = true) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    try {
      setLoading(true);

      // Get current viewport
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ].join(",");
      const zoom = map.getZoom();

      // Fetch boundaries from API
      const data = await fetchBoundaries(
        latestBoundaryType.current,
        bbox,
        zoom
      );

      // If we're changing boundary types, clear the loaded features
      if (clearExisting) {
        loadedFeaturesRef.current = new Map();

        // Clear selection when changing boundary type
        clearSelection();
      }

      // Process features and maintain existing colors for already loaded features
      const processedFeatures = data.features.map((feature) => {
        const uuid = feature.properties.uuid;

        // Check if this feature is already loaded
        if (loadedFeaturesRef.current.has(uuid)) {
          // Return the already loaded feature to maintain color and other properties
          return loadedFeaturesRef.current.get(uuid) as Feature;
        }

        // This is a new feature, assign a color
        // Get the current size of the map for deterministic color assignment
        const colorIndex =
          loadedFeaturesRef.current.size %
          BOUNDARY_COLORS[latestBoundaryType.current].length;
        const color = BOUNDARY_COLORS[latestBoundaryType.current][colorIndex];
        const hoverColor =
          BOUNDARY_HOVER_COLORS[latestBoundaryType.current][colorIndex];

        // Create a processed feature with colors
        const processedFeature = {
          ...feature,
          properties: {
            ...feature.properties,
            boundaryType: latestBoundaryType.current,
            color,
            hoverColor,
          },
        };

        // Store this feature in our map
        loadedFeaturesRef.current.set(uuid, processedFeature);

        return processedFeature;
      });

      // Get all currently loaded features
      const allLoadedFeatures = Array.from(loadedFeaturesRef.current.values());

      // Update the boundaries source with all features
      const boundariesSource = map.getSource("boundaries");
      if (boundariesSource) {
        boundariesSource.setData({
          type: "FeatureCollection",
          features: clearExisting ? processedFeatures : allLoadedFeatures,
        });
      }

      // Clear the hover layers
      map.setFilter("boundaries-hover", ["==", ["get", "uuid"], ""]);
      map.setFilter("boundaries-line-hover", ["==", ["get", "uuid"], ""]);
    } catch (error) {
      console.error("Error loading boundaries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clear current selection
  const clearSelection = () => {
    setNearbyCities([]);
    setEncompassingRegions(null);

    // Clear selected feature source
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear selected feature
    const selectedSource = map.getSource("selected-feature");
    if (selectedSource) {
      selectedSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // Clear nearby cities
    const citiesSource = map.getSource("nearby-cities");
    if (citiesSource) {
      citiesSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  // Clear polygon results
  const clearPolygonResults = () => {
    setPolygonResults([]);
    setHasPolygon(false);

    if (!mapRef.current || !drawRef.current) return;
    const map = mapRef.current;

    // Clear any drawn polygons
    drawRef.current.deleteAll();

    // Clear polygon results
    const resultsSource = map.getSource("polygon-results");
    if (resultsSource) {
      resultsSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  // Handle boundary type change
  const handleBoundaryTypeChange = (value: BoundaryType) => {
    setBoundaryType(value);
    // We need to update latestBoundaryType immediately before loading
    latestBoundaryType.current = value;
    loadBoundaries(true); // true means clear existing boundaries
  };

  return (
    <div className="flex flex-col relative flex-1 h-full">
      {/* Controls */}
      <div className="absolute top-3 left-12 z-10 flex gap-2 items-center bg-white p-2 rounded-md shadow-md">
        <Select
          value={boundaryType}
          onValueChange={(val: BoundaryType) => handleBoundaryTypeChange(val)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Boundary Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="state">States</SelectItem>
            <SelectItem value="county">Counties</SelectItem>
            <SelectItem value="city">Cities</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadBoundaries(false)}
          disabled={loading || drawingMode}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Refresh
        </Button>
        <Button
          variant={drawingMode ? "default" : "outline"}
          size="sm"
          onClick={toggleDrawingMode}
          className="ml-2"
        >
          <Pencil className="mr-2 h-4 w-4" />
          {drawingMode ? "Cancel Draw" : "Draw Polygon"}
        </Button>
        {hasPolygon && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearPolygonResults}
            className="ml-2"
          >
            Clear Polygon
          </Button>
        )}
      </div>

      {/* Loading indicators */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {loading && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-blue-500" />
            Loading boundaries...
          </div>
        )}

        {loadingCities && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-indigo-500" />
            Loading nearby cities...
          </div>
        )}

        {loadingRegions && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-purple-500" />
            Loading regions...
          </div>
        )}

        {loadingPolygonResults && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-green-500" />
            Loading polygon results...
          </div>
        )}

        {loadingCensus && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-orange-500" />
            Loading census data...
          </div>
        )}

        {drawingMode && (
          <div className="bg-white/90 p-1.5 rounded-md shadow-sm text-sm flex items-center font-medium text-blue-600">
            Drawing Mode Active - Click to place points, complete the polygon by
            connecting to first point
          </div>
        )}
      </div>

      {/* Info panels */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 max-w-xs">
        {encompassingRegions && (
          <div className="bg-white p-3 rounded-md shadow-md">
            <h3 className="text-lg font-medium mb-1">Regions</h3>

            {/* Display MSA info in the card */}
            {encompassingRegions.msa && (
              <div className="mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
                  <span className="font-medium">MSA:</span>
                </div>
                <p className="text-sm pl-5">{encompassingRegions.msa}</p>
              </div>
            )}

            {/* Display county info in the card */}
            {encompassingRegions.county && (
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-300 mr-2"></div>
                  <span className="font-medium">County:</span>
                </div>
                <p className="text-sm pl-5">{encompassingRegions.county}</p>
              </div>
            )}

            {/* Display city info in the card */}
            {encompassingRegions.city && (
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                  <span className="font-medium">City:</span>
                </div>
                <p className="text-sm pl-5">{encompassingRegions.city}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nearby Cities and Polygon Results panels */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 max-w-xs">
        {nearbyCities.length > 0 && (
          <div className="bg-white p-3 rounded-md shadow-md max-h-64 overflow-auto">
            <h3 className="text-lg font-medium mb-2">Nearby Cities</h3>
            <ul className="space-y-1 text-sm">
              {nearbyCities.map((city) => (
                <li key={city.uuid} className="flex justify-between">
                  <span>{city.name}</span>
                  <span className="text-gray-500 ml-2">
                    {city.distance_km.toFixed(1)} km
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {polygonResults.length > 0 && (
          <div className="bg-white p-3 rounded-md shadow-md max-h-64 overflow-auto">
            <h3 className="text-lg font-medium mb-2">Polygon Results</h3>
            <ul className="space-y-1 text-sm">
              {polygonResults.map((city) => (
                <li key={city.uuid}>
                  <span>{city.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <div
          ref={mapContainerRef}
          className="w-full h-full rounded-md shadow-md overflow-hidden"
        />
      </div>
    </div>
  );
};

export default MapboxBoundaries;
