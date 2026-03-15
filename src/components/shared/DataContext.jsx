import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseDB } from '@/lib/supabaseClient';

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

  // Stati per i permessi
  const [currentRole, setCurrentRole] = useState(null);
  const [cantierePermissions, setCantierePermissions] = useState([]);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [lastFetch, setLastFetch] = useState({});

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

  const shouldRefetch = useCallback((key) => {
    if (!lastFetch[key]) return true;
    return Date.now() - lastFetch[key] > CACHE_DURATION;
  }, [lastFetch]);

  // Caricamento Utente + Permessi
  const loadUserAndPermissions = useCallback(async (force = false) => {
    if (!force && currentUser && !shouldRefetch('user')) return;

    setIsLoadingUser(true);
    try {
      // User mock con permessi admin completi
      const user = {
        id: 'user-1',
        email: 'admin@cantierepro.it',
        nome: 'Amministratore',
        cognome: 'Demo',
        role: 'admin',
        ruolo_id: 'admin'
      };

      setCurrentUser(user);
      setCurrentRole({ id: 'admin', nome: 'Amministratore', permessi: {} });
      setLastFetch(prev => ({ ...prev, user: Date.now() }));

    } catch (e) {
      console.error("Error fetching user", e);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [currentUser, shouldRefetch]);

  // Caricamento Dati in background
  const loadBackgroundData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoadingData(true);
    try {
      // Carica cantieri
      if (shouldRefetch('cantieri')) {
        const cantieriData = await supabaseDB.cantieri.getAll();
        setCantieri(cantieriData);
        setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
      }

      // Carica imprese
      if (shouldRefetch('imprese')) {
        const impreseData = await supabaseDB.imprese.getAll();
        setImprese(impreseData);
        setLastFetch(prev => ({ ...prev, imprese: Date.now() }));
      }

    } catch (e) {
      console.error("Error fetching background data", e);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, shouldRefetch]);

  useEffect(() => {
    loadUserAndPermissions();
  }, [loadUserAndPermissions]);

  useEffect(() => {
    if (currentUser) {
      loadBackgroundData();
    }
  }, [currentUser, loadBackgroundData]);

  const refreshData = useCallback(() => {
    setLastFetch({});
    loadBackgroundData();
  }, [loadBackgroundData]);

  const value = {
    // Dati
    cantieri,
    imprese,
    personeEsterne,
    currentUser,
    currentRole,
    cantierePermissions,
    
    // Loading states
    isLoadingUser,
    isLoadingData,
    
    // Funzioni
    refreshData,
    loadUserAndPermissions
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
