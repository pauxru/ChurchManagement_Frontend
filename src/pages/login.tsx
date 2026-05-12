import { signIn } from "next-auth/react";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Sign in</h1>
        <button
          onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
          className="bg-red-700 text-white px-6 py-3 rounded shadow hover:bg-red-600"
        >
          Continue with Microsoft
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
