import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "https://api.landinghub.shop",
});

// Load token khi dự án khởi động
const savedToken = localStorage.getItem("token");
if (savedToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    console.log("Axios loaded token:", savedToken);
}

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

export default api;
