import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { BASE_URL } from "../../public/contants/global-variables";
import { getAccessToken } from "./api/get-access-token";
import "../../styles/ChurchDetailsPage.css";

import { LeadershipBoard, LocalChurch, Event, Clergy, ChurchMember, Announcement } from "../../types/interfaces";
import {
  fetchChurchDetails,
  fetchClergyDetails,
  fetchEventDetails,
  fetchBoardDetails,
  fetchAnnouncementDetails
} from "../pages/api/apiService";


const ChurchDetailsPage = () => {
  const router = useRouter();
  const { LocalChurchID } = router.query;
  const [church, setChurch] = useState<LocalChurch | null>(null);
  const [clergy, setClergy] = useState<Clergy[] | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [members, setMembers] = useState<ChurchMember[] | null>(null);
  const [boards, setBoards] = useState<LeadershipBoard[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (LocalChurchID) {
      fetchChurchDetails(LocalChurchID as string)
        .then(setChurch)
        .catch(() => setError("Failed to fetch church details."));
    }
  }, [LocalChurchID]);

  useEffect(() => {
    if (LocalChurchID) {
      fetchClergyDetails(LocalChurchID as string)
        .then(setClergy)
        .catch(() => router.push({ pathname: "/404" }));
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
        .then(setBoards)
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

  const handleFetchMembers = async () => {
        try {
        if (!LocalChurchID) {
            setError("Local Church ID is not available.");
            return;
        }
    
        const token = await getAccessToken();
        const response = await axios.get(
            `${BASE_URL}/Members/local-church/${LocalChurchID}`, // Adjust API endpoint as needed
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const galleryImages = Array.from({ length: 10 }).map((_, index) => 
    `/images/gallery/church${index + 1}.jpg`
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % galleryImages.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [galleryImages.length]);

  if (error) return <div>Error: {error}</div>;
  if (!church) return <div>Loading...</div>;

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
  

  return (
    <div className="church-details-page">
      {/* Hero Section */}
      <div className="hero">
        <img src={church.heroImage || "/images/hero.jpg"} alt="Church" className="hero-image" />
        <div className="hero-content">
          <h1 className="hero-title">{church.localChurchName}</h1>
          <p className="hero-description">{church.localChurchDescription}</p>
        </div>
      </div>

      {/* Details Section */}
      <section className="section">
        <h2>Church Details</h2>
        <div className="details-container">
          <div className="card">
            <p><strong>Address:</strong> {church.localChurchAddress}</p>
            <p><strong>Phone:</strong> {church.localChurchPhone}</p>
            <p><strong>Email:</strong> {church.localChurchEmail}</p>
          </div>
          <div className="location">
            <h3>Location</h3>
            <img src="/images/location.svg" alt="Location Icon" className="locationIcon" />
            <p>{church.localChurchLocation}</p>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="googleMapsLink">
              Open in Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="section">
        <h2>Gallery</h2>
        <div className="carousel-container">
          {galleryImages.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Gallery Image ${index + 1}`}
              className={`carousel-image ${
                index === currentSlide ? "active" : "inactive"
              }`}
            />
          ))}
        </div>
      </section>




      <section className="section vestry-section">
    <h2>Vestry</h2>
    {/* Clergy Section */}
    <div className="clergy-container">

        {clergy && clergy.length > 0 ? (
        clergy.map((member) => (
            <div className="clergy-card" key={member.clergyID}>
            <p className="clergy-rank">{getClergyRankText(member.clergyRank)}</p>
            <img
                src={member.clergyPicture || "/images/priest.svg"}
                alt={member.clergyName}
                className="clergy-portrait"
            />
            <div className="clergy-details">
                <h3 className="clergy-name">{member.clergyName}</h3>
                <p className="clergy-description">
                {member.description || "No description available."}
                </p>
            </div>
            </div>
        ))
        ) : (
        <p>No Clergy Found</p>
        )}
    </div>
    
    {/* Leadership Boards Section */}
    <div className="boards-container">

        {boards && boards.length > 0 ? (
        boards.map((board) => (
            <div className="board-card" key={board.boardID}>
            <img
                src={"/images/board.svg"}
                alt={"Board Image"}
                className="board-picture"
            />
            <div className="board-details">
                <h3 className="board-level-name">{getLevelText(board.leadershipLevel)} Board</h3>
                <p className="board-chairman">
                <strong>Chairman:</strong> {board.chairmanName || "Not available"}
                </p>
                <p className="board-chairlady">
                <strong>Chairlady:</strong> {board.chairladyName || "Not available"}
                </p>
            </div>
            </div>
        ))
        ) : (
        <p>No Committee Found</p>
        )}
    </div>
    </section>


      {/* Events Section */}
      <section className="section">
        <h2>Events</h2>
        <div className="events">
          <div>
            <h3>Upcoming Events</h3>
            <div className="event-cards">
              {events && events.length > 0 ? (
                events.map((event) => (
                  <div
                    key={event.eventID}
                    className="event-card"
                    onClick={() => handleEventClick(event.eventID)}
                  >
                    <img
                      src={"/images/calendar.svg"}
                      alt={`${event.eventTitle} Cover`}
                      className="event-cover-photo"
                    />
                    <div className="event-details">
                      <h4>{getLevelText(event.eventLevel)+": "+event.eventTitle}</h4>
                                           
                      <p>
                        <strong>Location:</strong> {event.eventLocationChurch}
                      </p>
                      <p>
                        <strong>Time:</strong> {formatEventDateTime(event.eventStratDate, event.eventStratTime, event.eventEndDate, event.eventEndTime)}
                      </p>
                      
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
      <section className="section">
        <h2>Members</h2>
        <button
            onClick={handleFetchMembers}
            className="text-green-500 underline hover:text-green-600 focus:outline-none"
            >
            Fetch {church.localChurchName} Members
        </button>
        {error && <p className="error-message">{error}</p>}
        {members && members.length > 0 ? (
            <div className="members-table-container">
            <table className="members-table">
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

        <section className="section">
            <h2>Announcements</h2>
            <div className="announcements-list">
                {announcements && announcements.length > 0 ? (
                announcements.map((announcement) => (
                    <div key={announcement.announcementID} className="announcement-card">
                        <img src="/images/announcement.svg" alt="Microphone Icon" className="announcement-icon" />
                        <h3><strong>{getLevelText(announcement.announcementLevel)}</strong>: {announcement.announcementTitle}</h3>
                        <p>{announcement.announcementDescription}</p>
                        <p><strong>Date:</strong> {new Date(announcement.announcementStratDate).toLocaleDateString()}</p>
                    </div>
                ))
                ) : (
                <p>No Announcements</p>
                )}
            </div>
        </section>
    </div>
  );
};

export default ChurchDetailsPage;
