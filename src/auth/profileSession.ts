import { authAPI } from "../api/auth";
import type { AuthUser } from "../context/AuthContext";

let cachedProfile: AuthUser | null = null;
let pendingProfileRequest: Promise<AuthUser> | null = null;

export function getCachedProfile() {
  return cachedProfile;
}

export function setCachedProfile(profile: AuthUser | null) {
  cachedProfile = profile;
}

export function clearProfileSession() {
  cachedProfile = null;
  pendingProfileRequest = null;
}

export async function loadCurrentProfile({ force = false } = {}) {
  if (!force && cachedProfile) {
    return cachedProfile;
  }

  if (!force && pendingProfileRequest) {
    return pendingProfileRequest;
  }

  const request = authAPI.getProfile().then((response) => {
    const profile = response.data as AuthUser;
    cachedProfile = profile;
    return profile;
  });

  pendingProfileRequest = request;

  try {
    return await request;
  } finally {
    if (pendingProfileRequest === request) {
      pendingProfileRequest = null;
    }
  }
}
