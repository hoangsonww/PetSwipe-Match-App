import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Head from "next/head";

const faqs = [
  {
    q: "What is PetSwipe?",
    a: "PetSwipe is a responsive web app that connects prospective adopters with local shelter pets. Swipe through available pets, view their profiles, and indicate which ones you’d love to adopt.",
  },
  {
    q: "How do I start swiping?",
    a: "Once you sign up and log in, you’re assigned a deck of pet matches. Swipe right to “Adopt” or left to “Pass.” Your choices are saved instantly.",
  },
  {
    q: "Can I change my mind after swiping?",
    a: "Unfortunately, no. We want our users to make thoughtful decisions about pet adoption. Once you swipe, it’s final. These are real pets looking for homes!",
  },
  {
    q: "How do I add my own pet for adoption?",
    a: "Go to “Add Pet” via the + icon in the navbar, fill in the pet’s details and photo, and submit. Your listing will appear for other users to swipe on.",
  },
  {
    q: "How do I get the pet I swiped right on?",
    a: "Once you like a pet, go to your “My Likes” page. You’ll find a list of all pets you’ve liked. From there, you can contact the shelter or foster parent for adoption details.",
  },
  {
    q: "Do I need to be logged in to browse pets?",
    a: "Yes - creating an account lets us save your swipes, build your profile of liked pets, and let you manage your own pet listings securely.",
  },
  {
    q: "Where do the pet photos come from?",
    a: "Shelter staff or foster parents upload photos when adding a pet. All images are stored securely on our S3 bucket.",
  },
  {
    q: "Is my personal data safe?",
    a: "Absolutely. We store only your email and optional profile info. Passwords are hashed, and all API calls require a secure session cookie.",
  },
  {
    q: "Can I browse on my phone?",
    a: "Yes - the swipe interface is fully touch-enabled and responsive, so you can adopt on the go!",
  },
  {
    q: "How do I view pets I’ve adopted (liked)?",
    a: "Visit the “My Likes” page via the heart icon (or “All Likes” link). You’ll see a grid of all pets you’ve swiped right on.",
  },
  {
    q: "What if I encounter a bug?",
    a: "Please report any issues on our GitHub Issues page or email support at pet-swipe@example.com. We’ll get on it right away!",
  },
  {
    q: "Can I filter pets by type?",
    a: "Coming soon! We’re working on breed, age, and type filters to help you find your perfect match faster.",
  },
  {
    q: "How often is the pet list updated?",
    a: "Whenever a shelter adds or removes a pet, it appears or disappears in real time - no page refresh needed.",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

const FAQ: NextPage = () => {
  const router = useRouter();

  return (
    <Layout>
      <Head>
        <title>FAQs | PetSwipe</title>
      </Head>

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16">
        {/* header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center text-4xl font-extrabold text-[#234851] dark:text-[#B6EBE9]"
        >
          Frequently Asked Questions
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="mt-3 text-center text-lg text-[#4c6d74] dark:text-[#B6EBE9]"
        >
          Everything you need to know about PetSwipe
        </motion.p>

        {/* accordion */}
        <Accordion type="single" collapsible className="mt-12 space-y-4">
          {faqs.map((f, i) => (
            <motion.div
              key={f.q}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={itemVariants}
            >
              <Card className="border border-[#B6EBE9] shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="px-6 py-4">
                  <AccordionItem value={f.q}>
                    <AccordionTrigger className="text-lg font-medium text-[#234851] dark:text-[#B6EBE9]">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="px-0 pb-6 pt-2 text-gray-700 leading-relaxed dark:text-white">
                        {f.a}
                      </CardContent>
                    </AccordionContent>
                  </AccordionItem>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </Accordion>

        {/* contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 rounded-lg bg-[#EDF6F3] p-6 text-center shadow-sm"
        >
          <p className="text-sm text-[#4c6d74]">
            Still have questions? Email&nbsp;
            <a
              href="mailto:support@petswipe.app"
              className="font-semibold text-[#7097A8] underline underline-offset-2"
            >
              support@petswipe.app
            </a>
          </p>
        </motion.div>

        {/* back button */}
        <div className="mt-12 flex justify-center">
          <Button
            onClick={() => router.push("/home")}
            className="bg-[#7097A8] hover:bg-[#5f868d] text-white flex items-center gap-2 px-6 py-2"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default FAQ;
