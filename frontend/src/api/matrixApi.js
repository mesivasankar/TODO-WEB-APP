import axios from "axios";

// Using a relative path or your specific API base URL
const API_URL = "/api/matrix"; 

export const fetchMatrixTasks = () => 
  axios.get(API_URL).then(res => res.data);

export const addMatrixTask = (text, quadrant) => 
  axios.post("/api/matrix", { text, quadrant }).then(res => res.data);

export const updateMatrixTask = (id, updates) => 
  axios.patch(`/api/matrix/${id}`, updates).then(res => res.data);

export const deleteMatrixTask = (id) => 
  axios.delete(`${API_URL}/${id}`).then(res => res.data);