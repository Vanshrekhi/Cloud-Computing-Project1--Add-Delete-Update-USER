import axios from 'axios';

// Before Netlify deployment, replace this with: https://your-render-service.onrender.com/api
const API = 'http://localhost:5000/api';
export default axios.create({ baseURL: API, headers: { 'Content-Type': 'application/json' } });
