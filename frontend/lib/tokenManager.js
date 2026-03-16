// Gestionnaire de token synchrone pour l'intercepteur axios
// Évite les problèmes de timing avec SecureStore async

let _token = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };
