import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Barbers from "@/components/Barbers";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";

const Index = () => {
  useEffect(() => {
    // Handle hash in URL to scroll to section when coming from other pages
    const hash = window.location.hash;
    if (hash) {
      const sectionId = hash.substring(1); // Remove the #
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Barbers />
      <Booking />
      <Footer />
    </div>
  );
};

export default Index;
