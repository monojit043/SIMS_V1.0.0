const SIMS_AUTH_STORAGE_KEY = "sims_auth";

function simsGetAuth() {
  try {
    const raw = localStorage.getItem(SIMS_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function simsSetAuth(token, user) {
  localStorage.setItem(SIMS_AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

function simsClearAuth() {
  localStorage.removeItem(SIMS_AUTH_STORAGE_KEY);
}

function simsGetAuthToken() {
  const auth = simsGetAuth();
  return auth ? auth.token : null;
}

function simsGetAuthUser() {
  const auth = simsGetAuth();
  return auth ? auth.user : null;
}
