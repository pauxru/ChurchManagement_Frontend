"use client";

import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import styles from "./searchMembers.module.css";
import { CHURCH_NAME, BASE_ENDPOINT } from "../../../../public/contants/global-variables";
import axios from "axios";
//import { getAccessToken2 } from "../../api/get-access-token";
import { useToken } from "../../../../contexts/TokenContext";


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

interface MemberResponse {
  memberID: number;
  memberName: string;
  alias: string;
  memberLocalChurchID: string;
  isActive: boolean;
}

const MembersPage: React.FC = () => {
  const [diocese, setDiocese] = useState<string>("");
  const [parish, setParish] = useState<string>("");
  const [localChurch, setLocalChurch] = useState<string>("");
  const [dioceseOptions, setDioceseOptions] = useState<Option[]>([]);
  const [parishOptions, setParishOptions] = useState<Option[]>([]);
  const [localChurchOptions, setLocalChurchOptions] = useState<Option[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const { user, isLoading } = useUser();
  const { token } = useToken();

  useEffect(() => {
    const fetchDioceseOptions = async () => {
      try {
        console.log("Getting session");
        //token.replace(/^"|"$/g, '');
        const tkn = await fetch('/api/get-access-token');
        console.log("NEW TOKEN: ",tkn.body);
        const response = await axios.get<DioceseResponse[]>(`${BASE_ENDPOINT}/Churches/diocese`, {
          headers: { Authorization: `Bearer ${token}` },
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

  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (!user) return <div className={styles.authWarning}>Please log in to view this page.</div>;

  const handleDioceseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDiocese = e.target.value;
    setDiocese(selectedDiocese);
    setParish("");
    setLocalChurch("");
    setParishOptions([]);
    setLocalChurchOptions([]);
    setMembers([]);

    if (selectedDiocese) {
      try {
        const response = await axios.get<ParishResponse[]>(
          `${BASE_ENDPOINT}/Churches/diocese-parishes/${selectedDiocese}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
    setMembers([]);

    if (selectedParish) {
      try {
        const response = await axios.get<LocalChurchResponse[]>(
          `${BASE_ENDPOINT}/Churches/parish/${selectedParish}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLocalChurchOptions(response.data.map((localChurch) => ({ id: localChurch.localChurchId, name: localChurch.localChurchName })));
      } catch {
        console.error("Failed to fetch local church options.");
      }
    }
  };

  const fetchData = async () => {
    if (!localChurch) return;
    try {
      const response = await axios.get<MemberResponse[]>(
        `${BASE_ENDPOINT}/Members/local-church/${localChurch}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(response.data);
    } catch {
      console.error("Failed to fetch members.");
      setMembers([]);
    }
  };

  return (
    <div className={styles.container}>
      <h1>{CHURCH_NAME} Church Members</h1>

      <div className={styles.selectRow}>
      <select value={diocese} onChange={handleDioceseChange} disabled={dioceseOptions.length === 0}>
          <option value="">Select Diocese</option>
          {dioceseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <select value={parish} onChange={handleParishChange} disabled={!diocese}>
          <option value="">Select Parish</option>
          {parishOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <select value={localChurch} onChange={(e) => setLocalChurch(e.target.value)} disabled={!parish}>
          <option value="">Select Local Church</option>
          {localChurchOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <button className={styles.fetchButton} onClick={fetchData} disabled={!localChurch}>
        Fetch Members
      </button>

      {members.length > 0 && (
        <div className={styles.tableContainer}>
          <h2>Members</h2>
          <table className={styles.membersTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Alias</th>
                <th>Local Church ID</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.memberID}>
                  <td>{member.memberID}</td>
                  <td>{member.memberName}</td>
                  <td>{member.alias}</td>
                  <td>{member.memberLocalChurchID}</td>
                  <td>{member.isActive ? "No" : "Yes"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
