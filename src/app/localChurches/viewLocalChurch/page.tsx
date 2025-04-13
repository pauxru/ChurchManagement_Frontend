"use client"
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { BASE_ENDPOINT } from "../../../../public/contants/global-variables";
//import { getAccessToken2 } from "../../api/get-access-token";
import styles from "./ChurchDetailsPage.module.css";
import { Suspense } from 'react';

import { LeadershipBoard, LocalChurch, Event, Clergy, ChurchMember, Announcement } from "../../../../types/interfaces";
import {
  fetchChurchDetails,
  fetchClergyDetails,
  fetchEventDetails,
  fetchBoardDetails,
  fetchAnnouncementDetails
} from "../../api/apiService";
import { useToken } from "../../../../contexts/TokenContext";
import GlobalLoading from "@/app/loading";
import ErrorPage from "@/app/error";


const ChurchDetailsPage = () => {
  const searchParams = useSearchParams();
  const  LocalChurchID  = searchParams.get("LocalChurchID");
  const [church, setChurch] = useState<LocalChurch | null>(null);
  const [clergy, setClergy] = useState<Clergy[] | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [members, setMembers] = useState<ChurchMember[] | null>(null);
  const [leadershipBoard, setBoards] = useState<LeadershipBoard | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useToken();

  useEffect(() => {
    if (LocalChurchID) {
      fetchChurchDetails(LocalChurchID as string)
      .then(setChurch)
      .catch((err) => {
        console.error("Error fetching church details:", err);
        setError("Failed to fetch church details.");
      });
    }
  }, [LocalChurchID]);

  useEffect(() => {
    if (LocalChurchID) {
      fetchClergyDetails(LocalChurchID as string)
        .then(setClergy)
        .catch(() => setError("Failed to fetch event details."));
    }
  }, [LocalChurchID]);

  useEffect(() => {
    if (LocalChurchID) {
      fetchEventDetails(LocalChurchID as string)
        .then(setEvents)
        .catch(() => setError("Failed to fetch event details."));
    }
  }, [LocalChurchID]);

  useEffect(() => {
    if (LocalChurchID) {
      fetchBoardDetails(LocalChurchID as string)
        .then((data) => {
          console.log("Fetched Board Details: ", data);  // Verify the data fetched
          setBoards(data);  // Set fetched board data
        })
        .catch(() => setError("Failed to fetch board details."));
    }
  }, [LocalChurchID]);

  useEffect(() => {
    if (LocalChurchID) {
      fetchAnnouncementDetails(LocalChurchID as string)
        .then(setAnnouncements)
        .catch(() => setError("Failed to fetch announcement details."));
    }
  }, [LocalChurchID]);

  useEffect(() => {
    console.log("Church state updated:", church);
  }, [church]);

  const handleFetchMembers = async () => {
        try {
        if (!LocalChurchID) {
            setError("Local Church ID is not available.");
            return;
        }
    
        const response = await axios.get(
            `${BASE_ENDPOINT}/Members/local-church/${LocalChurchID}`, 
            {
            headers: { Authorization: `Bearer ${token}` },
            }
        );
        setMembers(response.data);
        setError(null); // Clear previous errors
        } catch (err) {
        setError("Failed to fetch members: " + err);
        }
    };

    const handleClergyClick = (clergyId: number) => {
      console.log("HERE at handleClergyClick:: ", clergyId);
      router.push(`/clergy-profile/?ClergyId=${clergyId}`);
    };


  // Fetch images on mount
  //   useEffect(() => {
  //     const fetchImages = async () => {
  //         try {
  //             const res = await fetch("/api/getGallery");
  //             const data = await res.json();
  //             if (res.ok) {
  //                 setGalleryImages(data.images);
  //             }
  //         } catch (error) {
  //             console.error("Error fetching images:", error);
  //         }
  //     };

  //     fetchImages();
  // }, []);

  // Auto-slide effect
  useEffect(() => {
      if (galleryImages.length === 0) return;

      const interval = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
      }, 3000); // Change every 3 seconds

      return () => clearInterval(interval);
  }, [galleryImages]);

  if (error) return <ErrorPage />;
  if (!church) return <GlobalLoading />;

  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    church.localChurchCoordinates
  )}`;

  const handleEventClick = (eventID: number) => {
    // Navigate to the detailed event page or open a modal
    console.log(`Event clicked: ${eventID}`);
    // Example: Navigate to detailed event page
    // navigate(`/event-details/${eventID}`);
  };
  

  const ranks: Record<number, string> = {
    1: "Evangelist",
    2: "Church Leader",
    3: "Deacon",
    4: "Pastor",
    5: "Archdeacon",
    6: "Bishop",
    7: "Archbishop",
  };
  
  const getClergyRankText = (rank: number): string => {
    return ranks[rank] || "Unknown Rank";
  };

  const levels: Record<number, string> = {
    1: "Local Church",
    2: "Parish",
    3: "Diocese",
    4: "ArchDiocese",
    5: "National",

  };
  
  const getLevelText = (level: number): string => {
    return levels[level] || "Unknown Rank";
  };

  const formatEventDateTime = (startDate: string, startTime: string, endDate: string, endTime: string) => {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
  
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true, // For AM/PM format
    };
  
    const formattedStartDateTime = startDateTime.toLocaleString('en-US', options);
    const formattedEndDateTime = endDateTime.toLocaleString('en-US', options);
  
    return `${formattedStartDateTime} - ${formattedEndDateTime}`;
  };

  
  console.log("BOARD: ",leadershipBoard);

  return (
    <Suspense fallback={<GlobalLoading />}>
      <div className={styles.churchDetailsPage}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <img src={church.heroImage || "/images/hero.jpg"} alt="Church" className={styles.heroImage} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{church.localChurchName}</h1>
            <p className={styles.heroDescription}>{church.localChurchDescription}</p>
          </div>
        </div>

        {/* Details Section */}
        <section className={styles.section}>
          <h2>Church Details</h2>
          <div className={styles.detailsContainer}>
            <div className={styles.card}>
              <p><strong>Address:</strong> {church.localChurchAddress}</p>
              <p><strong>Phone:</strong> {church.localChurchPhone}</p>
              <p><strong>Email:</strong> {church.localChurchEmail}</p>
            </div>
            <div className={styles.location}>
              <h3>Location</h3>
              <img src="/images/location.svg" alt="Location Icon" className={styles.locationIcon} />
              <p>{church.localChurchLocation}</p>
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={styles.googleMapsLink}>
                Open in Google Maps
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section}>
        <h2>Gallery</h2>
        <div className={styles.carouselContainer}>
          {galleryImages.map((image, index) => (
            <img
              key={index}
              src={`/images/gallery/${image}`} // Dynamically prepend folder path
              alt={`Gallery Image ${index + 1}`}
              className={`${styles.carouselImage} ${index === currentSlide ? styles.active : styles.inactive}`}
            />
          ))}
        </div>
      </section>


        {/* Vestry Section */}
        <section className={`${styles.section} ${styles.vestrySection}`}>
          <h2>Vestry</h2>
          
          {/* Clergy Members */}
          <div className={styles.clergyContainer}>
            {clergy && clergy.length > 0 ? (
              clergy.map((member) => (
                <div
                  className={styles.clergyCard}
                  key={member.clergyID}
                  onClick={() => handleClergyClick(member.clergyID)}
                  style={{ cursor: "pointer" }}
                >
                  <p className={styles.clergyRank}>{getClergyRankText(member.clergyRank)}</p>
                  <img
                    src={member.clergyPicture || "/images/priest.svg"}
                    alt={member.clergyName}
                    className={styles.clergyPortrait}
                  />
                  <div className={styles.clergyDetails}>
                    <h3 className={styles.clergyName}>{member.clergyName}</h3>
                    <p className={styles.clergyDescription}>{member.description || "No description available."}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No Clergy Found</p>
            )}
          </div>

          {/* Leadership Board Section */}
          {leadershipBoard ? (
            <div className={styles.leadershipBoardCard}>
              <h2>Leadership Board</h2>
              <p className={styles.leadershipLevel}>
                <strong>Level:</strong> {levels[leadershipBoard.leadershipLevel] || "Unknown"}
              </p>
              <p className={styles.leadershipDescription}>{leadershipBoard.boardDescription || "No description available."}</p>
              
              <div className={styles.boardMembers}>
                {leadershipBoard.chairmanName && <p><strong>Chairman:</strong> {leadershipBoard.chairmanName}</p>}
                {leadershipBoard.chairladyName && <p><strong>Chairlady:</strong> {leadershipBoard.chairladyName}</p>}
                {leadershipBoard.secretaryName && <p><strong>Secretary:</strong> {leadershipBoard.secretaryName}</p>}
                {leadershipBoard.treasurerName && <p><strong>Treasurer:</strong> {leadershipBoard.treasurerName}</p>}
                {leadershipBoard.vChairmanName && <p><strong>Vice Chairman:</strong> {leadershipBoard.vChairmanName}</p>}
                {leadershipBoard.vChairladyName && <p><strong>Vice Chairlady:</strong> {leadershipBoard.vChairladyName}</p>}
                {leadershipBoard.vSecretaryName && <p><strong>Vice Secretary:</strong> {leadershipBoard.vSecretaryName}</p>}
                {leadershipBoard.vTreasurerName && <p><strong>Vice Treasurer:</strong> {leadershipBoard.vTreasurerName}</p>}
                {leadershipBoard.Admin && <p><strong>Admin:</strong> {leadershipBoard.Admin}</p>}
              </div>

              {leadershipBoard.dateFormed && (
                <p className={styles.boardDate}>
                  <strong>Date Formed:</strong> {new Date(leadershipBoard.dateFormed).toLocaleDateString()}
                </p>
              )}

              {leadershipBoard.boardTenure && (
                <p className={styles.boardTenure}><strong>Tenure:</strong> {leadershipBoard.boardTenure} years</p>
              )}
            </div>
          ) : (
            <p>Loading Leadership Board...</p>  // Display loading or a fallback message
          )}


        </section>

        {/* Events Section */}
        <section className={styles.section}>
          <h2>Events</h2>
          <div className={styles.events}>
            <div>
              <h3>Upcoming Events</h3>
              <div className={styles.eventCards}>
                {events && events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.eventID}
                      className={styles.eventCard}
                      onClick={() => handleEventClick(event.eventID)}
                    >
                      <img
                        src="/images/calendar.svg"
                        alt={`${event.eventTitle} Cover`}
                        className={styles.eventCoverPhoto}
                      />
                      <div className={styles.eventDetails}>
                        <h4>{getLevelText(event.eventLevel) + ": " + event.eventTitle}</h4>
                        <p><strong>Location:</strong> {event.eventLocationChurch}</p>
                        <p><strong>Time:</strong> {formatEventDateTime(event.eventStratDate, event.eventStratTime, event.eventEndDate, event.eventEndTime)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No Upcoming Events</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Members Section */}
        <section className={styles.section}>
          <h2>Members</h2>
          <button onClick={handleFetchMembers} className={styles.fetchMembersButton}>
            Fetch {church.localChurchName} Members
          </button>
          {error && <p className={styles.errorMessage}>{error}</p>}
          {members && members.length > 0 ? (
            <div className={styles.membersTableContainer}>
              <table className={styles.membersTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Alias</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.memberID}>
                      <td>{member.memberName}</td>
                      <td>{member.memberAlias}</td>
                      <td>{member.memberEmail}</td>
                      <td>{member.memberPhoneNum}</td>
                      <td>{member.memberRole}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No members found.</p>
          )}
        </section>

        {/* Announcements Section */}
        <section className={styles.section}>
          <h2>Announcements</h2>
          <div className={styles.announcementsList}>
            {announcements && announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div key={announcement.announcementID} className={styles.announcementCard}>
                  <div className={styles.announcementHeader}>
                    <img src="/images/announcement.svg" alt="Microphone Icon" className={styles.announcementIcon} />
                    <h3>{announcement.announcementTitle}</h3>
                  </div>
                  <p className={styles.announcementLevel}><strong>Level:</strong> {announcement.announcementLevel}</p>
                  <p className={styles.announcementDescription}>{announcement.announcementDescription}</p>
                  <p className={styles.announcementDate}><strong>Date:</strong> {new Date(announcement.announcementStratDate).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p>No Announcements</p>
            )}
          </div>
        </section>

      </div>
    </Suspense>
  );

};

export default ChurchDetailsPage;
