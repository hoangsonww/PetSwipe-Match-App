import { AppProps } from "next/app";
import { AuthProvider } from "@/context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import DraggablePetChatbot from "@/components/DraggableChatbot";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Component {...pageProps} />
          <DraggablePetChatbot />
        </ThemeProvider>
      </TooltipProvider>

      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          className: "bg-gray-900 text-white",
          style: {
            backgroundColor: "#1f2937",
            color: "#ffffff",
          },
        }}
      />

      <Analytics />
    </AuthProvider>
  );
}
