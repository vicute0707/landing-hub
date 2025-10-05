import axios from "axios";

export const leadsAPI = axios.create({
  baseURL: "http://localhost:5000", // Backend port 
});

export default leadsAPI;
