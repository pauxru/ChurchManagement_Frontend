"use client";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import styles from "./Transfers.module.css";
import { BASE_ENDPOINT } from "../../../public/contants/global-variables";
import { useToken } from "../../../contexts/TokenContext";
import { useRouter } from "next/navigation";
import { useUser } from '@auth0/nextjs-auth0';

import ErrorPage from "../error";
import GlobalLoading from "../loading";


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
  const { token } = useToken();
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetchDioceseData();
  }, []);

  const fetchDioceseData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_ENDPOINT}/Clergy/transfers/diocese/1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
       console.log(`Failed to fetch data. Status: ${response.status}`);
      }

      const data: Diocese = await response.json();
      setDiocese(data);
    } catch {
      console.log("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const updatedDiocese: Diocese = JSON.parse(JSON.stringify(diocese));

    // Find source and destination lists
    let sourceList, destList;
    if (source.droppableId.startsWith("parish")) {
      sourceList = updatedDiocese.parishData.find(p => `parish-${p.parishID}` === source.droppableId)?.parish_Clergy;
    } else {
      sourceList = updatedDiocese.lC_Data.find(c => `church-${c.lcid}` === source.droppableId)?.lC_Clergy;
    }

    if (destination.droppableId.startsWith("parish")) {
      destList = updatedDiocese.parishData.find(p => `parish-${p.parishID}` === destination.droppableId)?.parish_Clergy;
    } else {
      destList = updatedDiocese.lC_Data.find(c => `church-${c.lcid}` === destination.droppableId)?.lC_Clergy;
    }

    if (!sourceList || !destList) return;

    // Remove from source
    const [movedClergy] = sourceList.splice(source.index, 1);
    // Add to destination
    destList.splice(destination.index, 0, movedClergy);

    setDiocese(updatedDiocese);
  };

  if (loading) return <GlobalLoading />;
  if (!diocese) return <ErrorPage message="Failed to load diocese data" />;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.dioceseHeader}>
          <h1>{diocese.dioceseName}</h1>
          <h2>Bishop: {diocese.bishopName}</h2>
        </div>

        {/* Parishes Section */}
        <div className={styles.section}>
          <h2>Parishes</h2>
          {diocese.parishData.map((parish) => (
            <Droppable key={parish.parishID} droppableId={`parish-${parish.parishID}`}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={styles.entry}>
                  <h3>{parish.parishName}</h3>
                  <div className={styles.clergyContainer}>
                    {parish.parish_Clergy.map((clergy, index) => (
                      <Draggable key={clergy.name} draggableId={clergy.name} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={styles.clergyCard}
                          >
                            <p><strong>Name:</strong> {clergy.name}</p>
                            <p><strong>Rank:</strong> {clergy.rank}</p>
                            <p><strong>Here Since:</strong> {clergy.hereSince}</p>
                            <p><strong>Home Church:</strong> {clergy.homeChurch}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>

        {/* Local Churches Section */}
        <div className={styles.section}>
          <h2>Local Churches</h2>
          {diocese.lC_Data.map((church) => (
            <Droppable key={church.lcid} droppableId={`church-${church.lcid}`}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={styles.entry}>
                  <h3>{church.lcName}</h3>
                  <div className={styles.clergyContainer}>
                    {church.lC_Clergy.map((clergy, index) => (
                      <Draggable key={clergy.name} draggableId={clergy.name} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={styles.clergyCard}
                          >
                            <p><strong>Name:</strong> {clergy.name}</p>
                            <p><strong>Rank:</strong> {clergy.rank}</p>
                            <p><strong>Here Since:</strong> {clergy.hereSince}</p>
                            <p><strong>Home Church:</strong> {clergy.homeChurch}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default DiocesePage;

