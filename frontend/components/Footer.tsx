import Link from "next/link";
import { Github, FileText, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#7097A8] text-white py-6">
      <div className="max-w-4xl mx-auto text-center space-y-2">
        {/* Tagline */}
        <p className="text-sm">
          From{" "}
          <Link href="https://github.com/hoangsonww" legacyBehavior>
            <a
              className="font-semibold underline hover:text-gray-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Son Nguyen
            </a>
          </Link>{" "}
          in 2025 with{" "}
          <Heart className="inline-block h-4 w-4 text-red-400 align-middle" />
        </p>

        {/* Links */}
        <div className="flex justify-center space-x-6">
          <Link href="https://github.com/hoangsonww/petswipe" legacyBehavior>
            <a
              className="flex items-center space-x-1 hover:text-gray-200 transition text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </Link>

          <Link href="/terms" legacyBehavior>
            <a className="flex items-center space-x-1 hover:text-gray-200 transition text-sm">
              <FileText className="h-4 w-4" />
              <span>Terms of Service</span>
            </a>
          </Link>

          <Link href="/privacy" legacyBehavior>
            <a className="flex items-center space-x-1 hover:text-gray-200 transition text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Privacy Policy</span>
            </a>
          </Link>
        </div>
      </div>
    </footer>
  );
}
