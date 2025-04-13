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
<section id="about" className="relative pt-32 pb-12 bg-white overflow-visible">
  {/* Floating Featured Card */}
  <div className="absolute -top-20 right-6 md:right-16 w-11/12 md:w-[30%] h-[460px] bg-red-500 text-white shadow-2xl rounded-3xl p-8 z-20 flex flex-col justify-center">
    <h4 className="text-3xl font-bold mb-4">You're Welcome Here</h4>
    <p className="text-base">
      Whether you're new or returning, our app is built with love to help you grow your faith, connect with community, and deepen your walk with God.
    </p>
  </div>

  {/* Main Content */}
  <div className="container mx-auto px-6 text-center relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:mr-[32%]">
      {/* Worship Card */}
      <div className="bg-gray-100 shadow-md rounded-2xl p-6 text-left">
        <h4 className="text-2xl font-semibold text-purple-800 mb-2">Worship</h4>
        <p className="text-indigo-500 font-medium mb-2">Experience His Presence</p>
        <p className="text-gray-700">Join services, follow sermon schedules, and stay spiritually connected through our seamless worship coordination tools.</p>
      </div>

      {/* Connect Card */}
      <div className="bg-gray-100 shadow-md rounded-2xl p-6 text-left">
        <h4 className="text-2xl font-semibold text-purple-800 mb-2">Connect</h4>
        <p className="text-green-600 font-medium mb-2">Grow Together</p>
        <p className="text-gray-700">Build stronger relationships by engaging with your church community through events, messages, and group activities.</p>
      </div>

      {/* God's Love Card */}
      <div className="bg-gray-100 shadow-md rounded-2xl p-6 text-left">
        <h4 className="text-2xl font-semibold text-purple-800 mb-2">God's Love</h4>
        <p className="text-red-500 font-medium mb-2">Grace Abounds</p>
        <p className="text-gray-700">Experience God’s love in action with every feature — from prayer tracking to sharing testimonies and spiritual growth journeys.</p>
      </div>
    </div>
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
