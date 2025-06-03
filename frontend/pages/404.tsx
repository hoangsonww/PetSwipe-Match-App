import Head from "next/head";
import Link from "next/link";
import { PawPrint, Heart } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 40, willChange: "opacity, transform" as const },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

const NotFoundPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const blobY = useTransform(
    scrollY,
    [0, 500],
    prefersReducedMotion ? [0, 0] : [0, 150],
  );

  return (
    <>
      <Head>
        <title>404 - Page Not Found | PetSwipe</title>
        <meta
          name="description"
          content="Oops! The page you are looking for has wandered off. Return home to find your next forever friend."
        />
      </Head>

      <section className="relative flex items-center justify-center min-h-screen overflow-hidden font-inter bg-gradient-to-br from-[#f6fcff] to-[#e8f8ff]">
        {/* Background Gradient Animation Blobs */}
        <motion.div
          style={{ y: blobY }}
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#90cdf4] opacity-20 blur-3xl will-change-transform"
        />
        <motion.div
          style={{ y: blobY }}
          className="pointer-events-none absolute -right-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[#f687b3] opacity-20 blur-3xl will-change-transform"
        />

        <div className="relative z-10 text-center px-6 max-w-xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center justify-center mb-6 space-x-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md text-[#234851] font-medium shadow"
          >
            <PawPrint size={20} className="text-[#7097A8]" />
            <span>Lost Your Way?</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.15}
            className="text-[5rem] md:text-[6rem] font-extrabold text-[#234851] leading-none"
          >
            <motion.span
              animate={{
                scale: [1, 1.02, 1],
                rotate: [0, 1.5, 0],
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="inline-block"
            >
              404
            </motion.span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="mt-4 text-xl md:text-2xl font-semibold text-gray-700"
          >
            Oops! The page you’re looking for has wandered off.
          </motion.p>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.45}
            className="mt-2 text-gray-600 max-w-lg mx-auto leading-relaxed"
          >
            Whether you were chasing a missing paw print or exploring new
            features, we can’t seem to find that page. Don’t worry - we’ll help
            you get back on track so you can continue finding your forever
            friend.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.6}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/" passHref>
              <Button className="px-8 py-3 text-lg bg-[#7097A8] hover:bg-[#5f868d] text-white shadow-lg">
                Go to Homepage
              </Button>
            </Link>
            <Link href="/home" passHref>
              <Button
                variant="outline"
                className="px-8 py-3 text-lg hover:bg-[#f0fdfa] border-[#7097A8] text-[#234851]"
              >
                Browse Pets
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="bg-[#fff] py-8 text-[#234851] font-inter">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-sm">
            From{" "}
            <Link href="https://github.com/hoangsonww" legacyBehavior>
              <a
                className="font-semibold underline hover:text-gray-700 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                Son Nguyen
              </a>
            </Link>{" "}
            in 2025 with{" "}
            <Heart className="inline-block h-4 w-4 text-red-400 align-middle" />
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="https://github.com/hoangsonww/PetSwipe-Match-App"
              legacyBehavior
            >
              <a
                className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                <PawPrint className="h-4 w-4" />
                <span>GitHub Repository</span>
              </a>
            </Link>
            <Link href="/terms" legacyBehavior>
              <a className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap">
                <span>Terms&nbsp;of&nbsp;Service</span>
              </a>
            </Link>
            <Link href="/privacy" legacyBehavior>
              <a className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap">
                <span>Privacy&nbsp;Policy</span>
              </a>
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            sans-serif;
        }
        @keyframes blob {
          0%,
          100% {
            transform: translate3d(-45%, -45%, 0) scale(1);
          }
          50% {
            transform: translate3d(45%, 45%, 0) scale(1.2);
          }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </>
  );
};

export default NotFoundPage;
