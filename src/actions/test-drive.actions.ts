"use server";

import { serializeCarData } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import { authActionClient } from "@/utils/safe-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bookTestDriveSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

const cancelTestDriveSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

/**
 * Books a test drive for a car
 */
export const bookTestDrive = authActionClient
  .inputSchema(bookTestDriveSchema)
  .action(
    async ({ parsedInput: { carId, bookingDate, startTime, endTime, notes }, ctx: { user } }) => {
      try {
        // Check if car exists and is available
        const car = await prisma.car.findUnique({
          where: { id: carId, status: "AVAILABLE" },
        });

        if (!car) throw new Error("Car not available for test drive");

        // Check if slot is already booked
        const existingBooking = await prisma.testDriveBooking.findFirst({
          where: {
            carId,
            bookingDate: new Date(bookingDate),
            startTime,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });

        if (existingBooking) {
          throw new Error("This time slot is already booked. Please select another time.");
        }

        // Create the booking
        const booking = await prisma.testDriveBooking.create({
          data: {
            carId,
            userId: user.id,
            bookingDate: new Date(bookingDate),
            startTime,
            endTime,
            notes: notes || null,
            status: "PENDING",
          },
        });

        // Revalidate relevant paths
        revalidatePath(`/test-drive/${carId}`);
        revalidatePath(`/cars/${carId}`);

        return {
          success: true,
          data: booking,
        };
      } catch (error: any) {
        console.error("Error booking test drive:", error);
        throw new Error(error.message);
      }
    }
  );

/**
 * Get user's test drive bookings - reservations page
 */
export const getUserTestDrives = authActionClient.action(async ({ ctx: { user } }) => {
  try {
    // Get user's test drive bookings
    const bookings = await prisma.testDriveBooking.findMany({
      where: { userId: user.id },
      include: {
        car: true,
      },
      orderBy: { bookingDate: "desc" },
    });

    // Format the bookings
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      carId: booking.carId,
      car: serializeCarData(booking.car),
      bookingDate: booking.bookingDate.toISOString(),
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedBookings,
    };
  } catch (error: any) {
    console.error("Error fetching test drives:", error);
    throw new Error(error.message);
  }
});

/**
 * Cancel a test drive booking
 */
export const cancelTestDrive = authActionClient
  .inputSchema(cancelTestDriveSchema)
  .action(async ({ parsedInput: { bookingId }, ctx: { user } }) => {
    try {
      // Get the booking
      const booking = await prisma.testDriveBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      // ✅ Fixed: Check if user owns this booking OR is admin
      if (booking.userId !== user.id && user.role !== "ADMIN") {
        throw new Error("Unauthorized to cancel this booking");
      }

      // Check if booking can be cancelled
      if (booking.status === "CANCELLED") {
        throw new Error("Booking is already cancelled");
      }

      if (booking.status === "COMPLETED") {
        throw new Error("Cannot cancel a completed booking");
      }

      // Update the booking status
      await prisma.testDriveBooking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      // Revalidate paths
      revalidatePath("/reservations");
      revalidatePath("/admin/test-drives");

      return {
        success: true,
        message: "Test drive cancelled successfully",
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });
