import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token&& token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


export default axiosInstance;