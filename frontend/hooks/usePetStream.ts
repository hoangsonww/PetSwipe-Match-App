import { useEffect } from "react";
import { Pet } from "@/lib/api";

/**
 * Subscribe to the backend's SSE stream of newly created pets.
 * @param onPet callback invoked whenever a new pet is created
 */
export function usePetStream(onPet: (pet: Pet) => void) {
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${base}/pets/stream${token ? `?token=${token}` : ""}`;

    const ev = new EventSource(url);
    ev.onmessage = (e) => {
      try {
        const pet = JSON.parse(e.data) as Pet;
        onPet(pet);
      } catch {
        /* ignore malformed payloads */
      }
    };

    return () => ev.close();
  }, [onPet]);
}
