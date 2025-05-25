// pages/terms.tsx
import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const Terms: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Terms of Service | PetSwipe</title>
        <meta
          name="description"
          content="Read the PetSwipe Terms of Service."
        />
      </Head>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-6 py-12 space-y-8"
      >
        <h1 className="text-4xl font-extrabold  text-[#234851] dark:text-[#B6EBE9] text-center">
          PetSwipe Terms of Service
        </h1>
        <p className="text-center text-gray-700 dark:text-gray-300">
          By using PetSwipe, you agree to these terms. Please read carefully.
        </p>

        {[
          {
            title: "Acceptance of Terms",
            content: `By accessing or using PetSwipe, you acknowledge that you have read, understood, and agree to be bound by these Terms and all relevant laws and regulations.`,
          },
          {
            title: "Eligibility",
            content: `You must be at least 13 years old to use PetSwipe. By using the service, you represent and warrant that you meet this age requirement.`,
          },
          {
            title: "Account Security",
            content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.`,
          },
          {
            title: "Swiping & Decisions",
            content: `PetSwipe allows you to “swipe” on pets to indicate you’d like to adopt (“right swipe”) or pass (“left swipe”). Once you make a choice on a pet, it is final and cannot be undone. Each pet’s adoption chances depend on your decision, so please think carefully before you swipe.`,
          },
          {
            title: "Content Accuracy",
            content: `All pet profiles, images, and descriptions are provided by our partner shelters. PetSwipe does not guarantee accuracy of any pet information.`,
          },
          {
            title: "Privacy",
            content: (
              <>
                Your use of PetSwipe is also governed by our{" "}
                <Link href="/privacy" legacyBehavior>
                  <a className="text-[#7097A8] underline hover:text-[#5f868d]">
                    Privacy Policy
                  </a>
                </Link>
                , which explains how we handle your personal data.
              </>
            ),
          },
          {
            title: "Termination",
            content: `We may suspend or terminate your account if you violate these Terms or engage in any fraudulent or abusive behavior.`,
          },
          {
            title: "Limitation of Liability",
            content: `PetSwipe is provided “as is” without warranty of any kind. In no event shall PetSwipe be liable for any indirect, incidental, or consequential damages.`,
          },
          {
            title: "Changes to Terms",
            content: `We may modify these Terms at any time. Continued use after changes constitutes acceptance.`,
          },
          {
            title: "Contact Us",
            content: (
              <>
                If you have questions about these Terms, please contact us at{" "}
                <a
                  href="mailto:support@petswipe.io"
                  className="text-[#7097A8] underline hover:text-[#5f868d]"
                >
                  support@petswipe.io
                </a>
                .
              </>
            ),
          },
        ].map((section, idx) => (
          <Card key={idx} className="border border-[#B6EBE9] shadow-sm">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-lg font-semibold  text-[#234851] dark:text-[#B6EBE9]">
                {section.title}
              </CardTitle>
            </CardHeader>
            <Separator className="mx-6" />
            <CardContent className="px-6 py-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {section.content}
            </CardContent>
          </Card>
        ))}

        <p className="mt-8 text-sm text-center text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} PetSwipe. All rights reserved.
        </p>
      </motion.div>
    </Layout>
  );
};

export default Terms;
