"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Home() {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  
  console.log(`USER: ${user?.name}`);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  const handleProfileClick = () => {
    router.push('/profile/editProfile');
  };
  const handleLogout = () => {
    router.push("/api/auth/logout");
  };
  const handleLogin = () => {
    router.push("/api/auth/login");
  };

  const isProfileIncomplete = !user?.email_verified;

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="bg-red-700 text-white shadow">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Church Management</h1>
          <ul className="flex space-x-6 items-center">
            <li>
              <a href="#about" className="hover:underline">About</a>
            </li>
            <li>
              <a href="#features" className="hover:underline">Features</a>
            </li>
            <li>
            <span onClick={() => router.push("/transfers")} className="hover:underline cursor-pointer">Transfers</span>
            </li>
            <li>
              <span onClick={() => router.push("/localChurches/searchLocalChurch")} className="hover:underline cursor-pointer">Churches</span>
            </li>
            <li>
              <span onClick={() => router.push("/members/searchMembers")} className="hover:underline cursor-pointer">Members</span>
            </li>

            {user ? (
              <>
                <li className="flex items-center space-x-2 cursor-pointer" onClick={handleProfileClick}>
                  <Image
                    src={"/images/members.svg"}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span>{user.name}</span>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="bg-white text-red-700 font-semibold py-2 px-4 rounded hover:bg-gray-200"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <span
                  onClick={handleLogin}//() => router.push("src/app/api/auth/custom-login")
                  className="hover:underline cursor-pointer"
                >
                  Login
                </span>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* Profile Completion Section (Shown Only if Profile is Incomplete) */}
      {isProfileIncomplete && (
        <div className="bg-yellow-100 text-yellow-900 p-4 text-center">
          <p className="font-semibold">
            Your profile is incomplete. Please complete your details.
          </p>
          <button
            onClick={handleProfileClick}
            className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-500"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Hero Section */}
      <header className="bg-red-600 text-white">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-extrabold">Welcome to Our Church App</h2>
          <p className="mt-4 text-lg">Empowering churches with tools for better management and engagement.</p>
          <a href="#features" className="mt-6 inline-block bg-yellow-500 text-black font-semibold px-6 py-3 rounded shadow hover:bg-yellow-400">Explore Features</a>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-purple-700">About Our App</h3>
          <p className="mt-4 text-gray-600">Our app is designed to streamline church management, enabling you to oversee events, members, clergy, and communications efficiently.</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <h3 className="text-2xl font-bold text-center text-red-700">Main Features</h3>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[{
              image: "/images/map.svg",
              title: "Church Locations",
              text: "Explore and locate churches on an interactive map.",
              border: "border-purple-700",
            },
            {
              image: "/images/clergy.svg",
              title: "Clergy Management",
              text: "Oversee and manage clergy teams at all levels.",
              border: "border-yellow-500",
            },
            {
              image: "/images/events.svg",
              title: "Event Planning",
              text: "Schedule and manage events across your organization.",
              border: "border-black",
            }].map((feature, index) => (
              <div key={index} className={`bg-white rounded-lg shadow p-6 text-center border-l-4 ${feature.border}`}>
                <Image src={feature.image} alt={feature.title} width={100} height={100} />
                <h4 className="mt-4 font-bold">{feature.title}</h4>
                <p className="text-gray-600 mt-2">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-red-700 text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold">Contact Us</h3>
          <p className="mt-4">Have questions? Reach out to us at <a href="mailto:info@churchapp.com" className="underline">info@churchapp.com</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 Church Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}