import { z } from "zod/v4";

export const getCarFiltersSchema = z.object({});

export const getCarsSchema = z.object({
  search: z.string().optional().default(""),
  make: z.string().optional().default(""),
  bodyType: z.string().optional().default(""),
  fuelType: z.string().optional().default(""),
  transmission: z.string().optional().default(""),
  minPrice: z.number().optional().default(0),
  maxPrice: z.number().optional().default(Number.MAX_SAFE_INTEGER),
  sortBy: z.enum(["newest", "priceAsc", "priceDesc"]).optional().default("newest"),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(6),
});

export const toggleSavedCarSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
});

export const getCarByIdSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
});
export const getSavedCarsSchema = z.object({});

export type CarFilters = z.infer<typeof getCarFiltersSchema>;
export type GetCarsInput = z.infer<typeof getCarsSchema>;
export type ToggleSavedCarInput = z.infer<typeof toggleSavedCarSchema>;
export type GetCarByIdInput = z.infer<typeof getCarByIdSchema>;
export type GetSavedCarsInput = z.infer<typeof getSavedCarsSchema>;
