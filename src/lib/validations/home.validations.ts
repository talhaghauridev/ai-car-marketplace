import { z } from "zod";

export const getFeaturedCarsSchema = z.object({
  limit: z.number().min(1).max(10).default(3),
});

export const processImageSearchSchema = z.object({
  file: z
    .instanceof(File, { message: "File is required" })
    .refine((file) => file.size > 0, "File cannot be empty"),
});

export type ProcessedCarImage = {
  success: boolean;
  data?: {
    make: string;
    bodyType: string;
    color: string;
    confidence: number;
  };
  error?: string;
};
