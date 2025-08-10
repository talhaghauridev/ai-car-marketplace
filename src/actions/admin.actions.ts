"use server";
import { serializeCarData } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import {
  getAdminTestDrivesSchema,
  updateTestDriveStatusSchema,
} from "@/lib/validations/admin.validations";
import { adminActionClient } from "@/utils/safe-action";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { z } from "zod";

export const getAdmin = adminActionClient.action(async ({ ctx }) => {
  return { authorized: true, user: ctx.user };
});

export const getAdminTestDrives = adminActionClient
  .inputSchema(getAdminTestDrivesSchema)
  .action(async ({ parsedInput: { search, status } }) => {
    let where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          car: {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Get bookings
    const bookings = await prisma.testDriveBooking.findMany({
      where,
      include: {
        car: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            phone: true,
          },
        },
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    });

    // Format the bookings
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      carId: booking.carId,
      car: serializeCarData(booking.car),
      userId: booking.userId,
      user: booking.user,
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
  });

export const updateTestDriveStatus = adminActionClient
  .inputSchema(updateTestDriveStatusSchema)
  .action(async ({ parsedInput: { bookingId, newStatus } }) => {
    // Get the booking
    const booking = await prisma.testDriveBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Update status
    await prisma.testDriveBooking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    // Revalidate paths
    revalidatePath("/admin/test-drives");
    revalidatePath("/reservations");

    return {
      success: true,
      message: "Test drive status updated successfully",
    };
  });

// Get all users
export const getUsers = adminActionClient.action(async () => {
  // Get all users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
  };
});

// Update user role
export const updateUserRole = adminActionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      role: z.enum(UserRole),
    })
  )
  .action(async ({ parsedInput: { userId, role }, ctx: { user: adminUser } }) => {
    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Revalidate paths
    revalidatePath("/admin/settings");

    return { success: true };
  });

export const getDashboardData = adminActionClient.action(async () => {
  // Fetch all necessary data in a single parallel operation
  const [cars, testDrives] = await Promise.all([
    prisma.car.findMany({
      select: {
        id: true,
        status: true,
        featured: true,
      },
    }),
    prisma.testDriveBooking.findMany({
      select: {
        id: true,
        status: true,
        carId: true,
      },
    }),
  ]);

  // Calculate car statistics
  const totalCars = cars.length;
  const availableCars = cars.filter((car) => car.status === "AVAILABLE").length;
  const soldCars = cars.filter((car) => car.status === "SOLD").length;
  const unavailableCars = cars.filter((car) => car.status === "UNAVAILABLE").length;
  const featuredCars = cars.filter((car) => car.featured === true).length;

  // Calculate test drive statistics
  const totalTestDrives = testDrives.length;
  const pendingTestDrives = testDrives.filter((td) => td.status === "PENDING").length;
  const confirmedTestDrives = testDrives.filter((td) => td.status === "CONFIRMED").length;
  const completedTestDrives = testDrives.filter((td) => td.status === "COMPLETED").length;
  const cancelledTestDrives = testDrives.filter((td) => td.status === "CANCELLED").length;
  const noShowTestDrives = testDrives.filter((td) => td.status === "NO_SHOW").length;

  // Calculate test drive conversion rate
  const completedTestDriveCarIds = testDrives
    .filter((td) => td.status === "COMPLETED")
    .map((td) => td.carId);

  const soldCarsAfterTestDrive = cars.filter(
    (car) => car.status === "SOLD" && completedTestDriveCarIds.includes(car.id)
  ).length;

  const conversionRate =
    completedTestDrives > 0 ? (soldCarsAfterTestDrive / completedTestDrives) * 100 : 0;

  return {
    success: true,
    data: {
      cars: {
        total: totalCars,
        available: availableCars,
        sold: soldCars,
        unavailable: unavailableCars,
        featured: featuredCars,
      },
      testDrives: {
        total: totalTestDrives,
        pending: pendingTestDrives,
        confirmed: confirmedTestDrives,
        completed: completedTestDrives,
        cancelled: cancelledTestDrives,
        noShow: noShowTestDrives,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
    },
  };
});
