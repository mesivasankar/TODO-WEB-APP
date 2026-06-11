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

export async function getTodayTasks() {
  const response = await apiRequest(`/api/tasks/today`);
  const data = await response.json();
  return data.tasks;
}

export async function getOverdueTasks() {
  const response = await apiRequest(`/api/tasks/overdue`);
  const data = await response.json();
  return data.tasks;
}

export async function getUpcomingTasks() {
  const response = await apiRequest(`/api/tasks/upcoming`);
  const data = await response.json();
  return data.tasks;
}

export async function getSpecialTaskCounts() {
  const response = await apiRequest(`/api/tasks/special-counts`);
  const data = await response.json();
  return data.counts;
}

export async function searchTasks(query) {
  const response = await apiRequest(`/api/tasks/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data;
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

export async function reorderTasks(listId, orderedIds) {
  await apiRequest(`/api/lists/${listId}/tasks/reorder`, {
    method: "PATCH",
    body: JSON.stringify(orderedIds), 
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

export async function clearCompletedTasks(listId) {
  const response = await apiRequest(`/api/lists/${listId}/tasks/completed`, {
    method: "DELETE",
  });
  const data = await response.json();
  return data;
}

export async function restoreTask(taskId) {
  const response = await apiRequest(`/api/tasks/${taskId}/restore`, {
    method: "PATCH",
  });
  const data = await response.json();
  return data.task;
}

export async function bulkRestoreTasks(taskIds) {
  const response = await apiRequest(`/api/tasks/restore-bulk`, {
    method: "PATCH",
    body: JSON.stringify({ taskIds }),
  });
  const data = await response.json();
  return data;
}

export async function bulkPermanentDeleteTasks(taskIds) {
  const response = await apiRequest(`/api/tasks/permanent-bulk`, {
    method: "DELETE",
    body: JSON.stringify({ taskIds }),
  });
  const data = await response.json();
  return data;
}

export async function getAnalytics() {
  const response = await apiRequest(`/api/tasks/analytics`);
  return response.json();
}

export async function getTasksHistory(date) {
  const url = date ? `/api/tasks/history?date=${encodeURIComponent(date)}` : `/api/tasks/history`;
  const response = await apiRequest(url);
  const data = await response.json();
  return data.tasks;
}

export async function getDailyBriefing() {
  const response = await apiRequest(`/api/ai/briefing`);
  return response.json();
}




export const suggestSubtasks = async (taskTitle, instruction = "") => {
  const response = await apiRequest('/api/ai/suggest-subtasks', {
    method: 'POST',
    body: JSON.stringify({ taskTitle, instruction })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to generate suggestions");
  }
  return {
    subtasks: data.subtasks,
    dailyLimit: data.dailyLimit,
    dailyRemaining: data.dailyRemaining,
    isProduction: data.isProduction
  };
};

export const getAiUsage = async () => {
  const response = await apiRequest('/api/ai/usage');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch usage");
  }
  return data;
};