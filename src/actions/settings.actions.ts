"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authActionClient } from "@/utils/safe-action";
import {
  saveWorkingHoursSchema,
  updateDealershipInfoSchema,
} from "@/lib/validations/settings.validations";
import { z } from "zod";
import { DayOfWeek } from "@prisma/client";

// Types
export type WorkingHour = {
  id: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  dealershipId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DealershipInfo = z.infer<typeof updateDealershipInfoSchema>;

// Get dealership info with working hours
export const getDealershipInfo = authActionClient.action(async () => {
  // Get the dealership record
  let dealership = await prisma.dealershipInfo.findFirst({
    include: {
      workingHours: {
        orderBy: {
          dayOfWeek: "asc",
        },
      },
    },
  });

  // If no dealership exists, create a default one
  if (!dealership) {
    const defaultWorkingHours = [
      { dayOfWeek: DayOfWeek.MONDAY, openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: DayOfWeek.TUESDAY, openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: DayOfWeek.WEDNESDAY, openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: DayOfWeek.THURSDAY, openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: DayOfWeek.FRIDAY, openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: DayOfWeek.SATURDAY, openTime: "10:00", closeTime: "16:00", isOpen: true },
      { dayOfWeek: DayOfWeek.SUNDAY, openTime: "10:00", closeTime: "16:00", isOpen: false },
    ];

    dealership = await prisma.dealershipInfo.create({
      data: {
        name: "Vehiql Motors",
        email: "contact@vehiql.com",
        phone: "+1 (555) 123-4567",
        address: "69 Car Street, Autoville, CA 69420",
        workingHours: {
          create: defaultWorkingHours,
        },
      },
      include: {
        workingHours: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });
  }

  // Format the data
  if (!dealership) {
    throw new Error("Failed to create dealership info");
  }

  return {
    success: true,
    data: {
      ...dealership,
      createdAt: dealership.createdAt.toISOString(),
      updatedAt: dealership.updatedAt.toISOString(),
    },
  };
});

// Save working hours
export const saveWorkingHours = authActionClient
  .inputSchema(saveWorkingHoursSchema)
  .action(async ({ parsedInput: { workingHours }, ctx: { user } }) => {
    // Get current dealership info
    const dealership = await prisma.dealershipInfo.findFirst();

    if (!dealership) {
      throw new Error("Dealership info not found");
    }

    // Update working hours - first delete existing hours
    await prisma.workingHour.deleteMany({
      where: { dealershipId: dealership.id },
    });

    // Then create new hours
    // Create working hours one by one to ensure proper type safety
    for (const hour of workingHours) {
      await prisma.workingHour.upsert({
        where: {
          dealershipId_dayOfWeek: {
            dealershipId: dealership!.id,
            dayOfWeek: hour.dayOfWeek as DayOfWeek,
          },
        },
        update: {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
        },
        create: {
          dayOfWeek: hour.dayOfWeek as DayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
          dealershipId: dealership!.id,
        },
      });
    }

    // Revalidate paths
    revalidatePath("/admin/settings");
    revalidatePath("/"); // Homepage might display hours

    return { success: true };
  });

// Update dealership info
export const updateDealershipInfo = authActionClient
  .inputSchema(updateDealershipInfoSchema)
  .action(async ({ parsedInput: data, ctx: { user } }) => {
    // Get current dealership info
    let dealership = await prisma.dealershipInfo.findFirst();

    if (!dealership) {
      // Create new dealership info if it doesn't exist
      dealership = await prisma.dealershipInfo.create({
        data: {
          ...data,
          workingHours: {
            create: [
              { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
              { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
              { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
              { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
              { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
              { dayOfWeek: "SATURDAY", openTime: "10:00", closeTime: "16:00", isOpen: true },
              { dayOfWeek: "SUNDAY", openTime: "10:00", closeTime: "16:00", isOpen: false },
            ],
          },
        },
      });
    } else {
      // Update existing dealership info
      dealership = await prisma.dealershipInfo.update({
        where: { id: dealership.id },
        data,
      });
    }

    // Revalidate paths
    revalidatePath("/admin/settings");
    revalidatePath("/about");
    revalidatePath("/contact");

    return {
      ...dealership,
      createdAt: dealership.createdAt.toISOString(),
      updatedAt: dealership.updatedAt.toISOString(),
    };
  });
