"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useToken } from "../../contexts/TokenContext";
import { useEffect, useRef, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const { fetchToken, token } = useToken();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = () => {
    router.push('/profile/editProfile');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    router.push("/api/auth/logout");
    setDropdownOpen(false);
  };

  const handleLogin = () => router.push("/api/auth/login");

  const isProfileIncomplete = !user?.email_verified;
  if (user && !token) {
    fetchToken();
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="bg-red-700 text-white shadow relative z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center relative">
          <h1 className="text-xl font-bold">A.I.P.C.A Church Management</h1>
          <ul className="flex space-x-6 items-center">
            <li><a href="#about" className="hover:underline">About</a></li>
            <li><a href="#features" className="hover:underline">Features</a></li>
            <li><span onClick={() => router.push("/transfers")} className="hover:underline cursor-pointer">Transfers</span></li>
            <li><span onClick={() => router.push("/localChurches/searchLocalChurch")} className="hover:underline cursor-pointer">Churches</span></li>
            <li><span onClick={() => router.push("/members/searchMembers")} className="hover:underline cursor-pointer">Members</span></li>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => setDropdownOpen(prev => !prev)}
                >
                  <Image
                    src={"/images/members.svg"}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span>{user.name}</span>
                </div>

                {/* Dropdown overlays absolutely without pushing layout */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black shadow-lg rounded-lg py-2 z-50">
                    <button
                      onClick={handleProfileClick}
                      className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => router.push("/settings")}
                      className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <li>
                <span onClick={handleLogin} className="hover:underline cursor-pointer">Login</span>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {isProfileIncomplete && (
        <div className="bg-yellow-100 text-yellow-900 p-4 text-center">
          <p className="font-semibold">Your profile is incomplete. Please complete your details.</p>
          <button onClick={handleProfileClick} className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-500">
            Complete Profile
          </button>
        </div>
      )}
    </>
  );
}
