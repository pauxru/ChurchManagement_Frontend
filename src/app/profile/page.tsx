"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { UserProfile } from "../../../types/interfaces";
import { BASE_ENDPOINT } from "../../../public/contants/global-variables";
import ErrorPage from "../error";
import GlobalLoading from "../loading";
import { Suspense } from "react";

export default function Profile() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  // Fetch profile after auth
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${BASE_ENDPOINT}/Profile/get-profile/${user.org_id}`);
        if (!response.ok) throw new Error("Profile not found");

        const profileData: UserProfile = await response.json();
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  // Now safe to do conditional rendering
  if (isLoading) return <GlobalLoading />;
  if (error) return <ErrorPage message={error.message} />;
  if (!user) return <ErrorPage message="No user is available" />;

  return (
    <Suspense fallback={<GlobalLoading />}>
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-extrabold">User Profile</h2>
          <div className="mt-4">
            <Image
              src={user.picture || "/default-profile.png"}
              alt={user.name || "User"}
              width={100}
              height={100}
              className="rounded-full mx-auto"
            />
            <h3 className="mt-4 text-2xl">{user.name}</h3>
            <p className="mt-2 text-gray-600">Email: {user.email}</p>
            {profile && (
              <>
                <p className="mt-2 text-gray-600">Role: {profile.memberRole}</p>
                <p className="mt-2 text-gray-600">Age: {profile.memberAge}</p>
                <p className="mt-2 text-gray-600">Phone: {profile.memberPhoneNum}</p>
                <p className="mt-2 text-gray-600">Member Since: {profile.memberSince}</p>
                <p className="mt-2 text-gray-600">Alias: {profile.alias}</p>
              </>
            )}
            <button
              onClick={() => router.push("/api/auth/logout")}
              className="mt-6 inline-block bg-red-500 text-white font-semibold px-6 py-3 rounded shadow hover:bg-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
