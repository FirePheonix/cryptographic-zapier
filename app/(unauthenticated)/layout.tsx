import type { ReactNode } from "react";
// Import the floating header from the landing directory as a default import
import Header from "@/components/landing/Header/index"; 
import { Footer } from "./components/footer";
// SubFooter import removed

type UnauthenticatedLayoutProps = {
  children: ReactNode;
};

const UnauthenticatedLayout = ({ children }: UnauthenticatedLayoutProps) => (
  // Container padding removed to allow the floating bar to sit properly
  <div className="min-h-screen flex flex-col bg-black">
    {/* Floating bar from the main landing page */}
    <Header /> 
    
    <main className="flex-1 w-full">
      {children}
    </main>

    {/* Standard footer remains, SubFooter is removed */}
    <Footer />
  </div>
);

export default UnauthenticatedLayout;