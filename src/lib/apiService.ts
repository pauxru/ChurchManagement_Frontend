import axios from "axios";
import { BASE_ENDPOINT } from "../../public/constants/global-variables";

// Caller is responsible for supplying the bearer token; client components
// pull it from `useSession()` and pass it in. This keeps apiService free of
// React hooks so server components and tests can use it too.
const fetchData = async <T = unknown>(endpoint: string, token: string): Promise<T> => {
  try {
    const response = await axios.get<T>(`${BASE_ENDPOINT}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ${endpoint}: ${error}`);
  }
};

export const fetchChurchDetails = (localChurchID: string, token: string) =>
  fetchData(`/Churches/local_church/${localChurchID}`, token);

export const fetchClergyDetails = (localChurchID: string, token: string) =>
  fetchData(`/Clergy/localChurch/${localChurchID}`, token);

export const fetchEventDetails = (localChurchID: string, token: string) =>
  fetchData(`/Events/get-level-events/1/${localChurchID}`, token);

export const fetchBoardDetails = (localChurchID: string, token: string) =>
  fetchData(`/Board/get-level-board/1/${localChurchID}`, token);

export const fetchAnnouncementDetails = (localChurchID: string, token: string) =>
  fetchData(`/Announcement/get-level-announcement/1/${localChurchID}`, token);

export const fetchMembers = (localChurchID: string, token: string) =>
  fetchData(`/Members/local-church/${localChurchID}`, token);
