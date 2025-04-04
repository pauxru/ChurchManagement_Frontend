import axios from "axios";
import { BASE_ENDPOINT } from "../../../public/contants/global-variables";
import { getAccessToken } from "./get-access-token";

const fetchData = async (endpoint: string) => {
  try {
    const res = await fetch('/api/get-api-access-token');
    const fetchedToken = await res.text();

    const response = await axios.get(`${BASE_ENDPOINT}${endpoint}`, {
      headers: { Authorization: `Bearer ${fetchedToken}` },
      timeout:5000
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch data from ${endpoint} with error: ${error}`);
  }
};

export const fetchChurchDetails = (localChurchID: string) =>
  fetchData(`/Churches/local_church/${localChurchID}`);

export const fetchClergyDetails = (localChurchID: string) =>
  fetchData(`/clergy/localChurch/${localChurchID}`);

export const fetchEventDetails = (localChurchID: string) =>
  fetchData(`/Events/get-level-events/1/${localChurchID}`);

export const fetchBoardDetails = (localChurchID: string) =>
  fetchData(`/Board/get-level-board/1/${localChurchID}`);

export const fetchAnnouncementDetails = (localChurchID: string) =>
  fetchData(`/Announcement/get-level-announcement/1/${localChurchID}`);

export const fetchMembers = (localChurchID: string) =>
  fetchData(`/Members/local-church/${localChurchID}`);

export { getAccessToken };
