import { z } from "zod";

export const getAdminTestDrivesSchema = z.object({
  search: z.string().optional().default(""),
  status: z.string().optional().default(""),
});

export const updateTestDriveStatusSchema = z.object({
  bookingId: z.string(),
  newStatus: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});
