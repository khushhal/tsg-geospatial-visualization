import React from "react";
import { MapPin, Info } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/utils";
import { CensusProfile } from "@/types/geo";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SidebarrProps {
  censusProfile: CensusProfile | null;
}

const StatItem = ({ label, value }) => (
  <>
    <div className="text-gray-600">{label}</div>
    <div className="font-medium text-right">{value}</div>
  </>
);

const SectionTitle = ({ title }) => (
  <div className="col-span-2 font-medium text-blue-700 mt-3 mb-1 border-b pb-1">
    {title}
  </div>
);

const InstructionsCard = () => (
  <Card className="mt-4">
    <CardHeader className="py-3">
      <CardTitle className="text-sm font-medium flex items-center">
        <Info className="w-4 h-4 mr-2 text-blue-500" />
        Instructions
      </CardTitle>
    </CardHeader>
    <CardContent className="py-2">
      <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
        <li>Click on the map to explore nearby cities</li>
        <li>Click on the regions to see detailed demographic data</li>
        <li>
          Use the dropdown to switch between state, county, and city boundaries
        </li>
        <li>Draw polygon using the polygon tool for custom area queries</li>
      </ul>
    </CardContent>
  </Card>
);

const Sidebarr: React.FC<SidebarrProps> = ({ censusProfile }) => {
  if (!censusProfile) {
    return (
      <div className="w-80 h-screen p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white border-r">
        <div className="mb-6 mt-2">
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Census Explorer
          </h2>
          <p className="text-sm text-gray-600">
            Discover demographic insights across the United States
          </p>
        </div>

        <div className="flex justify-center my-8">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-lg font-medium text-gray-800">
            No Area Selected
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Hover on a location on the map to view detailed demographic data
          </p>
        </div>
        <InstructionsCard />
      </div>
    );
  }

  const {
    population: pop,
    demographics: demo,
    socio_economic: socio,
  } = censusProfile;

  return (
    <div className="w-80 h-screen p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white border-r">
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardHeader className="py-3 bg-blue-50">
          <CardTitle className="text-lg font-medium text-blue-800">
            {censusProfile.name || "Area Profile"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <SectionTitle title="Population" />
            <StatItem
              label="Total"
              value={
                pop.pop_census_apr2020
                  ? formatNumber(pop.pop_census_apr2020)
                  : "N/A"
              }
            />

            <SectionTitle title="Demographics" />
            <StatItem
              label="Under 18"
              value={`${demo.persons_under_18_percent || "N/A"}%`}
            />
            <StatItem
              label="65+"
              value={`${demo.persons_65_over_percent || "N/A"}%`}
            />
            <StatItem
              label="Hispanic/Latino"
              value={`${demo.hispanic_or_latino_percent || "N/A"}%`}
            />
            <StatItem
              label="White"
              value={`${demo.white_alone_percent || "N/A"}%`}
            />
            <StatItem
              label="Black"
              value={`${demo.black_alone_percent || "N/A"}%`}
            />

            <SectionTitle title="Economics" />
            {socio.median_household_income && (
              <StatItem
                label="Household Income"
                value={formatCurrency(socio.median_household_income)}
              />
            )}
            {socio.per_capita_income && (
              <StatItem
                label="Per Capita Income"
                value={formatCurrency(socio.per_capita_income)}
              />
            )}
            {socio.median_gross_rent && (
              <StatItem
                label="Median Rent"
                value={formatCurrency(socio.median_gross_rent)}
              />
            )}
            {socio.median_owner_value && (
              <StatItem
                label="Home Value"
                value={formatCurrency(socio.median_owner_value)}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 col-span-2">
        <a
          href={`https://www.census.gov/quickfacts/fact/table/${
            censusProfile.quick_fact_slug || ""
          }`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
        >
          View in QuickFacts
        </a>
      </div>
      <InstructionsCard />
    </div>
  );
};

export default Sidebarr;
