const isProd = import.meta.env.MODE === 'production';
const rawUrl = isProd 
  ? '' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
const apiBaseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

const env = {
  nodeEnv: import.meta.env.MODE || 'development',
  isProduction: isProd,
  apiBaseUrl,
};

export default env;
