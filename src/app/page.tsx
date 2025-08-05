import { getAdmin } from "@/actions/admin.actions";
import Header from "@/components/header";
import BodyType from "@/components/home/body-type";
import BrowseSection from "@/components/home/browse-section";
import ChooseUs from "@/components/home/choose-us";
import FaqSection from "@/components/home/faq-section";
import Hero from "@/components/home/hero";
import { Button } from "@/components/ui/button";
import { SignedOut } from "@clerk/nextjs";
import Link from "next/link";
const page = async () => {
  const response = await getAdmin();
  console.log({
    response,
  });

  return (
    <main className="flex flex-col pt-20">
      <Header />
      <Hero />
      <FaqSection />
      <BrowseSection />
      <ChooseUs />
      <BodyType />

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
