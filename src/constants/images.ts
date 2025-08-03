import logo_white from "@/public/logo-white.png";
import logo_black from "@/public/logo-black.png";
import logo from "@/public/logo.png";
import convertible from "@/public/body/convertible.webp";
import hatchback from "@/public/body/hatchback.webp";
import sedan from "@/public/body/sedan.webp";
import suv from "@/public/body/suv.webp";
import bmw from "@/public/make/bmw.webp";
import ford from "@/public/make/ford.webp";
import honda from "@/public/make/honda.webp";
import hyundai from "@/public/make/hyundai.webp";
import mahindra from "@/public/make/mahindra.webp";
import tata from "@/public/make/tata.webp";
import featured1 from "@/public/1.png";
import featured2 from "@/public/2.webp";
import featured3 from "@/public/3.jpg";

const images = {
  logos: {
    default: logo,
    light: logo_white,
    dark: logo_black,
  },

  bodyTypes: {
    convertible,
    hatchback,
    sedan,
    suv,
  },

  makes: {
    bmw,
    ford,
    honda,
    hyundai,
    mahindra,
    tata,
  },

  featured: [featured1, featured2, featured3],
} as const;

export default images;
