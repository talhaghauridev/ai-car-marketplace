"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { addCar, processCarImageWithAI } from "@/actions/cars.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "next-safe-action/hooks";

// Predefined options
const fuelTypes = ["PETROL", "DIESEL", "ELECTRIC", "HYBRID", "CNG"];
const transmissions = ["MANUAL", "AUTOMATIC", "CVT"];
const bodyTypes = ["SUV", "SEDAN", "HATCHBACK", "CONVERTIBLE", "COUPE", "WAGON", "TRUCK"];
const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];

// Define form schema with Zod
const carFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine((val) => {
    const year = parseInt(val);
    return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
  }, "Valid year required"),
  price: z.string().min(1, "Price is required"),
  mileage: z.string().min(1, "Mileage is required"),
  color: z.string().min(1, "Color is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  bodyType: z.string().min(1, "Body type is required"),
  seats: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
  featured: z.boolean().default(false),
});

// ✅ Helper functions to safely parse AI data
const parseAIData = {
  // Parse price strings like "$120,000", "120000", "120k" etc.
  price: (priceStr: string): string => {
    if (!priceStr || priceStr.toLowerCase() === "unknown") return "";

    // Remove currency symbols, commas, and spaces
    const cleanPrice = priceStr.replace(/[$,\s]/g, "");

    // Handle 'k' suffix (e.g., "25k" -> "25000")
    if (cleanPrice.toLowerCase().endsWith("k")) {
      const num = parseFloat(cleanPrice.slice(0, -1));
      return isNaN(num) ? "" : (num * 1000).toString();
    }

    // Parse regular number
    const num = parseFloat(cleanPrice);
    return isNaN(num) ? "" : num.toString();
  },

  // Parse mileage strings like "15,000", "New", "Low" etc.
  mileage: (mileageStr: string): string => {
    if (!mileageStr) return "";

    const lower = mileageStr.toLowerCase();

    // Handle special cases
    if (lower.includes("new") || lower.includes("0")) return "0";
    if (lower.includes("low")) return "10000";
    if (lower.includes("high")) return "100000";
    if (lower.includes("unknown")) return "";

    // Extract numbers from string
    const numbers = mileageStr.replace(/[^\d]/g, "");
    const num = parseInt(numbers);
    return isNaN(num) ? "" : num.toString();
  },

  // Normalize fuel type to match our enum
  fuelType: (fuelStr: string): string => {
    if (!fuelStr) return "";

    const lower = fuelStr.toLowerCase();
    if (lower.includes("petrol") || lower.includes("gasoline") || lower.includes("gas"))
      return "PETROL";
    if (lower.includes("diesel")) return "DIESEL";
    if (lower.includes("electric") || lower.includes("ev")) return "ELECTRIC";
    if (lower.includes("hybrid")) return "HYBRID";
    if (lower.includes("cng")) return "CNG";

    return "PETROL"; // Default fallback
  },

  // Normalize transmission
  transmission: (transStr: string): string => {
    if (!transStr) return "";

    const lower = transStr.toLowerCase();
    if (lower.includes("automatic") || lower.includes("auto")) return "AUTOMATIC";
    if (lower.includes("manual")) return "MANUAL";
    if (lower.includes("cvt")) return "CVT";

    return "AUTOMATIC"; // Default fallback
  },

  // Normalize body type
  bodyType: (bodyStr: string): string => {
    if (!bodyStr) return "";

    const lower = bodyStr.toLowerCase();
    if (lower.includes("suv")) return "SUV";
    if (lower.includes("sedan")) return "SEDAN";
    if (lower.includes("hatchback") || lower.includes("hatch")) return "HATCHBACK";
    if (lower.includes("convertible")) return "CONVERTIBLE";
    if (lower.includes("coupe")) return "COUPE";
    if (lower.includes("wagon") || lower.includes("estate")) return "WAGON";
    if (lower.includes("truck") || lower.includes("pickup")) return "TRUCK";

    return "SEDAN"; // Default fallback
  },

  // Parse seats
  seats: (seatsStr: string | number): string => {
    if (!seatsStr) return "5"; // Default to 5 seats

    const num = typeof seatsStr === "number" ? seatsStr : parseInt(seatsStr.toString());
    if (isNaN(num) || num < 1 || num > 20) return "5";

    return num.toString();
  },
};

export const AddCarForm = () => {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedAiImage, setUploadedAiImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("ai");
  const [imageError, setImageError] = useState("");

  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    handleSubmit,
    watch,
  } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      status: "AVAILABLE" as const,
      featured: false,
    },
  });

  const { isPending: addCarLoading, execute: addCarFn, result: addCarResult } = useAction(addCar);

  const {
    isPending: processImageLoading,
    execute: processImageFn,
    result: processImageResult,
  } = useAction(processCarImageWithAI);

  useEffect(() => {
    if (addCarResult?.data?.success) {
      toast.success("Car added successfully");
      router.push("/admin/cars");
    }

    if (addCarResult?.serverError) {
      toast.error(addCarResult.serverError);
    }
  }, [addCarResult, router]);

  useEffect(() => {
    if (processImageResult?.serverError) {
      toast.error(processImageResult.serverError || "Failed to process image");
    }
  }, [processImageResult?.serverError]);

  // ✅ Enhanced AI result processing with better error handling
  useEffect(() => {
    if (processImageResult?.data?.success) {
      const carDetails = processImageResult.data.data;

      if (!carDetails) {
        toast.error("No car details extracted from image");
        return;
      }

      try {
        // ✅ Safely update form with AI results using helper functions
        setValue("make", carDetails.make || "");
        setValue("model", carDetails.model || "");
        setValue("year", carDetails.year ? carDetails.year.toString() : "");
        setValue("color", carDetails.color || "");
        setValue("description", carDetails.description || "");

        // ✅ Parse complex fields with fallbacks
        const parsedPrice = parseAIData.price(carDetails.price || "");
        const parsedMileage = parseAIData.mileage(carDetails.mileage || "");
        const parsedFuelType = parseAIData.fuelType(carDetails.fuelType || "");
        const parsedTransmission = parseAIData.transmission(carDetails.transmission || "");
        const parsedBodyType = parseAIData.bodyType(carDetails.bodyType || "");

        setValue("price", parsedPrice);
        setValue("mileage", parsedMileage);
        setValue("fuelType", parsedFuelType);
        setValue("transmission", parsedTransmission);
        setValue("bodyType", parsedBodyType);

        // Add the AI processed image to uploaded images
        if (uploadedAiImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result) {
              setUploadedImages((prev) => [...prev, result as string]);
            }
          };
          reader.readAsDataURL(uploadedAiImage);
        }

        // ✅ Show detailed success message
        const confidence = Math.round((carDetails.confidence || 0) * 100);
        toast.success("Successfully extracted car details", {
          description: `Detected ${carDetails.year || "Unknown"} ${carDetails.make || "Unknown"} ${carDetails.model || "Unknown"} with ${confidence}% confidence`,
        });

        // Switch to manual tab for review
        setActiveTab("manual");
      } catch (error) {
        console.error("Error processing AI data:", error);
        toast.error("Error processing AI data. Please fill in details manually.");
      }
    }
  }, [processImageResult, setValue, uploadedAiImage]);

  // Process image with Gemini AI
  const processWithAI = async () => {
    if (!uploadedAiImage) {
      toast.error("Please upload an image first");
      return;
    }
    await processImageFn({ file: uploadedAiImage });
  };

  // Handle AI image upload with Dropzone
  const onAiDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadedAiImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps: getAiRootProps, getInputProps: getAiInputProps } = useDropzone({
    onDrop: onAiDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Handle multiple image uploads with Dropzone
  const onMultiImagesDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit and will be skipped`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);

        // Process the images
        const newImages: string[] = [];
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              newImages.push(e.target.result as string);
            }

            // When all images are processed
            if (newImages.length === validFiles.length) {
              setUploadedImages((prev) => [...prev, ...newImages]);
              setUploadProgress(0);
              setImageError("");
              toast.success(`Successfully uploaded ${validFiles.length} images`);
            }
          };
          reader.readAsDataURL(file);
        });
      }
    }, 200);
  }, []);

  const { getRootProps: getMultiImageRootProps, getInputProps: getMultiImageInputProps } =
    useDropzone({
      onDrop: onMultiImagesDrop,
      accept: {
        "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      },
      multiple: true,
    });

  // Remove image from upload preview
  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Enhanced form submission with better error handling
  const onSubmit = async (data: any) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image");
      return;
    }

    try {
      // ✅ Safely parse form data with fallbacks
      const carData = {
        make: data.make || "",
        model: data.model || "",
        year: parseInt(data.year) || new Date().getFullYear(),
        price: parseFloat(data.price) || 0,
        mileage: parseInt(data.mileage) || 0,
        color: data.color || "",
        fuelType: data.fuelType || "PETROL",
        transmission: data.transmission || "AUTOMATIC",
        bodyType: data.bodyType || "SEDAN",
        seats: data.seats ? parseInt(data.seats) : 5,
        description: data.description || "",
        status: data.status || "AVAILABLE",
        featured: Boolean(data.featured),
      };

      console.log({ carData });

      // ✅ Uncomment when ready to submit
      await addCarFn({
        carData,
        images: uploadedImages,
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Error submitting form. Please check your data.");
    }
  };

  return (
    <div>
      <Tabs
        defaultValue="ai"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai">AI Upload</TabsTrigger>
        </TabsList>

        <TabsContent
          value="manual"
          className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Car Details</CardTitle>
              <CardDescription>Enter the details of the car you want to add.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Make */}
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      {...register("make")}
                      placeholder="e.g. Toyota"
                      className={errors.make ? "border-red-500" : ""}
                    />
                    {errors.make && <p className="text-xs text-red-500">{errors.make.message}</p>}
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      {...register("model")}
                      placeholder="e.g. Camry"
                      className={errors.model ? "border-red-500" : ""}
                    />
                    {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
                  </div>

                  {/* Year */}
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      {...register("year")}
                      placeholder="e.g. 2022"
                      className={errors.year ? "border-red-500" : ""}
                    />
                    {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      {...register("price")}
                      placeholder="e.g. 25000"
                      className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                  </div>

                  {/* Mileage */}
                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      id="mileage"
                      {...register("mileage")}
                      placeholder="e.g. 15000"
                      className={errors.mileage ? "border-red-500" : ""}
                    />
                    {errors.mileage && (
                      <p className="text-xs text-red-500">{errors.mileage.message}</p>
                    )}
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      {...register("color")}
                      placeholder="e.g. Blue"
                      className={errors.color ? "border-red-500" : ""}
                    />
                    {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
                  </div>

                  {/* Fuel Type */}
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select
                      value={watch("fuelType")}
                      onValueChange={(value) => setValue("fuelType", value)}>
                      <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((type) => (
                          <SelectItem
                            key={type}
                            value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuelType && (
                      <p className="text-xs text-red-500">{errors.fuelType.message}</p>
                    )}
                  </div>

                  {/* Transmission */}
                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission</Label>
                    <Select
                      value={watch("transmission")}
                      onValueChange={(value) => setValue("transmission", value)}>
                      <SelectTrigger className={errors.transmission ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissions.map((type) => (
                          <SelectItem
                            key={type}
                            value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transmission && (
                      <p className="text-xs text-red-500">{errors.transmission.message}</p>
                    )}
                  </div>

                  {/* Body Type */}
                  <div className="space-y-2">
                    <Label htmlFor="bodyType">Body Type</Label>
                    <Select
                      value={watch("bodyType")}
                      onValueChange={(value) => setValue("bodyType", value)}>
                      <SelectTrigger className={errors.bodyType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((type) => (
                          <SelectItem
                            key={type}
                            value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bodyType && (
                      <p className="text-xs text-red-500">{errors.bodyType.message}</p>
                    )}
                  </div>

                  {/* Seats */}
                  <div className="space-y-2">
                    <Label htmlFor="seats">
                      Number of Seats <span className="text-sm text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="seats"
                      {...register("seats")}
                      placeholder="e.g. 5"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(value) =>
                        setValue("status", value as "AVAILABLE" | "UNAVAILABLE" | "SOLD")
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {carStatuses.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter detailed description of the car..."
                    className={`min-h-32 ${errors.description ? "border-red-500" : ""}`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Featured */}
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id="featured"
                    checked={watch("featured")}
                    onCheckedChange={(checked) => {
                      setValue("featured", checked as boolean);
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="featured">Feature this car</Label>
                    <p className="text-sm text-gray-500">Featured cars appear on the homepage</p>
                  </div>
                </div>

                {/* Image Upload with Dropzone */}
                <div>
                  <Label
                    htmlFor="images"
                    className={imageError ? "text-red-500" : ""}>
                    Images {imageError && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="mt-2">
                    <div
                      {...getMultiImageRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition ${
                        imageError ? "border-red-500" : "border-gray-300"
                      }`}>
                      <input {...getMultiImageInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Drag & drop or click to upload multiple images
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          (JPG, PNG, WebP, max 5MB each)
                        </span>
                      </div>
                    </div>
                    {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
                    {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}
                  </div>

                  {/* Image Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">
                        Uploaded Images ({uploadedImages.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative group">
                            <img
                              src={image}
                              alt={`Car image ${index + 1}`}
                              className="h-28 w-full object-cover rounded-md"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={addCarLoading}>
                  {addCarLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Car...
                    </>
                  ) : (
                    "Add Car"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="ai"
          className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Car Details Extraction</CardTitle>
              <CardDescription>
                Upload an image of a car and let Gemini AI extract its details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={imagePreview}
                        alt="Car preview"
                        className="max-h-56 max-w-full object-contain mb-4"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImagePreview(null);
                            setUploadedAiImage(null);
                          }}>
                          Remove
                        </Button>
                        <Button
                          onClick={processWithAI}
                          disabled={processImageLoading}
                          size="sm">
                          {processImageLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Camera className="mr-2 h-4 w-4" />
                              Extract Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      {...getAiRootProps()}
                      className="cursor-pointer hover:bg-gray-50 transition">
                      <input {...getAiInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Drag & drop or click to upload a car image
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          (JPG, PNG, WebP, max 5MB)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {processImageLoading && (
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-md flex items-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Analyzing image...</p>
                      <p className="text-sm">Gemini AI is extracting car details</p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">How it works</h3>
                  <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
                    <li>Upload a clear image of the car</li>
                    <li>Click "Extract Details" to analyze with Gemini AI</li>
                    <li>Review the extracted information</li>
                    <li>Fill in any missing details manually</li>
                    <li>Add the car to your inventory</li>
                  </ol>
                </div>

                <div className="bg-amber-50 p-4 rounded-md">
                  <h3 className="font-medium text-amber-800 mb-1">Tips for best results</h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Use clear, well-lit images</li>
                    <li>• Try to capture the entire vehicle</li>
                    <li>• For difficult models, use multiple views</li>
                    <li>• Always verify AI-extracted information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
