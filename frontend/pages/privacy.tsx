import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Privacy: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy | PetSwipe</title>
        <meta
          name="description"
          content="Understand how PetSwipe collects, uses, and shares your data."
        />
      </Head>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-6 py-12 space-y-8"
      >
        <h1 className="text-4xl font-extrabold text-[#234851] dark:text-[#B6EBE9] text-center">
          PetSwipe Privacy Policy
        </h1>
        <p className="text-center text-gray-700 dark:text-gray-300">
          This Privacy Policy explains how PetSwipe collects, uses, and
          discloses your personal information.
        </p>

        {[
          {
            title: "1. Information We Collect",
            content: (
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Account Information:</strong> Email, name (optional),
                  date of birth (optional), and avatar.
                </li>
                <li>
                  <strong>Swipe Data:</strong> Which pets you “adopt” or “pass”
                  and timestamps.
                </li>
                <li>
                  <strong>Profile Updates:</strong> Any changes you make to your
                  bio or preferences.
                </li>
                <li>
                  <strong>Support Requests:</strong> Messages you send us for
                  help.
                </li>
              </ul>
            ),
          },
          {
            title: "2. How We Use Your Information",
            content: (
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Personalization:</strong> To recommend pets and track
                  matches.
                </li>
                <li>
                  <strong>Analytics:</strong> To improve our service.
                </li>
                <li>
                  <strong>Account Management:</strong> To authenticate and
                  secure your account.
                </li>
                <li>
                  <strong>Communication:</strong> To send confirmations and
                  support.
                </li>
              </ul>
            ),
          },
          {
            title: "3. Cookies & Tracking",
            content: `We use cookies and similar tech to remember your preferences and session. You can disable cookies, but some features may not work.`,
          },
          {
            title: "4. Data Sharing & Disclosure",
            content: (
              <>
                We do not sell your personal data. We may share info with:
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Service providers (hosting, analytics, etc.).</li>
                  <li>Legal authorities if required by law.</li>
                </ul>
              </>
            ),
          },
          {
            title: "5. Data Retention",
            content: `We keep your account and swipe history as long as your account exists or as needed for legal reasons.`,
          },
          {
            title: "6. Your Rights",
            content: (
              <>
                You may request to access, correct, or delete your data by
                contacting{" "}
                <a
                  href="mailto:support@petswipe.io"
                  className="text-[#7097A8] underline hover:text-[#5f868d]"
                >
                  support@petswipe.io
                </a>
                . We will respond within 30 days.
              </>
            ),
          },
          {
            title: "7. Security",
            content: `We implement TLS encryption and secure storage, but no system is 100% secure.`,
          },
          {
            title: "8. Children's Privacy",
            content: `PetSwipe is not intended for children under 13. We do not knowingly collect minors' data.`,
          },
          {
            title: "9. Changes to This Policy",
            content: `We may update this policy. The “Last Updated” date at top shows the revision. Continued use means acceptance.`,
          },
        ].map((section, idx) => (
          <Card key={idx} className="border border-[#B6EBE9] shadow-sm">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-lg font-semibold text-[#234851] dark:text-[#B6EBE9]">
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

export default Privacy;
