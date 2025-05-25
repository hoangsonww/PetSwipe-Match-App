"use client";

import Link from "next/link";
import { Menu, PawPrint, Plus, Sun, Moon, Laptop } from "lucide-react";
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
  const { setTheme, theme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative p-2 dark:text-gray-300 hover:bg-gray-100"
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
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer
               data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
        >
          <Sun className="h-4 w-4 text-yellow-500" />
          <span>Light</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setTheme("dark");
            toast.success("Theme changed to dark 🌙");
          }}
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer
               data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
        >
          <Moon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
          <span>Dark</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setTheme("system");
            toast.success("Theme changed to system 🌈");
          }}
          className="flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer
               data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
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

  return (
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

      {/* Right side (never shrinks, always right‐aligned) */}
      <div className="flex-shrink-0 ml-auto flex items-center space-x-4 whitespace-nowrap">
        {user && (
          <>
            {/* Add Pet */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/addPet" legacyBehavior>
                    <a>
                      <Button variant="ghost" className="p-2">
                        <Plus className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                      </Button>
                    </a>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <p>Add a pet</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Dark-mode toggle */}
            <ModeToggle />

            {/* Profile avatar */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile" legacyBehavior>
                    <a>
                      <Avatar className="h-10 w-10 ring-2 ring-[#7097A8]">
                        <AvatarImage
                          src={user.avatarUrl || "/OIP.jpg"}
                          alt="Profile"
                        />
                        <AvatarFallback className="text-[#234851] dark:text-gray-100">
                          {user.name?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </a>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <p>View profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {/* Hamburger menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="p-2">
              <Menu className="h-8 w-8 text-gray-600 dark:text-gray-300" />
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
                className="w-full justify-start text-destructive hover:bg-red-50 dark:hover:bg-red-900"
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
                      className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Login
                    </Button>
                  </a>
                </Link>
                <Link href="/signup" legacyBehavior>
                  <a>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Register
                    </Button>
                  </a>
                </Link>
                <Link href="/reset-password" legacyBehavior>
                  <a>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-700"
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
  );
}
