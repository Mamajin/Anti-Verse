import axios from 'axios';

export const createClient = (baseURL: string) => {
  const instance = axios.create({ baseURL });
  
  instance.interceptors.response.use(
    response => response,
    error => Promise.reject(error)
  );

  return instance;
};
