"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useToken } from "../../contexts/TokenContext";
import HeroImageScroller from "@/components/HeroImageScroller";
import ErrorPage from "./error";

export default function Home() {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const { fetchToken, token } = useToken();

  console.log(`USER: ${user?.name}`);

  //if (isLoading) return <div>Loading...</div>;
  if (error) return <ErrorPage message="Failed to load home page"/>;

  const handleFetchToken = async () => {
    await fetchToken();
  };

  const isProfileIncomplete = !user?.email_verified;
  if (user && !token) {
    console.log("User is logged in:", user);
    handleFetchToken();
  }

  return (
    <div className="min-h-screen bg-white text-black">
      
      <HeroImageScroller />

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
    </div>
  );
}
