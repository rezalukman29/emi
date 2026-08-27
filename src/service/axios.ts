import axios from 'axios';
import { localStorageService } from './localStorage';

const ax = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL as string ||'https://booqable-staging.emi.web.id',
});

ax.interceptors.request.use(
  async (configuration: any) => {
    const auth =  localStorageService.getAuth("auth");
    configuration.headers['Content-Type'] = 'application/json';
    if (auth) {
      try {
        const parsedAuth = JSON.parse(auth);
        if (parsedAuth.user_type === 'SUPERADMIN') {
          configuration.headers['SuperAdmin-Id'] = parsedAuth.id;
          configuration.headers['SuperAdmin-Token'] = parsedAuth.token;
        } else {
          configuration.headers['User-Id'] = parsedAuth.id;
        }
      } catch {
        configuration.headers['User-Id'] = 8;
      }
    } else {
      configuration.headers['User-Id'] = 8;
    }
    return configuration;
  },
  (error: any) => {
    Promise.reject(error);
  },
);

export default ax;
