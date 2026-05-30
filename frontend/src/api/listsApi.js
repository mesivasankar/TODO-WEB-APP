import { apiRequest } from "./client";

export async function getLists() {
  const response = await apiRequest("/api/lists");
  const data = await response.json();
  return data.lists;
}

// 🔥 UPDATED: Now accepts category
export async function createList(name, category = 'OTHERS') {
  const response = await apiRequest("/api/lists", {
    method: "POST",
    // Send both name and category to the backend
    body: JSON.stringify({ name, category }),
  });

  const data = await response.json();
  return data.list;
}

export async function renameListApi(listId, name) {
  await apiRequest(`/api/lists/${listId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

// 🔥 NEW: Reorder API call
export async function reorderLists(orderedIds) {
  await apiRequest("/api/lists/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

export async function deleteListApi(listId) {
  await apiRequest(`/api/lists/${listId}`, {
    method: "DELETE",
  });
}

// 🔥 NEW: Restore API call
export async function restoreListApi(listId) {
  await apiRequest(`/api/lists/${listId}/restore`, {
    method: "POST",
  });
}

// 🔥 NEW: Update List Sort Option API call
export async function updateListSortApi(listId, sortOption) {
  const response = await apiRequest(`/api/lists/${listId}/sort`, {
    method: "PATCH",
    body: JSON.stringify({ sortOption }),
  });
  const data = await response.json();
  return data.list;
}