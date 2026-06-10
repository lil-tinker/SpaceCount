import axios from 'axios';
const AxiosAPI = axios.create({ baseURL: "/" });
AxiosAPI.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});
export default AxiosAPI;