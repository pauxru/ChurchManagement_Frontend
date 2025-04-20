"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Logo() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/")}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <Image
        src="/images/aipca_logo.png" // Replace with your actual logo path
        alt="Church Logo"
        width={40}
        height={40}
        style={{
            borderRadius: "50%", // 👈 this makes it round
            objectFit: "cover",
          }}
      />
    </div>
  );
}
