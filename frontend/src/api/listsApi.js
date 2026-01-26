import { apiRequest } from "./client";

export async function getLists() {
  const response = await apiRequest("/api/lists");
  const data = await response.json();
  return data.lists;
}

export async function createList(name) {
  const response = await apiRequest("/api/lists", {
    method: "POST",
    body: JSON.stringify({ name }),
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