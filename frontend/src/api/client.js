import env from '../config/env';

// export async function apiRequest(path, options = {}) {
//   const response = await fetch(`${env.apiBaseUrl}${path}`, {
//     credentials: 'include',
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//     ...options,
//   });

//   return response;
// }



export async function apiRequest(url, options = {}) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${url}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Request failed';

    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage =
          errorData.message ||
          errorData.error ||
          errorMessage;
      } else {
        const text = await response.text();
        if (text) errorMessage = text;
      }
    } catch {
      // keep default errorMessage
    }

    const error = new Error(errorMessage);
    error.response = response;
    throw error;
  }

  return response;
}

