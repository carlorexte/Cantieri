import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [cantieri, setCantieri] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [personeEsterne, setPersoneEsterne] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState({});

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

  const shouldRefetch = useCallback((key) => {
    if (!lastFetch[key]) return true;
    return Date.now() - lastFetch[key] > CACHE_DURATION;
  }, [lastFetch]);

  const loadCommonData = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      // 1. Fetch User first to determine permissions
      let user = currentUser;
      if (force || shouldRefetch('user') || !user) {
        try {
          user = await base44.auth.me();
          
          // Se l'utente non è admin e mancano i campi custom, prova a recuperarli
          if (user && user.role !== 'admin' && !user.cantieri_assegnati) {
            try {
              console.log("Fetching full user details for:", user.id);
              const fullUser = await base44.entities.User.get(user.id);
              if (fullUser) {
                // Merge auth data with entity data
                user = { ...user, ...fullUser };
              }
            } catch (err) {
              console.warn("Could not fetch full user details:", err);
            }
          }

          setCurrentUser(user);
          setLastFetch(prev => ({ ...prev, user: Date.now() }));
        } catch (e) {
          console.error("Error fetching user", e);
          // Proceed as guest or handle error
          user = null;
        }
      }

      const fetchPromises = [];

      // 2. Fetch Cantieri based on User Role/Assignments
      if (force || shouldRefetch('cantieri')) {
        let cantierePromise;
        
        console.log("Loading cantieri for user role:", user?.role);
        
        if (user?.role === 'admin') {
          // Admins see all cantieri
          cantierePromise = base44.entities.Cantiere.list('-created_date', 100);
        } else if (user?.cantieri_assegnati?.length > 0) {
          // Users see only assigned cantieri
          console.log("Fetching assigned cantieri:", user.cantieri_assegnati);
          cantierePromise = base44.entities.Cantiere.filter({
            id: { $in: user.cantieri_assegnati }
          }, '-created_date', 100);
        } else if (user) {
          // Authenticated user with no assignments
          console.log("User has no assigned cantieri");
          cantierePromise = Promise.resolve([]);
        } else {
          // Not authenticated
          cantierePromise = Promise.resolve([]);
        }

        fetchPromises.push(
          cantierePromise
            .then(data => {
              setCantieri(data);
              setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
            })
            .catch(err => {
              console.error("Error fetching cantieri:", err);
              setCantieri([]);
            })
        );
      }

      if (force || shouldRefetch('imprese')) {
        fetchPromises.push(
          base44.entities.Impresa.list('-created_date', 100)
            .then(data => {
              setImprese(data);
              setLastFetch(prev => ({ ...prev, imprese: Date.now() }));
            })
        );
      }

      if (force || shouldRefetch('personeEsterne')) {
        fetchPromises.push(
          base44.entities.PersonaEsterna.list('-created_date', 100)
            .then(data => {
              setPersoneEsterne(data);
              setLastFetch(prev => ({ ...prev, personeEsterne: Date.now() }));
            })
        );
      }

      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Errore caricamento dati comuni:', error);
    } finally {
      setIsLoading(false);
    }
  }, [shouldRefetch]); // Removed currentUser from dependencies to avoid loops

  useEffect(() => {
    loadCommonData();
  }, [loadCommonData]);

  const refreshCantieri = useCallback(async () => {
    try {
      const data = await base44.entities.Cantiere.list('-created_date', 100);
      setCantieri(data);
      setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
    } catch (error) {
      console.error('Errore refresh cantieri:', error);
    }
  }, []);

  const refreshImprese = useCallback(async () => {
    try {
      const data = await base44.entities.Impresa.list('-created_date', 100);
      setImprese(data);
      setLastFetch(prev => ({ ...prev, imprese: Date.now() }));
    } catch (error) {
      console.error('Errore refresh imprese:', error);
    }
  }, []);

  const refreshPersoneEsterne = useCallback(async () => {
    try {
      const data = await base44.entities.PersonaEsterna.list('-created_date', 100);
      setPersoneEsterne(data);
      setLastFetch(prev => ({ ...prev, personeEsterne: Date.now() }));
    } catch (error) {
      console.error('Errore refresh persone esterne:', error);
    }
  }, []);

  const value = {
    cantieri,
    imprese,
    personeEsterne,
    currentUser,
    isLoading,
    refreshCantieri,
    refreshImprese,
    refreshPersoneEsterne,
    refreshAll: () => loadCommonData(true)
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};