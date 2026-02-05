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
  
  // Stati per i permessi (spostati da PermissionGuard)
  const [currentRole, setCurrentRole] = useState(null);
  const [cantierePermissions, setCantierePermissions] = useState([]);

  // isLoadingUser: blocca solo l'auth/permessi iniziali
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  // isLoadingData: indica caricamento dati in background
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [lastFetch, setLastFetch] = useState({});

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

  const shouldRefetch = useCallback((key) => {
    if (!lastFetch[key]) return true;
    return Date.now() - lastFetch[key] > CACHE_DURATION;
  }, [lastFetch]);

  // Caricamento CRITICO: Utente + Permessi
  const loadUserAndPermissions = useCallback(async (force = false) => {
    if (!force && currentUser && !shouldRefetch('user')) return;
    
    setIsLoadingUser(true);
    try {
      let user = await base44.auth.me();
      
      // Fetch full user details se necessario (copiato da PermissionGuard logic)
      try {
         const userEntity = await base44.entities.User.get(user.id);
         user = { ...user, ...userEntity };
      } catch (e) {
         // Ignora se fallisce fetch extra, usa auth.me base
      }
      
      setCurrentUser(user);
      setLastFetch(prev => ({ ...prev, user: Date.now() }));

      // Fetch Ruolo e Permessi in parallelo
      const permsPromises = [];
      
      if (user.ruolo_id) {
        permsPromises.push(
          base44.entities.Ruolo.get(user.ruolo_id)
            .then(r => setCurrentRole(r))
            .catch(e => console.error("Err ruolo", e))
        );
      } else {
        setCurrentRole(null);
      }

      permsPromises.push(
        base44.entities.PermessoCantiereUtente.filter({ utente_id: user.id })
          .then(p => setCantierePermissions(p))
          .catch(e => console.error("Err permessi cantieri", e))
      );

      await Promise.all(permsPromises);

    } catch (e) {
      console.error("Error fetching user/perms", e);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
      // Dopo aver caricato l'utente, scateniamo il caricamento dei dati secondari
      loadSecondaryData();
    }
  }, [shouldRefetch]);

  // Caricamento SECONDARIO: Liste dati (Cantieri, Imprese, ecc)
  // Non blocca la UI principale
  const loadSecondaryData = useCallback(async (force = false) => {
    setIsLoadingData(true);
    const fetchPromises = [];

    if (force || shouldRefetch('cantieri')) {
      fetchPromises.push(
        base44.functions.invoke('getMyCantieri')
          .then(response => {
            const payload = response.data || response;
            if (payload && payload.items && Array.isArray(payload.items)) {
              setCantieri(payload.items);
            } else if (Array.isArray(payload)) {
              setCantieri(payload);
            } else {
              setCantieri([]);
            }
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

    try {
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching secondary data", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [shouldRefetch]);

  useEffect(() => {
    loadUserAndPermissions();
  }, [loadUserAndPermissions]);

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
    currentRole,
    cantierePermissions,
    isLoading: isLoadingUser, // Retrocompatibilità: isLoading principale si riferisce all'utente
    isLoadingData, // Nuovo stato per chi vuole sapere se stiamo caricando liste
    refreshCantieri,
    refreshImprese,
    refreshPersoneEsterne,
    refreshAll: () => {
        loadUserAndPermissions(true);
        loadSecondaryData(true);
    }
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};