import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-600 mb-6">That page doesn&apos;t exist.</p>
        <Link href="/" className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600">
          Back home
        </Link>
      </div>
    </div>
  );
}
