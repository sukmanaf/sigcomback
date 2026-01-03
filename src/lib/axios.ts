import axios from 'axios';

// Create axios instance for SISMIOP API
const sismiopApi = axios.create({
    baseURL: process.env.SISMIOP_API_URL || 'https://bapenda.pasuruankota.go.id:5151/sismiop/sig_api',
    timeout: 30000,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

// Create axios instance for internal API
const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export { sismiopApi, api };
export default api;
