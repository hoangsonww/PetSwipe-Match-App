"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import {
  BarChart3,
  ClipboardList,
  Menu,
  PawPrint,
  Plus,
  Sun,
  Moon,
  Laptop,
  Upload,
  MapPin,
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
  const iconButtonClass =
    "rounded-full p-2 text-[#234851] hover:bg-[#EDF6F3] dark:text-gray-100 dark:hover:bg-gray-800";
  const desktopLinkButtonClass =
    "rounded-full border border-[#d6e5e1] px-4 py-2 text-sm font-semibold text-[#234851] transition hover:bg-[#EDF6F3] dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800";
  const mobileMenuActionClass =
    "flex w-full items-center justify-start rounded-2xl px-3 py-3 text-sm font-medium text-[#234851] hover:bg-[#EDF6F3] dark:text-gray-100 dark:hover:bg-gray-700";

  return (
    <TooltipProvider delayDuration={120}>
      <nav className="border-b border-black/5 bg-white/90 px-4 py-3 shadow-md backdrop-blur dark:border-white/10 dark:bg-gray-900/90">
        <div className="hidden items-center justify-between gap-4 md:flex">
          <Link href="/home" legacyBehavior>
            <a className="flex items-center gap-3">
              <PawPrint className="h-8 w-8 text-[#7097A8]" />
              <div>
                <div className="text-2xl font-extrabold text-[#234851] dark:text-gray-100">
                  PetSwipe
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#7097A8] dark:text-gray-400">
                  Discover and adopt
                </div>
              </div>
            </a>
          </Link>

          <div className="ml-auto flex items-center space-x-4 whitespace-nowrap">
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={iconButtonClass}
                    aria-label="Continue Swiping"
                    onClick={() => router.push("/home")}
                  >
                    <PawPrint className="h-5 w-5" />
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
                  <p className="text-sm font-semibold">Find Pets</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Map button with high-contrast tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={iconButtonClass}
                  aria-label="Open map"
                  onClick={() => router.push("/map")}
                >
                  <MapPin className="h-5 w-5" />
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

            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={iconButtonClass}
                    aria-label="Open insights"
                    onClick={() => router.push("/insights")}
                  >
                    <BarChart3 className="h-5 w-5" />
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
                  <p className="text-sm font-semibold">Preference insights</p>
                </TooltipContent>
              </Tooltip>
            )}

            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={iconButtonClass}
                    aria-label="Open adoption planner"
                    onClick={() => router.push("/adoption-planner")}
                  >
                    <ClipboardList className="h-5 w-5" />
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
                  <p className="text-sm font-semibold">Adoption planner</p>
                </TooltipContent>
              </Tooltip>
            )}

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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!user && (
              <div className="flex items-center gap-2">
                <Link href="/login" legacyBehavior>
                  <a className={desktopLinkButtonClass}>Login</a>
                </Link>
                <Link href="/signup" legacyBehavior>
                  <a className={desktopLinkButtonClass}>Register</a>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/home" legacyBehavior>
            <a className="min-w-0 flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EDF6F3] dark:bg-gray-800">
                <PawPrint className="h-5 w-5 text-[#7097A8]" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold text-[#234851] dark:text-gray-100">
                  PetSwipe
                </div>
                <div className="truncate text-xs uppercase tracking-[0.18em] text-[#7097A8] dark:text-gray-400">
                  Discover and adopt
                </div>
              </div>
            </a>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              className={iconButtonClass}
              aria-label="Open map"
              onClick={() => router.push("/map")}
            >
              <MapPin className="h-5 w-5" />
            </Button>

            <ModeToggle />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-2xl border border-[#d6e5e1] bg-white px-3 py-2 text-[#234851] shadow-sm hover:bg-[#EDF6F3] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={10}
                className="w-[min(22rem,calc(100vw-1.5rem))] rounded-3xl border border-[#d6e5e1] bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-white"
              >
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-[#F6FBF9] p-3 dark:bg-gray-800">
                      <Avatar className="h-11 w-11 ring-2 ring-[#7097A8]">
                        <AvatarImage
                          src={user.avatarUrl || "/OIP.jpg"}
                          alt="Profile"
                        />
                        <AvatarFallback className="text-[#234851] dark:text-gray-100">
                          {user.name?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#234851] dark:text-white">
                          {user.name || "Your account"}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/home")}
                      >
                        Home
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/profile")}
                      >
                        Profile
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/my-pets")}
                      >
                        My Pets
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/insights")}
                      >
                        Insights
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/adoption-planner")}
                      >
                        Planner
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/addPet")}
                      >
                        Add Pet
                      </Button>
                      <Button
                        variant="ghost"
                        className={mobileMenuActionClass}
                        onClick={() => router.push("/bulk-upload")}
                      >
                        Bulk Upload
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="flex w-full items-center justify-start rounded-2xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={() => logout()}
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link href="/login" legacyBehavior>
                      <a className="block">
                        <Button
                          variant="ghost"
                          className={mobileMenuActionClass}
                        >
                          Login
                        </Button>
                      </a>
                    </Link>
                    <Link href="/signup" legacyBehavior>
                      <a className="block">
                        <Button
                          variant="ghost"
                          className={mobileMenuActionClass}
                        >
                          Register
                        </Button>
                      </a>
                    </Link>
                    <Link href="/reset-password" legacyBehavior>
                      <a className="block">
                        <Button
                          variant="ghost"
                          className={mobileMenuActionClass}
                        >
                          Reset Password
                        </Button>
                      </a>
                    </Link>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
