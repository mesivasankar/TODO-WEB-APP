import { apiRequest } from "./client";

export async function getTasksForList(listId) {
  const response = await apiRequest(`/api/lists/${listId}/tasks`);
  const data = await response.json();
  return data.tasks;
}

export async function getAllStarredTasks() {
  const response = await apiRequest(`/api/tasks/starred`); 
  const data = await response.json();
  return data.tasks;
}

export async function createTask(listId, taskData) {
  const response = await apiRequest(`/api/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(taskData),
  });
  const data = await response.json();
  return data.task;
}

export async function updateTask(taskId, updates) {
  const response = await apiRequest(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data.task;
}

// 🔥 NEW: Reorder API
export async function reorderTasks(listId, orderedIds) {
  // Note: Depending on your route setup, this might be /api/lists/:listId/tasks/reorder
  // or /api/tasks/reorder if the listId is passed in the body.
  // Based on your routes, it is likely mounted under /api/lists/:listId/tasks
  await apiRequest(`/api/lists/${listId}/tasks/reorder`, {
    method: "PATCH",
    body: JSON.stringify(orderedIds), // Controller expects array directly or { orderedIds }? 
    // Controller `sortTasksInList` usually expects the body to BE the array based on previous code.
    // Let's ensure we send what the controller expects.
    // If controller does: const orderedIds = req.body; -> Send Array
  });
}

export async function toggleTaskStar(taskId, isStarred) {
  const response = await apiRequest(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ isStarred: isStarred }),
  });
  const data = await response.json();
  return data.task;
}

export async function toggleTaskComplete(taskId, isCompleted) {
  const response = await apiRequest(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ isCompleted: isCompleted }),
  });
  const data = await response.json();
  return data.task;
}

export async function deleteTask(taskId) {
  const response = await apiRequest(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  return data.task;
}

export async function permanentDeleteTask(taskId) {
  await apiRequest(`/api/tasks/${taskId}/permanent`, {
    method: "DELETE",
  });
}

export async function restoreTask(taskId) {
  const response = await apiRequest(`/api/tasks/${taskId}/restore`, {
    method: "PATCH",
  });
  const data = await response.json();
  return data.task;
}