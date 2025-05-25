import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-foreground dark:bg-gray-900 dark:text-gray-100 overflox-x-hidden">
      <Navbar />
      <main className="flex-1 container mx-auto p-0">{children}</main>
      <Footer />
    </div>
  );
}
