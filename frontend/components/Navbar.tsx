"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import {
  Menu,
  PawPrint,
  Plus,
  Sun,
  Moon,
  Laptop,
  Upload,
  MapPin,
  Milestone,
  User,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export function ModeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative p-2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Sun className="absolute h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-1 dark:text-white"
      >
        <DropdownMenuItem
          onClick={() => {
            setTheme("light");
            toast.success("Theme changed to light ✨");
          }}
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700 text-sm"
        >
          <Sun className="h-4 w-4 text-yellow-500" />
          <span>Light</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setTheme("dark");
            toast.success("Theme changed to dark 🌙");
          }}
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700 text-sm"
        >
          <Moon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
          <span>Dark</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setTheme("system");
            toast.success("Theme changed to system 🌈");
          }}
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700 text-sm"
        >
          <Laptop className="h-4 w-4 text-blue-500" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { user, logout } = useUser();
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={120}>
      <nav className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-900 px-4 py-4 shadow-md">
        {/* Logo / Brand */}
        <Link href="/home" legacyBehavior>
          <a className="flex-shrink-0 flex items-center space-x-2">
            <PawPrint className="h-8 w-8 text-[#7097A8]" />
            <span className="text-2xl font-extrabold text-[#234851] dark:text-gray-100">
              PetSwipe
            </span>
          </a>
        </Link>

        {/* Right side */}
        <div className="flex-shrink-0 ml-auto flex items-center space-x-4 whitespace-nowrap">
          {/* Map button with high-contrast tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="p-2"
                aria-label="Open map"
                onClick={() => router.push("/map")}
              >
                <MapPin className="h-8 w-8 text-gray-700 dark:text-gray-200" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              sideOffset={8}
              className="
                z-[100]
                rounded-md
                px-3 py-2
                shadow-xl
                border
                bg-[#234851] text-white
                border-white/10
                dark:bg-white dark:text-[#0f172a] dark:border-gray-200
              "
            >
              <p className="text-sm font-semibold">Open map</p>
            </TooltipContent>
          </Tooltip>

          {/* Add (dropdown) — only when logged in */}
          {user && (
            <DropdownMenu>
              {/* ⬇️ Tooltip added for the Add button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-2" aria-label="Add">
                      <Plus className="h-8 w-8 text-gray-700 dark:text-gray-200" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  sideOffset={8}
                  className="
                    z-[100]
                    rounded-md
                    px-3 py-2
                    shadow-xl
                    border
                    bg-[#234851] text-white
                    border-white/10
                    dark:bg-white dark:text-[#0f172a] dark:border-gray-200
                  "
                >
                  <p className="text-sm font-semibold">Add pets</p>
                </TooltipContent>
              </Tooltip>

              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-1 dark:text-white min-w-[200px]"
              >
                {/* Option 1 */}
                <DropdownMenuItem
                  asChild
                  className="
                    cursor-pointer rounded-md
                    data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700
                  "
                >
                  <Link href="/addPet" legacyBehavior>
                    <a
                      className="
                        group flex items-center gap-2 px-2 py-1.5
                        text-sm leading-5
                        text-gray-800 dark:text-gray-100
                        transition-all duration-150
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-[#234851]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234851]/40 rounded-md
                      "
                    >
                      <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5" />
                      <span className="truncate">Add single pet</span>
                    </a>
                  </Link>
                </DropdownMenuItem>

                {/* Option 2 */}
                <DropdownMenuItem
                  asChild
                  className="
                    cursor-pointer rounded-md
                    data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700
                  "
                >
                  <Link href="/bulk-upload" legacyBehavior>
                    <a
                      className="
                        group flex items-center gap-2 px-2 py-1.5
                        text-sm leading-5
                        text-gray-800 dark:text-gray-100
                        transition-all duration-150
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-[#234851]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234851]/40 rounded-md
                      "
                    >
                      <Upload className="h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5" />
                      <span className="truncate">Bulk upload CSV</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Dark-mode toggle */}
          <ModeToggle />

          {/* Profile avatar (only when logged in) */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Profile menu"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234851]/40"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-[#7097A8]">
                    <AvatarImage
                      src={user.avatarUrl || "/OIP.jpg"}
                      alt="Profile"
                    />
                    <AvatarFallback className="text-[#234851] dark:text-gray-100">
                      {user.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-1 dark:text-white min-w-[200px]"
              >
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-md data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                >
                  <Link href="/profile" legacyBehavior>
                    <a
                      className="
                        group flex items-center gap-2 px-2 py-1.5
                        text-sm leading-5
                        text-gray-800 dark:text-gray-100
                        transition-all duration-150
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-[#234851]
                        rounded-md
                      "
                    >
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <span className="truncate">Profile</span>
                    </a>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-md data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                >
                  <Link href="/my-pets" legacyBehavior>
                    <a
                      className="
                        group flex items-center gap-2 px-2 py-1.5
                        text-sm leading-5
                        text-gray-800 dark:text-gray-100
                        transition-all duration-150
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-[#234851]
                        rounded-md
                      "
                    >
                      <PawPrint className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <span className="truncate">My Pets</span>
                    </a>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-md data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                >
                  <Link href="/journeys" legacyBehavior>
                    <a
                      className="
                        group flex items-center gap-2 px-2 py-1.5
                        text-sm leading-5
                        text-gray-800 dark:text-gray-100
                        transition-all duration-150
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-[#234851]
                        rounded-md
                      "
                    >
                      <Milestone className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <span className="truncate">Adoption journeys</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Hamburger menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="p-2">
                <Menu className="h-8 w-8 text-gray-700 dark:text-gray-200" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-48 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:text-white"
            >
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:bg-red-50 dark:hover:bg-red-900 text-sm"
                  onClick={() => logout()}
                >
                  Logout
                </Button>
              ) : (
                <>
                  <Link href="/login" legacyBehavior>
                    <a>
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        Login
                      </Button>
                    </a>
                  </Link>
                  <Link href="/signup" legacyBehavior>
                    <a>
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        Register
                      </Button>
                    </a>
                  </Link>
                  <Link href="/reset-password" legacyBehavior>
                    <a>
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        Reset Password
                      </Button>
                    </a>
                  </Link>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </nav>
    </TooltipProvider>
  );
}
