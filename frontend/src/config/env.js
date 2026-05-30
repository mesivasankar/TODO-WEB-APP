const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const apiBaseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

const env = {
  nodeEnv: import.meta.env.MODE || 'development',
  isProduction: import.meta.env.MODE === 'production',
  apiBaseUrl,
};

export default env;
