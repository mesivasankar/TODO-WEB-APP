import axios from "axios";

const API_URL = "/api/focus";

export const startFocusSession = (taskId, durationSecs) =>
  axios.post(`${API_URL}/start`, { taskId, durationSecs }).then(res => res.data);

export const updateFocusSession = (sessionId, status, minutesFocused) =>
  axios.patch(`${API_URL}/${sessionId}`, { status, minutesFocused }).then(res => res.data);

export const getFocusStats = () =>
  axios.get(`${API_URL}/stats`).then(res => res.data);
