"use client";

import { useState, useEffect } from 'react';

export const useFeatureFlag = (featureName: string, clubId?: string) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Client-side feature flag ellenőrzés
        const enabled = await checkFeatureFlagClient(featureName, clubId);
        setIsEnabled(enabled);
      } catch (err) {
        console.error('Error checking feature flag:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFeatureFlag();
  }, [featureName, clubId]);

  return { isEnabled, isLoading, error };
};

export const useSocketFeature = (clubId?: string) => {
  const [isSocketEnabled, setIsSocketEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSocketFeature = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Client-side socket feature ellenőrzés
        const enabled = await checkSocketFeatureClient(clubId);
        setIsSocketEnabled(enabled);
      } catch (err) {
        console.error('Error checking socket feature:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsSocketEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSocketFeature();
  }, [clubId]);

  return { isSocketEnabled, isLoading, error };
};

// Client-side feature flag ellenőrzés
async function checkFeatureFlagClient(featureName: string, clubId?: string): Promise<boolean> {
  // Ha NEXT_PUBLIC_ENABLE_ALL true, akkor minden feature elérhető
  if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
    return true;
  }

  // ENV alapú ellenőrzés
  const envVarName = `NEXT_PUBLIC_ENABLE_${featureName.toUpperCase()}`;
  const envValue = process.env[envVarName];
  
  // Ha nincs definiálva, akkor alapértelmezetten false
  if (envValue === undefined) {
    return false;
  }
  
  const envEnabled = envValue.toLowerCase() === 'true';
  
  // Ha ENV alapú flag false, akkor adatbázist sem ellenőrizzük
  if (!envEnabled) {
    return false;
  }

  // Ha nincs clubId, akkor csak ENV alapú ellenőrzés
  if (!clubId) {
    return envEnabled;
  }

  // Klub specifikus ellenőrzés API-n keresztül
  try {
    const response = await fetch(`/api/feature-flags/check?feature=${featureName}&clubId=${clubId}`);
    if (response.ok) {
      const data = await response.json();
      return data.enabled;
    }
    return false;
  } catch (error) {
    console.error('Error checking feature flag via API:', error);
    return false;
  }
}

// Client-side socket feature ellenőrzés
async function checkSocketFeatureClient(clubId?: string): Promise<boolean> {
  // Development módban mindig engedélyezett
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: socket feature enabled');
    return true;
  }

  // Ha NEXT_PUBLIC_ENABLE_ALL true, akkor mindenképp engedélyezett
  if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
    return true;
  }

  // ENV alapú socket ellenőrzés
  const envSocketEnabled = await checkFeatureFlagClient('SOCKET', clubId);
  
  // Ha ENV alapú flag false, akkor adatbázist sem ellenőrizzük
  if (!envSocketEnabled) {
    return false;
  }

  // Ha nincs clubId, akkor csak ENV alapú ellenőrzés
  if (!clubId) {
    return envSocketEnabled;
  }

  // Klub specifikus ellenőrzés API-n keresztül
  try {
    const response = await fetch(`/api/feature-flags/socket?clubId=${clubId}`);
    if (response.ok) {
      const data = await response.json();
      return data.enabled;
    }
    return false;
  } catch (error) {
    console.error('Error checking socket feature via API:', error);
    return false;
  }
} 