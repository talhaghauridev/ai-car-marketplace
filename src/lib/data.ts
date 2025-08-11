import images from "@/constants/images";

export const featuredCars = [
  {
    id: 1,
    make: "Toyota",
    model: "Camry",
    year: 2023,
    price: 28999,
    images: ["/1.png"],
    transmission: "Automatic",
    fuelType: "Gasoline",
    bodyType: "Sedan",
    mileage: 15000,
    color: "White",
    wishlisted: false,
  },
  {
    id: 2,
    make: "Honda",
    model: "Civic",
    year: 2023,
    price: 26499,
    images: ["/2.webp"],
    transmission: "Manual",
    fuelType: "Gasoline",
    bodyType: "Sedan",
    mileage: 12000,
    color: "Blue",
    wishlisted: true,
  },
  {
    id: 3,
    make: "Tesla",
    model: "Model 3",
    year: 2022,
    price: 42999,
    images: ["/3.jpg"],
    transmission: "Automatic",
    fuelType: "Electric",
    bodyType: "Sedan",
    mileage: 8000,
    color: "Red",
    wishlisted: false,
  },
];

export const carMakes = [
  { id: 1, name: "Hyundai", image: images.makes.hyundai.src },
  { id: 2, name: "Honda", image: images.makes.honda.src },
  { id: 3, name: "BMW", image: images.makes.bmw.src },
  { id: 4, name: "Tata", image: images.makes.tata.src },
  { id: 5, name: "Mahindra", image: images.makes.mahindra.src },
  { id: 6, name: "Ford", image: images.makes.ford.src },
];

export const bodyTypes = [
  { id: 1, name: "SUV", image: images.bodyTypes.suv.src },
  { id: 2, name: "Sedan", image: images.bodyTypes.sedan.src },
  { id: 3, name: "Hatchback", image: images.bodyTypes.hatchback.src },
  { id: 4, name: "Convertible", image: images.bodyTypes.convertible.src },
];

export const faqItems = [
  {
    question: "How does the test drive booking work?",
    answer:
      "Simply find a car you're interested in, click the 'Test Drive' button, and select an available time slot. Our system will confirm your booking and provide all necessary details.",
  },
  {
    question: "Can I search for cars using an image?",
    answer:
      "Yes! Our AI-powered image search lets you upload a photo of a car you like, and we'll find similar models in our inventory.",
  },
  {
    question: "Are all cars certified and verified?",
    answer:
      "All cars listed on our platform undergo a verification process. We are a trusted dealerships and verified private seller.",
  },
  {
    question: "What happens after I book a test drive?",
    answer:
      "After booking, you'll receive a confirmation email with all the details. We will also contact you to confirm and provide any additional information.",
  },
];
