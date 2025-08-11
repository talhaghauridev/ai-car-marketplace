import { getFeaturedCars } from "@/actions/home.actions";
import { CarCard } from "@/components/car-card";
import Header from "@/components/header";
import BodyType from "@/components/home/body-type";
import BrowseSection from "@/components/home/browse-section";
import ChooseUs from "@/components/home/choose-us";
import FaqSection from "@/components/home/faq-section";
import Hero from "@/components/home/hero";
import { Button } from "@/components/ui/button";
import { SignedOut } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
const page = async () => {
  const { data: featuredCars, serverError } = await getFeaturedCars({ limit: 3 });
  return (
    <main className="flex flex-col pt-20">
      <Header />
      <Hero />
      {/* Featured Cars */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Featured Cars</h2>
            <Button
              variant="ghost"
              className="flex items-center"
              asChild>
              <Link href="/cars">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {serverError && <p className="text-red-500">{serverError}</p>}
          {featuredCars && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCars?.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                />
              ))}
            </div>
          )}
          {featuredCars && featuredCars.length === 0 && (
            <p className="text-red-500">No featured cars found</p>
          )}
        </div>
      </section>

      <BrowseSection />
      <ChooseUs />
      <BodyType />
      <FaqSection />

      <section className="py-16 dotted-background text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Car?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who found their perfect vehicle through our
            platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              asChild>
              <Link href="/cars">View All Cars</Link>
            </Button>
            <SignedOut>
              <Button
                size="lg"
                asChild>
                <Link href="/sign-up">Sign Up Now</Link>
              </Button>
            </SignedOut>
          </div>
        </div>
      </section>
    </main>
  );
};

export default page;
