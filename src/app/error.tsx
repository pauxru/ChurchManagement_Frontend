"use client";
import Image from "next/image";

interface ErrorPageProps {
  message?: string; // Optional message prop
}

export default function ErrorPage({ message }: ErrorPageProps) {
  const defaultMessage = "Oops! Something went wrong. Please try again later."; // Default error message
  const displayMessage = message || defaultMessage; // Use custom message or fallback to default

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "1rem",
        textAlign: "center",
      }}
    >
      <Image
        src="/images/error_cross.svg" // Make sure this image is in public/images/
        alt="Error"
        width={300} // Adjust width as necessary
        height={500} // Adjust height as necessary
      />
      <h2 style={{ fontSize: "1.5rem", color: "#ff0000" }}>{displayMessage}</h2>
    </div>
  );
}
