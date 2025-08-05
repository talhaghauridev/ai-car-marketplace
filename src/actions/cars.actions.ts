"use server";

import { env } from "@/env";
import { fileToBase64, serializeCarData } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import {
  addCarSchema,
  deleteCarSchema,
  getCarsSchema,
  processCarImageSchema,
  updateCarStatusSchema,
} from "@/lib/validations/cars.validations";
import { actionClient, authActionClient } from "@/utils/safe-action";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

interface CarAIResponse {
  make: string;
  model: string;
  year: number;
  color: string;
  price: string;
  mileage: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  description: string;
  confidence: number;
}

interface ProcessedCarImage {
  success: boolean;
  data?: CarAIResponse;
  error?: string;
}

export const processCarImageWithAI = actionClient
  .inputSchema(processCarImageSchema)
  .action(async ({ parsedInput: { file } }): Promise<ProcessedCarImage> => {
    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const base64Image = await fileToBase64(file);

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: file.type,
        },
      };

      const prompt = `
        Analyze this car image and extract the following information:
        1. Make (manufacturer)
        2. Model
        3. Year (approximately)
        4. Color
        5. Body type (SUV, Sedan, Hatchback, etc.)
        6. Mileage (estimate)
        7. Fuel type (your best guess)
        8. Transmission type (your best guess)
        9. Price (your best guess in USD)
        10. Short Description as to be added to a car listing

        Format your response as a clean JSON object with these fields:
        {
          "make": "",
          "model": "",
          "year": 0000,
          "color": "",
          "price": "",
          "mileage": "",
          "bodyType": "",
          "fuelType": "",
          "transmission": "",
          "description": "",
          "confidence": 0.0
        }

        For confidence, provide a value between 0 and 1 representing how confident you are in your overall identification.
        Only respond with the JSON object, nothing else.
      `;

      const result = await model.generateContent([imagePart, prompt]);
      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      try {
        const carDetails: CarAIResponse = JSON.parse(cleanedText);

        const requiredFields: (keyof CarAIResponse)[] = [
          "make",
          "model",
          "year",
          "color",
          "bodyType",
          "price",
          "mileage",
          "fuelType",
          "transmission",
          "description",
          "confidence",
        ];

        const missingFields = requiredFields.filter((field) => !(field in carDetails));

        if (missingFields.length > 0) {
          throw new Error(`AI response missing required fields: ${missingFields.join(", ")}`);
        }

        return {
          success: true,
          data: carDetails,
        };
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        console.log("Raw response:", text);
        return {
          success: false,
          error: "Failed to parse AI response",
        };
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

// ✅ Add Car - Requires Authentication
export const addCar = authActionClient
  .inputSchema(addCarSchema)
  .action(async ({ parsedInput: { carData, images }, ctx: { user } }) => {
    try {
      const carId = uuidv4();
      const folderPath = `cars/${carId}`;

      const cookieStore = await cookies();
      //   @ts-ignore
      const supabase = createClient(cookieStore);

      const imageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i];

        if (!base64Data || !base64Data.startsWith("data:image/")) {
          console.warn("Skipping invalid image data");
          continue;
        }

        const base64 = base64Data.split(",")[1];
        const imageBuffer = Buffer.from(base64, "base64");

        const mimeMatch = base64Data.match(/data:image\/([a-zA-Z0-9]+);/);
        const fileExtension = mimeMatch ? mimeMatch[1] : "jpeg";

        const fileName = `image-${Date.now()}-${i}.${fileExtension}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("car-images")
          .upload(filePath, imageBuffer, {
            contentType: `image/${fileExtension}`,
          });

        if (error) {
          console.error("Error uploading image:", error);
          throw new Error(`Failed to upload image: ${error.message}`);
        }

        const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;

        imageUrls.push(publicUrl);
      }

      if (imageUrls.length === 0) {
        throw new Error("No valid images were uploaded");
      }

      const car = await prisma.car.create({
        data: {
          id: carId,
          make: carData.make,
          model: carData.model,
          year: carData.year,
          price: carData.price,
          mileage: carData.mileage,
          color: carData.color,
          fuelType: carData.fuelType,
          transmission: carData.transmission,
          bodyType: carData.bodyType,
          seats: carData.seats,
          description: carData.description,
          status: carData.status,
          featured: carData.featured,
          images: imageUrls,
        },
      });

      revalidatePath("/admin/cars");

      return {
        success: true,
        data: { carId: car.id },
      };
    } catch (error) {
      console.error("Error adding car:", error);
      throw new Error(
        `Error adding car: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

// ✅ Get Cars - Public action (no auth required)
export const getCars = actionClient
  .inputSchema(getCarsSchema)
  .action(async ({ parsedInput: { search } }) => {
    try {
      let where: any = {};

      if (search) {
        where.OR = [
          { make: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } },
          { color: { contains: search, mode: "insensitive" } },
        ];
      }

      const cars = await prisma.car.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const serializedCars = cars.map((car) => serializeCarData(car));

      return {
        success: true,
        data: serializedCars,
      };
    } catch (error) {
      console.error("Error fetching cars:", error);
      throw new Error(
        `Error fetching cars: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

// ✅ Delete Car - Requires Authentication
export const deleteCar = authActionClient
  .inputSchema(deleteCarSchema)
  .action(async ({ parsedInput: { id }, ctx: { user } }) => {
    try {
      const car = await prisma.car.findUnique({
        where: { id },
        select: { images: true },
      });

      if (!car) {
        throw new Error("Car not found");
      }

      await prisma.car.delete({
        where: { id },
      });

      try {
        const cookieStore = await cookies();
        // @ts-ignore
        const supabase = createClient(cookieStore);

        const filePaths = car.images
          .map((imageUrl: string) => {
            const url = new URL(imageUrl);
            const pathMatch = url.pathname.match(/\/car-images\/(.*)/);
            return pathMatch ? pathMatch[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          const { error } = await supabase.storage.from("car-images").remove(filePaths);

          if (error) {
            console.error("Error deleting images:", error);
          }
        }
      } catch (storageError) {
        console.error("Error with storage operations:", storageError);
      }

      revalidatePath("/admin/cars");

      return {
        success: true,
        message: "Car deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting car:", error);
      throw new Error(
        `Error deleting car: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

// ✅ Update Car Status - Requires Authentication
export const updateCarStatus = authActionClient
  .inputSchema(updateCarStatusSchema)
  .action(async ({ parsedInput: { id, status, featured }, ctx: { user } }) => {
    try {
      const updateData: any = {};

      if (status !== undefined) {
        updateData.status = status;
      }

      if (featured !== undefined) {
        updateData.featured = featured;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("No fields to update");
      }

      const updatedCar = await prisma.car.update({
        where: { id },
        data: updateData,
      });

      revalidatePath("/admin/cars");

      return {
        success: true,
        data: {
          id: updatedCar.id,
          status: updatedCar.status,
          featured: updatedCar.featured,
        },
      };
    } catch (error) {
      console.error("Error updating car status:", error);
      throw new Error(
        `Error updating car status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });
