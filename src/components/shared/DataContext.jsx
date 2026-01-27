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
      // 1. Fetch User
      let user = currentUser;
      if (force || shouldRefetch('user') || !user) {
        try {
          user = await base44.auth.me();
          setCurrentUser(user);
          setLastFetch(prev => ({ ...prev, user: Date.now() }));
        } catch (e) {
          console.error("Error fetching user", e);
          user = null;
        }
      }

      const fetchPromises = [];

      // 2. Fetch Cantieri using backend function to ensure consistent visibility/RLS handling
      if (force || shouldRefetch('cantieri')) {
        fetchPromises.push(
          base44.functions.invoke('getMyCantieri')
            .then(response => {
              // Support both {data: {items: []}} (axios style) and direct body
              const payload = response.data || response;


              if (payload && payload.items && Array.isArray(payload.items)) {
                setCantieri(payload.items);
                setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
              } else if (Array.isArray(payload)) {
                setCantieri(payload);
                setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
              } else {
                console.warn("getMyCantieri returned invalid data structure:", payload);
                setCantieri([]);
              }
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
  }, [shouldRefetch]);

  useEffect(() => {
    loadCommonData();
  }, [loadCommonData]);

  const refreshCantieri = useCallback(async () => {
    try {
      const response = await base44.functions.invoke('getMyCantieri');
      const payload = response.data || response;
      
      if (payload && payload.items && Array.isArray(payload.items)) {
        setCantieri(payload.items);
        setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
      } else if (Array.isArray(payload)) {
        setCantieri(payload);
        setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
      }
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