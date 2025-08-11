import { getCarById } from "@/actions/car-listing.actions";
import { CarDetails } from "./_components/car-details";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<any> }) {
  const { id } = await params;
  const { data: result, serverError } = await getCarById({ carId: id });
  if (serverError && !result?.success) {
    return {
      title: "Car Not Found | Vehiql",
      description: "The requested car could not be found",
    };
  }

  const car = result?.data;

  return {
    title: `${car.year} ${car.make} ${car.model} | Vehiql`,
    description: car.description.substring(0, 160),
    openGraph: {
      images: car.images?.[0] ? [car.images[0]] : [],
    },
  };
}

export default async function CarDetailsPage({ params }: { params: Promise<any> }) {
  // Fetch car details
  const { id } = await params;
  const { data: result, serverError } = await getCarById({ carId: id });

  if (serverError) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <CarDetails
        car={result?.data}
        testDriveInfo={result?.data?.testDriveInfo}
      />
    </div>
  );
}
