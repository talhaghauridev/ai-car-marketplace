import { z } from "zod";

export const processCarImageSchema = z.object({
  file: z.instanceof(File),
});

export const addCarSchema = z.object({
  carData: z.any(),
  images: z.array(z.string()).min(1, "At least one image is required"),
});

export const getCarsSchema = z.object({
  search: z.string().optional().default(""),
});

export const deleteCarSchema = z.object({
  id: z.string().uuid("Invalid car ID format"),
});

export const updateCarStatusSchema = z.object({
  id: z.string().uuid("Invalid car ID format"),
  status: z.enum(["AVAILABLE", "SOLD", "UNAVAILABLE"]).optional(),
  featured: z.boolean().optional(),
});
