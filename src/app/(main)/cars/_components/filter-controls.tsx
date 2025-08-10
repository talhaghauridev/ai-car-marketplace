"use client";

import { Check, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSection {
  id: string;
  title: string;
  options: FilterOption[];
  currentValue: string;
  onChange: (value: string) => void;
}

interface Filters {
  makes: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  transmissions: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

interface CurrentFilters {
  make: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  priceRange: [number, number];
}

interface CarFilterControlsProps {
  filters: Filters;
  currentFilters: CurrentFilters;
  onFilterChange: (filterType: string, value: string | [number, number]) => void;
  onClearFilter: (filterType: string) => void;
}

export const CarFilterControls: React.FC<CarFilterControlsProps> = ({
  filters,
  currentFilters,
  onFilterChange,
  onClearFilter,
}) => {
  const { make, bodyType, fuelType, transmission, priceRange } = currentFilters || {};

  const filterSections = [
    {
      id: "make",
      title: "Make",
      options: filters?.makes?.map((make: string) => ({ value: make, label: make })) || [],
      currentValue: make,
      onChange: (value: any) => onFilterChange("make", value),
    },
    {
      id: "bodyType",
      title: "Body Type",
      options: filters?.bodyTypes?.map((type: string) => ({ value: type, label: type })) || [],
      currentValue: bodyType,
      onChange: (value: any) => onFilterChange("bodyType", value),
    },
    {
      id: "fuelType",
      title: "Fuel Type",
      options: filters?.fuelTypes?.map((type: string) => ({ value: type, label: type })) || [],
      currentValue: fuelType,
      onChange: (value: any) => onFilterChange("fuelType", value),
    },
    {
      id: "transmission",
      title: "Transmission",
      options:
        filters?.transmissions?.map((type: string) => ({
          value: type,
          label: type,
        })) || [],
      currentValue: transmission,
      onChange: (value: any) => onFilterChange("transmission", value),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="space-y-4">
        <h3 className="font-medium">Price Range</h3>
        <div className="px-2">
          <Slider
            min={filters.priceRange.min}
            max={filters.priceRange.max}
            step={100}
            value={
              priceRange || [filters?.priceRange?.min || 0, filters?.priceRange?.max || 100000]
            }
            onValueChange={(value: [number, number]) => onFilterChange("priceRange", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">$ {priceRange[0]}</div>
          <div className="font-medium text-sm">$ {priceRange[1]}</div>
        </div>
      </div>

      {/* Filter Categories */}
      {filterSections.map((section) => (
        <div
          key={section.id}
          className="space-y-3">
          <h4 className="text-sm font-medium flex justify-between">
            <span>{section.title}</span>
            {section.currentValue && (
              <button
                className="text-xs text-gray-600 flex items-center"
                onClick={() => onClearFilter(section.id)}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </button>
            )}
          </h4>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {section.options?.map((option: FilterOption) => (
              <Badge
                key={option.value}
                variant={section.currentValue === option.value ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 ${
                  section.currentValue === option.value
                    ? "bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-200"
                    : "bg-white hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => {
                  section.onChange(section.currentValue === option.value ? "" : option.value);
                }}>
                {option.label}
                {section.currentValue === option.value && <Check className="ml-1 h-3 w-3 inline" />}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
