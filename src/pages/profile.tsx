"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return <div>Loading...</div>;

  if (!session?.user) {
    router.push("/");
    return null;
  }

  const { user } = session;
  const role = user.roles?.[0];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-extrabold">User Profile</h2>
        <div className="mt-4">
          <Image
            src={user.image ?? "/default-profile.png"}
            alt={user.name ?? "User"}
            width={100}
            height={100}
            className="rounded-full mx-auto"
          />
          <h3 className="mt-4 text-2xl">{user.name}</h3>
          <p className="mt-2 text-gray-600">Email: {user.email}</p>
          {role && <p className="mt-2 text-gray-600">Role: {role}</p>}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-6 inline-block bg-red-500 text-white font-semibold px-6 py-3 rounded shadow hover:bg-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
