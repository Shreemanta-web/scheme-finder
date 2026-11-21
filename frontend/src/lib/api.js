import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const http = axios.create({ baseURL: API, timeout: 75000 });
export const withAuth = async (getToken) => ({ headers: { Authorization: `Bearer ${await getToken()}` } });
export const errorText = (e, fallback) => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d.map((x) => x.msg.replace(/^Value error, /, "")).join(" · ");
  return fallback;
};
