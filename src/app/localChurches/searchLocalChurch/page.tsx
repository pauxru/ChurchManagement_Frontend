'use client'
import { useEffect, useState } from "react";
import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { CHURCH_NAME, BASE_ENDPOINT } from "../../../../public/contants/global-variables";
import axios from "axios";
//import "../../globlas.css";
import { getAccessToken } from "../../api/get-access-token";
import { GetServerSideProps } from "next";


interface LocalChurch {
    localChurchId: number;
    localChurchName: string;
    localChurchDescription: string;
    localChurchLocation: string;
    localChurchClass: string;
    localChurchAddress: string;
    localChurchParishID: string;
}

interface Option {
  id: number;
  name: string;
}
interface Diocese {
  dioceseId: number;
  dioceseName: string;
}

interface Parish {
  parishId: number;
  parishName: string;
}

const LocalChurchesPage = () => {
  const { user, isLoading } = useUser();
  const [dioceseOptions, setDioceseOptions] = useState<Option[]>([]);
  const [parishOptions, setParishOptions] = useState<Option[]>([]);
  const [localChurches, setLocalChurches] = useState<LocalChurch[]>([]);
  const [selectedDiocese, setSelectedDiocese] = useState("");
  const [selectedParish, setSelectedParish] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, isLoading, router]);
  
  useEffect(() => {
    const fetchDioceses = async () => {
      try {
        console.log("Fetching dioceses...");
  
        const token = await getAccessToken();
        console.log("Access token:", token);
  
        console.log("Making request to:", `${BASE_ENDPOINT}/Churches/diocese`);
        const response = await axios.get(`${BASE_ENDPOINT}/Churches/diocese`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        console.log("Response received:", response);
        
        setDioceseOptions(response.data.map((d: Diocese) => ({ id: d.dioceseId, name: d.dioceseName })));
      } catch (err) {
        console.error("Error fetching dioceses:", err);
        router.push('/404');
        setError("Failed to fetch dioceses.");
      }
    };
  
    if (user) {
      console.log("User is available:", user);
      fetchDioceses();
    } else {
      console.log("User is not available yet.");
    }
  }, [user]);
 
  const handleDioceseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dioceseId = e.target.value;
    setSelectedDiocese(dioceseId);
    setSelectedParish("");
    setLocalChurches([]);
    setParishOptions([]);

    if (dioceseId) {
      try {
        const token = await getAccessToken();
        const response = await axios.get(`${BASE_ENDPOINT}/Churches/diocese-parishes/${dioceseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setParishOptions(response.data.map((p: Parish) => ({ id: p.parishId, name: p.parishName })));
      } catch (err) {
        router.push('/404');
        setError("Failed to fetch parishes.");
        console.error(err);
      }
    }
  };

  const handleParishChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parishId = e.target.value;
    setSelectedParish(parishId);
    setLocalChurches([]);

    if (parishId) {
      try {
        setLoading(true);
        const token = await getAccessToken();
        const response = await axios.get(`${BASE_ENDPOINT}/Churches/parish/${parishId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLocalChurches(response.data);
      } catch (err) {
        setError("Failed to fetch local churches.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNavigateToDetails = (localChurchId: number) => {
    router.push(`/localChurches/viewLocalChurch/?LocalChurchID=${localChurchId}`);

  };

  if (isLoading || loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view this page.</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-800">
        {CHURCH_NAME} Local Churches
      </h1>

      <div className="mb-4 flex flex-wrap">
        <select
          value={selectedDiocese}
          onChange={handleDioceseChange}
          className="mr-2 p-2 border rounded"
        >
          <option value="">Select Diocese</option>
          {dioceseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <select
          value={selectedParish}
          onChange={handleParishChange}
          className="mr-2 p-2 border rounded"
          disabled={!selectedDiocese}
        >
          <option value="">Select Parish</option>
          {parishOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {localChurches.length === 0 ? (
        <p className="text-center text-lg text-gray-600">No local churches found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Location</th>
                <th className="px-6 py-3 text-left">Class</th>
                <th className="px-6 py-3 text-left">Address</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localChurches.map((church) => (
                <tr key={church.localChurchId} className="border-t hover:bg-gray-100">
                  <td className="px-6 py-3">{church.localChurchId}</td>
                  <td className="px-6 py-3">{church.localChurchName}</td>
                  <td className="px-6 py-3">{church.localChurchLocation}</td>
                  <td className="px-6 py-3">{church.localChurchClass}</td>
                  <td className="px-6 py-3">{church.localChurchAddress}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleNavigateToDetails(church.localChurchId)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


export default LocalChurchesPage;
