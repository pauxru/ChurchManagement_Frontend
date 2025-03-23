import { useState, useEffect } from "react";
import styles from "../../styles/Transfers.module.css";
import { BASE_ENDPOINT } from "../../public/contants/global-variables";
import { getAccessToken } from "./api/get-access-token";

// Define TypeScript Interfaces
interface Clergy {
  name: string;
  rank: string;
  hereSince: string;
  homeChurch: string;
}

interface Parish {
  parishName: string;
  parishID: number;
  parish_Clergy: Clergy[];
}

interface LocalChurch {
  lcName: string;
  lcid: number;
  lC_Parish_Name: string;
  lC_Clergy: Clergy[];
}

interface Diocese {
  dioceseName: string;
  bishopName: string;
  parishData: Parish[];
  lC_Data: LocalChurch[];
}

const DiocesePage = () => {
  const [diocese, setDiocese] = useState<Diocese | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDioceseData();
  }, []);

  const fetchDioceseData = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${BASE_ENDPOINT}/Clergy/transfers/diocese/1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data. Status: ${response.status}`);
      }else{
        console.log("RESPONSE DATA: ",response)
      }

      const data: Diocese = await response.json();
      console.log("RESPONSE DATA: ",data)
      setDiocese(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading diocese data...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!diocese) return <p>No data available</p>;

  return (
    <div className={styles.container}>
      {/* Diocese Information */}
      <div className={styles.dioceseHeader}>
        <h1>{diocese.dioceseName}</h1>
        <h2>Bishop: {diocese.bishopName}</h2>
      </div>

      {/* Parishes Section */}
      <div className={styles.section}>
        <h2>Parishes</h2>
        {(diocese.parishData || []).map((parish) => (
            <div key={parish.parishID} className={styles.entry}>
            <h3>{parish.parishName}</h3>
            <div className={styles.clergyContainer}>
                {parish.parish_Clergy?.length > 0 ? (
                parish.parish_Clergy.map((clergy, index) => (
                    <div key={index} className={styles.clergyCard}>
                    <p><strong>Name:</strong> {clergy.name}</p>
                    <p><strong>Rank:</strong> {clergy.rank}</p>
                    <p><strong>Here Since:</strong> {clergy.hereSince}</p>
                    <p><strong>Home Church:</strong> {clergy.homeChurch}</p>
                    </div>
                ))
                ) : (
                <p>No clergy assigned</p>
                )}
            </div>
            </div>
        ))}
        </div>

        <div className={styles.section}>
        <h2>Local Churches</h2>
        {(diocese.lC_Data || []).map((church) => (
            <div key={church.lcid} className={styles.entry}>
                <h3>
                    {church.lcName}
                    <span className={styles.parishName}>{church.lC_Parish_Name}</span>
                </h3>
                <div className={styles.clergyContainer}>
                    {church.lC_Clergy?.length > 0 ? (
                        church.lC_Clergy.map((clergy, index) => (
                            <div key={index} className={styles.clergyCard}>
                                <p><strong>Name:</strong> {clergy.name}</p>
                                <p><strong>Rank:</strong> {clergy.rank}</p>
                                <p><strong>Here Since:</strong> {clergy.hereSince}</p>
                                <p><strong>Home Church:</strong> {clergy.homeChurch}</p>
                            </div>
                        ))
                    ) : (
                        <p>No clergy assigned</p>
                    )}
                </div>
            </div>
        ))}
    </div>

    </div>
  );
};

export default DiocesePage;
