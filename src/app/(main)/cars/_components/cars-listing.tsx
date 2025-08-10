"use client";

import { getCars } from "@/actions/car-listing.actions";
import { CarCard } from "@/components/car-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import CarListingsLoading from "./car-listing-loading";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAction } from "next-safe-action/hooks";

type CarListingsParams = {
  search: string;
  make: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  minPrice: string | number;
  maxPrice: string | number;
  sortBy: string;
  page: number;
  limit: number;
};

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrl: string;
  images: string[];
  transmission: string;
  fuelType: string;
  color: string;
  bodyType: string;
  engineSize: string;
  features: string[];
  description: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  wishlisted: boolean;
}

interface PaginationData {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

interface CarsResponse {
  success: boolean;
  data: Car[];
  pagination: PaginationData;
}

export function CarListings() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 6;
  const [loading, setLoading] = useState(true);

  // Extract filter values from searchParams with proper types
  const search = searchParams.get("search") || "";
  const make = searchParams.get("make") || "";
  const bodyType = searchParams.get("bodyType") || "";
  const fuelType = searchParams.get("fuelType") || "";
  const transmission = searchParams.get("transmission") || "";
  const minPrice = parseInt(searchParams.get("minPrice") || "0") || 0;
  const maxPrice =
    parseInt(searchParams.get("maxPrice") || String(Number.MAX_SAFE_INTEGER)) ||
    Number.MAX_SAFE_INTEGER;
  const sortBy = (searchParams.get("sortBy") as "newest" | "priceAsc" | "priceDesc") || "newest";
  const page = parseInt(searchParams.get("page") || "1") || 1;

  // Use the useAction hook with proper typing
  const {
    execute: fetchCars,
    result: { data: result, serverError: error },
  } = useAction(getCars);

  // Fetch cars when filters change
  useEffect(() => {
    fetchCars({
      search,
      make,
      bodyType,
      fuelType,
      transmission,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
    });
  }, [search, make, bodyType, fuelType, transmission, minPrice, maxPrice, sortBy, page]);

  // Update URL when page changes
  useEffect(() => {
    if (currentPage !== page) {
      const params = new URLSearchParams(searchParams);
      params.set("page", currentPage.toString());
      router.push(`?${params.toString()}`);
    }
  }, [currentPage, router, searchParams, page]);

  // Handle pagination clicks
  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
  };

  // Generate pagination URL
  const getPaginationUrl = (pageNum: number): string => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNum.toString());
    return `?${params.toString()}`;
  };

  // Show loading state
  if (loading || !result) {
    return <CarListingsLoading />;
  }

  // Handle error
  if (error) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load cars. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  const cars: Car[] = result?.data || [];
  const pagination = result?.pagination || {
    total: 0,
    pages: 1,
    page: 1,
    limit,
  };

  // No results
  if (cars.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-gray-50">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Info className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">No cars found</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          We couldn't find any cars matching your search criteria. Try adjusting your filters or
          search term.
        </p>
        <Button
          variant="outline"
          asChild>
          <Link href="/cars">Clear all filters</Link>
        </Button>
      </div>
    );
  }

  // Generate pagination items
  const paginationItems: JSX.Element[] = [];

  // Calculate which page numbers to show (first, last, and around current page)
  const visiblePageNumbers: number[] = [];

  // Always show page 1
  visiblePageNumbers.push(1);

  // Show pages around current page
  for (let i = Math.max(2, page - 1); i <= Math.min(pagination.pages - 1, page + 1); i++) {
    visiblePageNumbers.push(i);
  }

  // Always show last page if there's more than 1 page
  if (pagination.pages > 1) {
    visiblePageNumbers.push(pagination.pages);
  }

  // Sort and deduplicate
  const uniquePageNumbers = [...new Set(visiblePageNumbers)].sort((a, b) => a - b);

  // Create pagination items with ellipses
  let lastPageNumber = 0;
  uniquePageNumbers.forEach((pageNumber) => {
    if (pageNumber - lastPageNumber > 1) {
      // Add ellipsis
      paginationItems.push(
        <PaginationItem key={`ellipsis-${pageNumber}`}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    paginationItems.push(
      <PaginationItem key={pageNumber}>
        <PaginationLink
          href={getPaginationUrl(pageNumber)}
          isActive={pageNumber === page}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            handlePageChange(pageNumber);
          }}>
          {pageNumber}
        </PaginationLink>
      </PaginationItem>
    );

    lastPageNumber = pageNumber;
  });

  return (
    <div>
      {/* Results count and current page */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing{" "}
          <span className="font-medium">
            {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)}
          </span>{" "}
          of <span className="font-medium">{pagination.total}</span> cars
        </p>
      </div>

      {/* Car grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.map((car: Car) => (
          <CarCard
            key={car.id}
            car={car}
          />
        ))}
      </div>

      {/* shadcn Pagination */}
      {pagination.pages > 1 && (
        <Pagination className="mt-10">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={getPaginationUrl(page - 1)}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) {
                    handlePageChange(page - 1);
                  }
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {paginationItems}

            <PaginationItem>
              <PaginationNext
                href={getPaginationUrl(page + 1)}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pagination.pages) {
                    handlePageChange(page + 1);
                  }
                }}
                className={page >= pagination.pages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
