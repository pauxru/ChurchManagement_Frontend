"use client";

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Profile() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  if (!user) {
    router.push('/');
    return null;
  }

  const namespace = 'https://your-namespace.com/';
  const role = user[`${namespace}role`] as string | undefined;
  const preferredLanguage = user[`${namespace}preferred_language`] as string | undefined;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-extrabold">User Profile</h2>
        <div className="mt-4">
          <Image
            src={user.picture || '/default-profile.png'}
            alt={user.name || 'User'}
            width={100}
            height={100}
            className="rounded-full mx-auto"
          />
          <h3 className="mt-4 text-2xl">{user.name}</h3>
          <p className="mt-2 text-gray-600">Email: {user.email}</p>
          {role && <p className="mt-2 text-gray-600">Role: {role}</p>}
          {preferredLanguage && <p className="mt-2 text-gray-600">Preferred Language: {preferredLanguage}</p>}
          <button
            onClick={() => router.push("/api/auth/logout")}
            className="mt-6 inline-block bg-red-500 text-white font-semibold px-6 py-3 rounded shadow hover:bg-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}