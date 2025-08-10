import { z } from "zod";

export const workingHourSchema = z.object({
  dayOfWeek: z.string(),
  openTime: z.string(),
  closeTime: z.string(),
  isOpen: z.boolean(),
});

export const saveWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourSchema)
});

export const updateDealershipInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  about: z.string().optional(),
});
