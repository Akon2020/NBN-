import axios, { AxiosInstance } from "axios";

// ADMIN-G01 : le jeton vit dans un cookie httpOnly posé par le backend — il
// n'est jamais lisible en JS. `withCredentials: true` suffit à l'envoyer
// automatiquement à chaque requête, plus besoin de reconstruire un header
// Authorization à partir d'un cookie côté client.
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
    
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
      
//       // Ne pas essayer de rafraîchir pour les endpoints de login/logout
//       if (originalRequest.url?.includes('/auth/login') || 
//           originalRequest.url?.includes('/auth/logout')) {
//         return Promise.reject(error);
//       }
      
//       try {
//         const refreshToken = localStorage.getItem('refreshToken');
        
//         if (!refreshToken) {
//           throw new Error('No refresh token');
//         }
        
//         const response = await axios.post(
//           `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh/`,
//           { refresh: refreshToken },
//           { headers: { 'Content-Type': 'application/json' } }
//         );
        
//         const newAccessToken = response.data.access;
//         localStorage.setItem('accessToken', newAccessToken);
        
//         // Mettre à jour l'en-tête pour la requête originale
//         originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
//         return api(originalRequest);
//       } catch (refreshError) {
//         console.error('Token refresh failed:', refreshError);
        
//         // Redirection vers login
//         if (typeof window !== 'undefined') {
//           localStorage.removeItem('accessToken');
//           localStorage.removeItem('refreshToken');
//           localStorage.removeItem('user');
          
//           // Ne rediriger que si on est sur une page protégée
//           if (window.location.pathname.startsWith('/admin') || 
//               window.location.pathname.startsWith('/owner')) {
//             window.location.href = '/auth/login';
//           }
//         }
        
//         return Promise.reject(refreshError);
//       }
//     }
    
//     return Promise.reject(error);
//   }
// );

export default api;
