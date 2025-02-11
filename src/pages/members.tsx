import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import "../app/globals.css";
import { CHURCH_NAME, BASE_ENDPOINT } from "../../public/contants/global-variables";
import axios from "axios";
import { getAccessToken } from "../pages/api/get-access-token";

interface Option {
  id: number;
  name: string;
}

interface DioceseResponse {
  dioceseId: number;
  dioceseName: string;
}

interface ParishResponse {
  parishId: number;
  parishName: string;
}

interface LocalChurchResponse {
  localChurchId: number;
  localChurchName: string;
}

const MembersPage: React.FC = () => {
  const [diocese, setDiocese] = useState<string>("");
  const [parish, setParish] = useState<string>("");
  const [localChurch, setLocalChurch] = useState<string>("");
  const [dioceseOptions, setDioceseOptions] = useState<Option[]>([]);
  const [parishOptions, setParishOptions] = useState<Option[]>([]);
  const [localChurchOptions, setLocalChurchOptions] = useState<Option[]>([]);
  const { user, isLoading } = useUser();

  useEffect(() => {
    const fetchDioceseOptions = async () => {
      try {
        const response = await axios.get<DioceseResponse[]>(`${BASE_ENDPOINT}/Churches/diocese`, {
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
          },
        });
        setDioceseOptions(
          response.data.map((diocese) => ({ id: diocese.dioceseId, name: diocese.dioceseName }))
        );
      } catch {
        console.error("Failed to fetch diocese options.");
      }
    };

    fetchDioceseOptions();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view this page.</div>;

  const handleDioceseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDiocese = e.target.value;
    setDiocese(selectedDiocese);
    setParish("");
    setLocalChurch("");
    setParishOptions([]);
    setLocalChurchOptions([]);

    if (selectedDiocese) {
      try {
        const response = await axios.get<ParishResponse[]>(`${BASE_ENDPOINT}/Churches/diocese-parishes/${selectedDiocese}`, {
          headers: { Authorization: `Bearer ${await getAccessToken()}` },
        });
        setParishOptions(response.data.map((parish) => ({ id: parish.parishId, name: parish.parishName })));
      } catch {
        console.error("Failed to fetch parish options.");
      }
    }
  };

  const handleParishChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedParish = e.target.value;
    setParish(selectedParish);
    setLocalChurch("");
    setLocalChurchOptions([]);

    if (selectedParish) {
      try {
        const response = await axios.get<LocalChurchResponse[]>(`${BASE_ENDPOINT}/Churches/parish/${selectedParish}`, {
          headers: { Authorization: `Bearer ${await getAccessToken()}` },
        });
        setLocalChurchOptions(response.data.map((localChurch) => ({ id: localChurch.localChurchId, name: localChurch.localChurchName })));
      } catch {
        console.error("Failed to fetch local church options.");
      }
    }
  };

  return (
    <div>
      <h1>{CHURCH_NAME} Church Members</h1>
      <select value={diocese} onChange={handleDioceseChange}>
        <option value="">Select Diocese</option>
        {dioceseOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      <select value={parish} onChange={handleParishChange} disabled={!diocese}>
        <option value="">Select Parish</option>
        {parishOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      <select value={localChurch} onChange={(e) => setLocalChurch(e.target.value)} disabled={!parish}>
        <option value="">Select Local Church</option>
        {localChurchOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </div>
  );
};

export default MembersPage;
