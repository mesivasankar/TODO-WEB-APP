const env = {
  nodeEnv: import.meta.env.MODE || 'development',
  isProduction: import.meta.env.MODE === 'production',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
};

export default env;
