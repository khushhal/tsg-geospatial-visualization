export type BoundaryType = "state" | "county" | "city";

export interface CensusProfile {
  uuid: string;
  name: string;
  quick_fact_slug: string;
  population: Population;
  demographics: Demographics;
  business: Business;
  geography: Geography;
  socio_economic: SocioEconomic;
  year: number;
}

export interface Population {
  uuid: string;
  pop_estimate_july_2024?: number;
  pop_estimate_july_2023?: number;
  pop_estimate_base_apr2020_v2024?: number;
  pop_estimate_base_apr2020_v2023?: number;
  pop_percent_change_apr2020_to_july2024?: string;
  pop_percent_change_apr2020_to_july2023?: string;
  pop_census_apr2020?: number;
  pop_census_apr2010?: number;
}

export interface Demographics {
  uuid: string;
  persons_under_5_percent?: string;
  persons_under_18_percent?: string;
  persons_65_over_percent?: string;
  female_persons_percent?: string;
  white_alone_percent?: string;
  black_alone_percent?: string;
  american_indian_alaska_native_percent?: string;
  asian_alone_percent?: string;
  native_hawaiian_pacific_islander_percent?: string;
  two_or_more_races_percent?: string;
  hispanic_or_latino_percent?: string;
  white_alone_not_hispanic_percent?: string;
  veterans_2019_2023?: number;
  foreign_born_percent_2019_2023?: string;
}

export interface Business {
  uuid: string;
  total_employer_establishments?: number;
  total_employment?: number;
  total_annual_payroll?: string;
  total_employment_percent_change?: string;
  total_nonemployer_establishments?: number;
  all_employer_firms?: number;
  men_owned_employer_firms?: string;
  women_owned_employer_firms?: number;
  minority_owned_employer_firms?: string;
  nonminority_owned_employer_firms?: string;
  veteran_owned_employer_firms?: string;
  nonveteran_owned_employer_firms?: string;
}

export interface Geography {
  uuid: string;
  population_per_sq_mile_2020?: string;
  population_per_sq_mile_2010?: string;
  land_area_sq_miles_2020?: string;
  land_area_sq_miles_2010?: string;
  fips_code?: string;
}

export interface SocioEconomic {
  uuid: string;
  housing_units_v2023?: number;
  owner_occupied_rate?: string;
  median_owner_value?: string;
  median_owner_cost_with_mortgage?: string;
  median_owner_cost_without_mortgage?: string;
  median_gross_rent?: string;
  building_permits?: number;
  households?: number;
  persons_per_household?: string;
  same_house_living_percent?: string;
  language_non_english_percent?: string;
  households_with_computer_percent?: string;
  households_with_broadband_percent?: string;
  high_school_grad_percent?: string;
  bachelors_degree_percent?: string;
  disability_percent?: string;
  no_health_insurance_percent?: string;
  civilian_labor_force_total_percent?: string;
  civilian_labor_force_female_percent?: string;
  total_accommodation_food_sales?: number;
  total_health_care_revenue?: number;
  total_transportation_revenue?: number;
  total_retail_sales?: number;
  total_retail_sales_per_capita?: string;
  mean_travel_time?: string;
  median_household_income?: string;
  per_capita_income?: string;
  persons_in_poverty_percent?: string;
}

export interface FeatureProperties {
  slug: string;
  uuid: string;
  name: string;
  boundaryType: BoundaryType;
}

export interface Feature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: FeatureProperties;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

export interface NearbyCity {
  uuid: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
}

export interface Region {
  city?: string;
  msa?: string;
  county?: string;
}
