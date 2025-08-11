import { Button } from "@/components/ui/button";
import { bodyTypes } from "@/lib/data";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
const BodyType = () => {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Browse by Body Type</h2>
          <Button
            variant="ghost"
            className="flex items-center"
            asChild>
            <Link href="/cars">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bodyTypes.map((type) => (
            <Link
              key={type.name}
              href={`/cars?bodyType=${type.name}`}
              className="relative group cursor-pointer">
              <div className="overflow-hidden rounded-lg flex justify-end h-28 mb-4 relative">
                <Image
                  src={
                    // @ts-ignore
                    type.imageUrl || `/body/${type.name.toLowerCase()}.webp`
                  }
                  alt={type.name}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-lg flex items-end">
                <h3 className="text-white text-xl font-bold pl-4 pb-2 ">{type.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BodyType;
