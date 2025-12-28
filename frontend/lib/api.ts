import axios, { AxiosInstance } from "axios";

/**
 * Dedicated axios instance for PetSwipe backend.
 */
export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // e.g. "http://localhost:5001/api"
  withCredentials: true,
});

/**
 * Represents a user in PetSwipe.
 */
export interface AppUser {
  id: string;
  email: string;
  name?: string;
  dob?: string;
  bio?: string;
  avatarUrl?: string | null;
  matches: Match[];
  swipes: Swipe[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents an adoptable pet.
 */
export interface Pet {
  id: string;
  name: string;
  type: string;
  ageMonths?: number;
  approxBreed?: string;
  adoptableStatus?: string;
  description?: string;
  photoUrl?: string;
  shelterName: string;
  shelterContact?: string;
  shelterAddress?: string;
  matches: Match[];
  swipes: Swipe[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a pet in a personalized deck with scoring.
 */
export interface DeckItem {
  id: string;
  name: string;
  type: string;
  ageMonths?: number;
  breed?: string;
  photoUrl?: string;
  shelterName?: string;
  shelterContact?: string;
  shelterAddress?: string;
  description?: string;
  score: number;
  rank: number;
  createdAt: string;
}

/**
 * Response from the personalized deck API.
 */
export interface DeckResponse {
  items: DeckItem[];
  meta: {
    limit: number;
    generatedAt: string;
    strategy: string;
    totalCandidates?: number;
    cacheHit?: boolean;
  };
}

/**
 * A "match" is when the system assigns a pet into a user's deck.
 */
export interface Match {
  id: string;
  user: AppUser;
  pet: Pet;
  matchedAt: string;
}

/**
 * A "swipe" is when a user likes or dislikes a pet.
 */
export interface Swipe {
  id: string;
  user: AppUser;
  pet: Pet;
  liked: boolean;
  swipedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Helper: persist JWT to mitigate Safari cookie issues                       */
/* -------------------------------------------------------------------------- */
const TOKEN_KEY = "jwt";

/** Safely read the JWT from localStorage (no SSR breakage). */
const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

/** Persist (or clear) the JWT in localStorage. */
const setToken = (token?: string | null) => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

/** Inject JWT on every request if we have one. */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    // Back‑end expects a Bearer token
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Update stored JWT if the back‑end sends a fresh one. */
api.interceptors.response.use((response) => {
  // 1️⃣ look for `Authorization: Bearer <token>` header
  const authHeader = response.headers["authorization"] as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    setToken(authHeader.split(" ")[1]);
  }

  // 2️⃣ or look for `token` field in the response body (common on login / signup)
  const maybeToken = (response.data as any)?.token;
  if (typeof maybeToken === "string" && maybeToken.length > 0) {
    setToken(maybeToken);
  }

  return response;
});

/* -------------------------------------------------------------------------- */
/* Auth API                                                                   */
/* -------------------------------------------------------------------------- */
export const authApi = {
  /**
   * Create a new user account and sign them in.
   * @param data.email user's email
   * @param data.password user's password
   * @param data.name optional full name
   * @param data.dob optional date of birth
   * @param data.bio optional biography
   * @returns the created user
   */
  signup: async (data: {
    email: string;
    password: string;
    name?: string;
    dob?: string;
    bio?: string;
  }): Promise<{ user: AppUser }> => {
    const res = await api.post("/auth/signup", data);
    const token = (res.data as any).token;
    if (token) setToken(token);
    return res.data;
  },

  /**
   * Log in an existing user.
   * @param data.email user's email
   * @param data.password user's password
   * @returns the authenticated user
   */
  login: async (data: {
    email: string;
    password: string;
  }): Promise<{ user: AppUser }> => {
    const res = await api.post("/auth/login", data);
    const token = (res.data as any).token;
    if (token) setToken(token);
    return res.data;
  },

  /**
   * Log out the current user.
   */
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    setToken(null);
  },

  /**
   * Check if an email is already registered.
   * @param email email address to verify
   * @returns a message indicating existence
   */
  verifyEmail: async (email: string): Promise<{ message: string }> => {
    const res = await api.post("/auth/verify-email", { email });
    return res.data;
  },

  /**
   * Reset a user's password.
   * @param email user's email
   * @param newPassword new password to set
   * @returns a confirmation message
   */
  resetPassword: async (
    email: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    const res = await api.post("/auth/reset-password", { email, newPassword });
    return res.data;
  },
};

/* -------------------------------------------------------------------------- */
/* User API                                                                   */
/* -------------------------------------------------------------------------- */
export const userApi = {
  /**
   * Fetch the current user's profile.
   * @returns the authenticated user's data
   */
  getProfile: async (): Promise<{ user: AppUser }> => {
    const res = await api.get("/users/me");
    return res.data;
  },

  /**
   * Update the current user's profile.
   * @param data fields to update
   * @returns the updated user
   */
  updateProfile: async (data: {
    name?: string;
    dob?: string;
    bio?: string;
  }): Promise<{ user: AppUser }> => {
    const res = await api.put("/users/me", data);
    return res.data;
  },

  /**
   * Upload or replace the current user's avatar.
   * @param file image file to upload
   * @returns the new avatar URL
   */
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await api.post("/users/me/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Remove the current user's avatar (reset to default).
   * @returns avatarUrl null
   */
  deleteAvatar: async (): Promise<{ avatarUrl: null }> => {
    const res = await api.delete("/users/me/avatar");
    return res.data;
  },
};

/* -------------------------------------------------------------------------- */
/* Pet API                                                                    */
/* -------------------------------------------------------------------------- */
export const petApi = {
  /**
   * Upload a CSV to batch-create pets.
   * @param file CSV file (headers: name,breed,description)
   * @returns number of pets created
   */
  uploadPets: async (file: File): Promise<{ imported: number }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/pets/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getById: async (id: string): Promise<Pet> => {
    const res = await api.get<Pet>(`/pets/${id}`);
    return res.data;
  },

  /**
   * Get a personalized, diverse deck of pets using the relevance engine.
   * @param limit number of pets to return (1-100, default 30)
   * @param petType optional filter by pet type ("Dog", "Cat", etc.)
   * @param minAge optional minimum age in months
   * @param maxAge optional maximum age in months
   * @returns personalized deck with scored and ranked pets
   */
  getDeck: async (params?: {
    limit?: number;
    petType?: string;
    minAge?: number;
    maxAge?: number;
  }): Promise<DeckResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.petType) searchParams.set("petType", params.petType);
    if (params?.minAge) searchParams.set("minAge", params.minAge.toString());
    if (params?.maxAge) searchParams.set("maxAge", params.maxAge.toString());
    
    const query = searchParams.toString();
    const url = query ? `/pets/deck?${query}` : "/pets/deck";
    const res = await api.get<DeckResponse>(url);
    return res.data;
  },

  /**
   * List all pets (legacy endpoint).
   * @returns an array of Pet objects
   */
  listPets: async (): Promise<Pet[]> => {
    const res = await api.get<Pet[]>("/pets");
    return res.data;
  },

  /**
   * Export all pets as a CSV file.
   * @returns binary blob of CSV
   */
  exportPets: async (): Promise<Blob> => {
    const res = await api.get("/pets/export", { responseType: "blob" });
    return res.data;
  },

  /**
   * Upload or replace a photo for a single pet.
   * @param petId the pet's UUID
   * @param file image file to upload
   * @returns the new photoUrl
   */
  uploadPetPhoto: async (
    petId: string,
    file: File,
  ): Promise<{ photoUrl: string }> => {
    const fd = new FormData();
    fd.append("photo", file);
    const res = await api.post(`/pets/${petId}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Add a new pet for adoption.
   * @param data.name Pet's name
   * @param data.type Pet's type or breed (e.g. "Labrador")
   * @param data.description optional notes
   * @returns the created Pet
   */
  createPet: async (data: {
    name: string;
    type: string;
    description?: string;
    shelterName: string;
    shelterContact?: string;
    shelterAddress?: string;
  }): Promise<{ pet: Pet }> => {
    const res = await api.post<{ pet: Pet }>("/pets", data);
    return res.data;
  },
};

/* -------------------------------------------------------------------------- */
/* Match API                                                                  */
/* -------------------------------------------------------------------------- */
export const matchApi = {
  /**
   * Manually assign specific pets to a user.
   * @param userId target user's UUID
   * @param petIds array of pet UUIDs
   * @returns number of matches created
   */
  assignPets: async (
    userId: string,
    petIds: string[],
  ): Promise<{ assigned: number }> => {
    const res = await api.post("/matches", { userId, petIds });
    return res.data;
  },

  /**
   * List all matches (admin only).
   * @returns array of Match objects
   */
  listMatches: async (): Promise<Match[]> => {
    const res = await api.get<Match[]>("/matches");
    return res.data;
  },

  /**
   * List matches for the authenticated user.
   * @returns array of Match objects
   */
  listMyMatches: async (): Promise<Match[]> => {
    const res = await api.get<Match[]>("/matches/me");
    return res.data;
  },
};

/* -------------------------------------------------------------------------- */
/* Swipe API                                                                  */
/* -------------------------------------------------------------------------- */
export const swipeApi = {
  /**
   * Record a user's like or dislike on a pet.
   * @param petId the pet's UUID
   * @param liked true = like/adopt, false = pass
   * @returns the created Swipe
   */
  recordSwipe: async (petId: string, liked: boolean): Promise<Swipe> => {
    const res = await api.post<Swipe>("/swipes", { petId, liked });
    return res.data;
  },

  /**
   * List all swipes by the authenticated user.
   * @returns array of Swipe objects
   */
  listMySwipes: async (): Promise<Swipe[]> => {
    const res = await api.get<Swipe[]>("/swipes/me");
    return res.data;
  },

  /**
   * List only the pets the user has liked (adopted).
   * @returns array of Swipe objects where liked === true
   */
  listMyLikedSwipes: async (): Promise<Swipe[]> => {
    const res = await api.get<Swipe[]>("/swipes/me/liked");
    return res.data;
  },

  /**
   * (Admin) List all swipes in the system.
   * @returns array of all Swipe objects
   */
  listAllSwipes: async (): Promise<Swipe[]> => {
    const res = await api.get<Swipe[]>("/swipes");
    return res.data;
  },
};

export default api;
