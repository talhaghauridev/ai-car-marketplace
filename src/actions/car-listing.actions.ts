"use server";

import { serializeCarData } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import {
  getCarByIdSchema,
  getCarsSchema,
  toggleSavedCarSchema,
} from "@/lib/validations/car-listing.validations";
import { actionClient, authActionClient } from "@/utils/safe-action";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Get simplified filters for the car marketplace
 */
export const getCarFilters = actionClient.action(async () => {
  try {
    // Get unique makes
    const makes = await prisma.car.findMany({
      where: { status: "AVAILABLE" },
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    });

    // Get unique body types
    const bodyTypes = await prisma.car.findMany({
      where: { status: "AVAILABLE" },
      select: { bodyType: true },
      distinct: ["bodyType"],
      orderBy: { bodyType: "asc" },
    });

    // Get unique fuel types
    const fuelTypes = await prisma.car.findMany({
      where: { status: "AVAILABLE" },
      select: { fuelType: true },
      distinct: ["fuelType"],
      orderBy: { fuelType: "asc" },
    });

    // Get unique transmissions
    const transmissions = await prisma.car.findMany({
      where: { status: "AVAILABLE" },
      select: { transmission: true },
      distinct: ["transmission"],
      orderBy: { transmission: "asc" },
    });

    // Get min and max prices using Prisma aggregations
    const priceAggregations = await prisma.car.aggregate({
      where: { status: "AVAILABLE" },
      _min: { price: true },
      _max: { price: true },
    });

    return {
      success: true,
      data: {
        makes: makes.map((item) => item.make),
        bodyTypes: bodyTypes.map((item) => item.bodyType),
        fuelTypes: fuelTypes.map((item) => item.fuelType),
        transmissions: transmissions.map((item) => item.transmission),
        priceRange: {
          min: priceAggregations._min.price
            ? parseFloat(priceAggregations._min.price.toString())
            : 0,
          max: priceAggregations._max.price
            ? parseFloat(priceAggregations._max.price.toString())
            : 100000,
        },
      },
    };
  } catch (error: any) {
    throw new Error("Error fetching car filters:" + error.message);
  }
});

/**
 * Get cars with simplified filters
 */
export const getCars = actionClient
  .inputSchema(getCarsSchema)
  .action(
    async ({
      parsedInput: {
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
      },
    }) => {
      try {
        // Get current user if authenticated
        const { userId } = await auth();
        let dbUser = null;

        if (userId) {
          dbUser = await prisma.user.findUnique({
            where: { clerkUserId: userId },
          });
        }

        // Build where conditions
        let where: any = {
          status: "AVAILABLE",
        };

        if (search) {
          where.OR = [
            { make: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
        }

        if (make) where.make = { equals: make, mode: "insensitive" };
        if (bodyType) where.bodyType = { equals: bodyType, mode: "insensitive" };
        if (fuelType) where.fuelType = { equals: fuelType, mode: "insensitive" };
        if (transmission) where.transmission = { equals: transmission, mode: "insensitive" };

        // Add price range
        where.price = {
          gte: parseFloat(String(minPrice)) || 0,
        };

        if (maxPrice && maxPrice < Number.MAX_SAFE_INTEGER) {
          where.price.lte = parseFloat(String(maxPrice));
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Determine sort order
        let orderBy = {};
        switch (sortBy) {
          case "priceAsc":
            orderBy = { price: "asc" };
            break;
          case "priceDesc":
            orderBy = { price: "desc" };
            break;
          case "newest":
          default:
            orderBy = { createdAt: "desc" };
            break;
        }

        // Get total count for pagination
        const totalCars = await prisma.car.count({ where });

        // Execute the main query
        const cars = await prisma.car.findMany({
          where,
          take: limit,
          skip,
          orderBy,
        });

        let wishlisted = new Set();
        if (dbUser) {
          const savedCars = await prisma.userSavedCar.findMany({
            where: { userId: dbUser.id },
            select: { carId: true },
          });

          wishlisted = new Set(savedCars.map((saved) => saved.carId));
        }

        const serializedCars = cars.map((car) => serializeCarData(car, wishlisted.has(car.id)));

        return {
          success: true,
          data: serializedCars,
          pagination: {
            total: totalCars,
            page,
            limit,
            pages: Math.ceil(totalCars / limit),
          },
        };
      } catch (error: any) {
        throw new Error("Error fetching cars:" + error.message);
      }
    }
  );

/**
 * Toggle car in user's wishlist
 */
export const toggleSavedCar = authActionClient
  .inputSchema(toggleSavedCarSchema)
  .action(async ({ parsedInput: { carId }, ctx: { user } }) => {
    try {
      // Check if car exists
      const car = await prisma.car.findUnique({
        where: { id: carId },
      });

      if (!car) {
        return {
          success: false,
          error: "Car not found",
        };
      }

      // Check if car is already saved
      const existingSave = await prisma.userSavedCar.findUnique({
        where: {
          userId_carId: {
            userId: user.id,
            carId,
          },
        },
      });

      // If car is already saved, remove it
      if (existingSave) {
        await prisma.userSavedCar.delete({
          where: {
            userId_carId: {
              userId: user.id,
              carId,
            },
          },
        });

        revalidatePath(`/saved-cars`);
        return {
          success: true,
          saved: false,
          message: "Car removed from favorites",
        };
      }

      // If car is not saved, add it
      await prisma.userSavedCar.create({
        data: {
          userId: user.id,
          carId,
        },
      });

      revalidatePath(`/saved-cars`);
      return {
        success: true,
        saved: true,
        message: "Car added to favorites",
      };
    } catch (error: any) {
      throw new Error("Error toggling saved car:" + error.message);
    }
  });

/**
 * Get car details by ID
 */
export const getCarById = actionClient
  .inputSchema(getCarByIdSchema)
  .action(async ({ parsedInput: { carId } }) => {
    try {
      // Get current user if authenticated
      const { userId } = await auth();
      let dbUser = null;

      if (userId) {
        dbUser = await prisma.user.findUnique({
          where: { clerkUserId: userId },
        });
      }

      // Get car details
      const car = await prisma.car.findUnique({
        where: { id: carId },
      });

      if (!car) {
        throw new Error("Car not found");
      }

      // Check if car is wishlisted by user
      let isWishlisted = false;
      if (dbUser) {
        const savedCar = await prisma.userSavedCar.findUnique({
          where: {
            userId_carId: {
              userId: dbUser.id,
              carId,
            },
          },
        });

        isWishlisted = !!savedCar;
      }

      // Check if user has already booked a test drive for this car
      const existingTestDrive = await prisma.testDriveBooking.findFirst({
        where: {
          carId,
          userId: dbUser?.id,
          status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      let userTestDrive = null;

      if (existingTestDrive) {
        userTestDrive = {
          id: existingTestDrive.id,
          status: existingTestDrive.status,
          bookingDate: existingTestDrive.bookingDate.toISOString(),
        };
      }

      // Get dealership info for test drive availability
      const dealership = await prisma.dealershipInfo.findFirst({
        include: {
          workingHours: true,
        },
      });

      return {
        success: true,
        data: {
          ...serializeCarData(car, isWishlisted),
          testDriveInfo: {
            userTestDrive,
            dealership: dealership
              ? {
                  ...dealership,
                  createdAt: dealership.createdAt.toISOString(),
                  updatedAt: dealership.updatedAt.toISOString(),
                  workingHours: dealership.workingHours.map((hour) => ({
                    ...hour,
                    createdAt: hour.createdAt.toISOString(),
                    updatedAt: hour.updatedAt.toISOString(),
                  })),
                }
              : null,
          },
        },
      };
    } catch (error: any) {
      throw new Error("Error fetching car details:" + error.message);
    }
  });

/**
 * Get user's saved cars
 */
export const getSavedCars = authActionClient.action(async ({ ctx: { user } }) => {
  try {
    // Get saved cars with their details
    const savedCars = await prisma.userSavedCar.findMany({
      where: { userId: user.id },
      include: {
        car: true,
      },
      orderBy: { savedAt: "desc" },
    });

    // Extract and format car data
    const cars = savedCars.map((saved) => serializeCarData(saved.car));

    return {
      success: true,
      data: cars,
    };
  } catch (error: any) {
    console.error("Error fetching saved cars:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});
