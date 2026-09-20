import axios from 'axios';

// Before Netlify deployment, replace this with: https://your-render-service.onrender.com/api
const API = "https://cloud-computing-project1-add-delete.onrender.com/api";
export default axios.create({ baseURL: API, headers: { 'Content-Type': 'application/json' } });
