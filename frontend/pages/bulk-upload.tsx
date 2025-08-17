"use client";

import { useState, useMemo } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { Loader2, Upload, FileDown } from "lucide-react";

const BulkUploadPage: NextPage = () => {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const apiBase =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : "";
  const endpoint = useMemo(
    () => (apiBase ? `${apiBase}/pets/upload` : `/api/pets/upload`),
    [apiBase],
  );

  const sampleCsv = `name,type,description,photoUrl,shelterName,shelterContact,shelterAddress
Buddy,Dog,"Friendly golden retriever, 3y",https://images.example.com/buddy.jpg,Happy Paws Rescue,"+1 (413) 555-1234 ext 2; adopt@happypaws.org","123 Elm St, Springfield, IL 62701"
Whiskers,Cat,"Shy tabby, vaccinated",http://images.example.com/whiskers.png,Feline Friends,"(616) 555-0101","45 Catnip Ave, Grand Rapids, MI 49503"
Luna,Dog,"Energetic husky mix; great with kids",https://img.example.com/luna.jpeg,Northern Lights Rescue,luna@nlrescue.org,"99 Aurora Rd, Anchorage, AK 99501"
Mochi,Rabbit,,https://img.example.com/mochi.jpg,Small Pet Haven,"+84 323 232 322","12 Nguyen Trai, Hanoi, Vietnam"
`;

  const downloadSample = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pets_sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please choose a CSV file first.");
      return;
    }

    // >>> Bearer token from localStorage under 'jwt'
    const jwt =
      typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
    if (!jwt) {
      toast.error("Missing auth token. Please log in again.");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          // IMPORTANT: don't set Content-Type; the browser adds the multipart boundary
        } as any,
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Unauthorized. Please log in again.");
        } else {
          toast.error(data?.message || `Upload failed (${res.status})`);
        }
        setResult(data);
        return;
      }

      toast.success(`Imported ${data.imported} row(s)`);
      setResult(data);
    } catch (err: any) {
      toast.error("Unexpected error during upload");
      setResult({ message: String(err?.message || err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Bulk Upload Pets | PetSwipe</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-[#234851] dark:text-[#B6EBE9] mb-2">
          Bulk upload pets
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Upload a CSV file to create multiple pets at once.
        </p>

        {/* Format details */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">CSV format</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <span className="font-semibold">Headers (case-insensitive):</span>{" "}
              <code>name</code>, <code>type</code> (or alias <code>breed</code>
              ), <code>description</code>, <code>photoUrl</code>,{" "}
              <code>shelterName</code>, <code>shelterContact</code>,{" "}
              <code>shelterAddress</code>
            </li>
            <li>
              <span className="font-semibold">Required per row:</span>{" "}
              <code>name</code> and either <code>type</code> or{" "}
              <code>breed</code>.
            </li>
            <li>
              <code>
                <strong>photoUrl</strong>
              </code>{" "}
              must be an <code>http</code> or <code>https</code> URL if
              provided.
            </li>
            <li>
              <code>
                <strong>shelterContact</strong>
              </code>{" "}
              can include phone and/or email in one field (e.g.{" "}
              <code>"(616) 555-0101; adopt@rescue.org"</code>).
            </li>
            <li>No extra/unknown columns are allowed.</li>
          </ul>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <FileDown className="h-4 w-4" />
              <button
                onClick={downloadSample}
                className="underline text-[#234851] dark:text-[#B6EBE9]"
              >
                Download sample CSV
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
              {sampleCsv}
            </pre>
          </div>
        </div>

        {/* Uploader */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <label className="block text-sm font-medium mb-2">
            Choose CSV file
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#234851] file:text-white hover:file:bg-[#1b3a3f] dark:file:bg-[#2a646c] dark:hover:file:bg-[#225158]"
          />

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-[#7097A8] hover:bg-[#5f868d] text-white flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6 rounded-md bg-gray-50 dark:bg-gray-900 p-3">
              <h3 className="font-semibold mb-2">Result</h3>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BulkUploadPage;
