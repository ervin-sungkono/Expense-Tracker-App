'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@lib/supabase/client';
import { isSupabaseConfigured } from '@lib/supabase/config';
import { db } from '@lib/db';
import { syncSpace } from '@lib/sync';
import { getCategories } from '@lib/seeder';

const GUEST_USER_ID = 'guest-local-user';
const GUEST_SPACE_ID = 'guest-local-space';
const GUEST_SESSION_KEY = 'xpensed:guest-active';
const GUEST_USER = { id: GUEST_USER_ID, email: 'Guest', is_guest: true, is_anonymous: true };
const GUEST_SPACE = {
  id: GUEST_SPACE_ID,
  name: 'Guest space',
  owner_id: GUEST_USER_ID,
  role: 'admin',
  localOnly: true,
};

const AuthContext = createContext(null);
const SpaceContext = createContext(null);

export function AppProvider({ children }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(configured);
  const [offlineSession, setOfflineSession] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [activeSpaceId, setActiveSpaceIdState] = useState(null);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [localContextReady, setLocalContextReady] = useState(false);
  const localInitialization = useRef({ key: null, promise: null });
  const newlyCreatedSpaceIds = useRef(new Set());
  const spacesRequest = useRef(0);
  const guestMigrationInFlight = useRef(null);
  const [guestMigrationPending, setGuestMigrationPending] = useState(false);
  const [guestMigrationSummary, setGuestMigrationSummary] = useState(null);
  const [guestMigrationBusy, setGuestMigrationBusy] = useState(false);
  const [guestMigrationError, setGuestMigrationError] = useState(null);

  const loadProfile = useCallback(
    async currentUser => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data ?? null);
    },
    [supabase]
  );

  const loadSpaces = useCallback(
    async (currentUser, showLoading = true) => {
      if (!supabase || !currentUser) return;
      const requestId = ++spacesRequest.current;
      if (showLoading) setSpacesLoading(true);
      try {
        const { data, error } = await supabase
          .from('space_members')
          .select('role,status,spaces(*)')
          .eq('user_id', currentUser.id)
          .eq('status', 'active');
        if (error) throw error;
        if (requestId === spacesRequest.current) {
          const nextSpaces = (data ?? []).map(row => ({ ...row.spaces, role: row.role }));
          setSpaces(nextSpaces);
          const stored = window.localStorage.getItem(`activeSpace:${currentUser.id}`);
          const nextActive = nextSpaces.some(space => space.id === stored)
            ? stored
            : (nextSpaces[0]?.id ?? null);
          setActiveSpaceIdState(nextActive);
        }
      } finally {
        if (showLoading && requestId === spacesRequest.current) setSpacesLoading(false);
      }
    },
    [supabase]
  );

  const activateGuest = useCallback(() => {
    newlyCreatedSpaceIds.current.add(GUEST_SPACE_ID);
    window.localStorage.setItem(GUEST_SESSION_KEY, 'true');
    setGuestMigrationPending(false);
    setGuestMigrationSummary(null);
    setGuestMigrationError(null);
    setUser(GUEST_USER);
    setProfile(null);
    setOfflineSession(true);
    setSpaces([{ ...GUEST_SPACE }]);
    setActiveSpaceIdState(GUEST_SPACE_ID);
    setSpacesLoading(false);
  }, []);

  const loadAuthenticatedUser = useCallback(
    async currentUser => {
      const hasGuestMigration = window.localStorage.getItem(GUEST_SESSION_KEY) === 'true';
      setSpaces([]);
      setActiveSpaceIdState(null);
      setLocalContextReady(false);
      setGuestMigrationError(null);
      setGuestMigrationPending(false);
      setUser(currentUser);
      setOfflineSession(hasGuestMigration);
      window.localStorage.setItem('lastAuthenticatedUser', JSON.stringify(currentUser));
      await Promise.all([loadProfile(currentUser), loadSpaces(currentUser)]);
      if (hasGuestMigration) {
        setGuestMigrationSummary(await db.getContextSummary(GUEST_USER_ID, GUEST_SPACE_ID));
        setGuestMigrationPending(true);
      } else {
        setOfflineSession(false);
      }
    },
    [loadProfile, loadSpaces]
  );

  useEffect(() => {
    if (!supabase) {
      if (window.localStorage.getItem(GUEST_SESSION_KEY) === 'true') activateGuest();
      return;
    }
    let mounted = true;
    const initialize = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = sessionData.session?.user ?? null;
        if (sessionUser) {
          try {
            const { data } = await supabase.auth.getUser();
            await loadAuthenticatedUser(data.user);
          } catch {
            setUser(sessionUser);
            setProfile(null);
            setSpaces([]);
            setActiveSpaceIdState(null);
            setOfflineSession(true);
          }
        } else if (window.localStorage.getItem(GUEST_SESSION_KEY) === 'true') {
          activateGuest();
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      if (nextUser) {
        if (event !== 'INITIAL_SESSION') {
          queueMicrotask(() => {
            loadAuthenticatedUser(nextUser).catch(() => {
              setUser(nextUser);
              setProfile(null);
              setSpaces([]);
              setActiveSpaceIdState(null);
              setOfflineSession(true);
            });
          });
        }
      } else if (window.localStorage.getItem(GUEST_SESSION_KEY) === 'true') {
        activateGuest();
      } else {
        setProfile(null);
        setSpaces([]);
        setActiveSpaceIdState(null);
        setOfflineSession(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [activateGuest, loadAuthenticatedUser, supabase]);

  const signInWithGoogle = useCallback(
    async (next = '/home') => {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, scopes: 'openid email profile' },
      });
      if (error) throw error;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (user?.is_guest) window.localStorage.removeItem(GUEST_SESSION_KEY);
    if (user?.is_guest || !supabase) {
      setUser(null);
      setProfile(null);
      setSpaces([]);
      setActiveSpaceIdState(null);
      setOfflineSession(false);
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
  }, [supabase, user]);

  const importGuestData = useCallback(
    async ({ spaceId, spaceName }) => {
      if (!supabase || !user || user.is_guest || !guestMigrationPending) return;
      if (guestMigrationInFlight.current) return guestMigrationInFlight.current;

      const migration = (async () => {
        setGuestMigrationBusy(true);
        setGuestMigrationError(null);
        try {
          let destination = spaces.find(space => space.id === spaceId);
          if (spaceId === 'new') {
            const { data, error } = await supabase.rpc('create_space', {
              space_name: spaceName,
            });
            if (error || !data?.id) throw error ?? new Error('Unable to create the new space.');
            destination = { ...data, role: 'admin' };
            newlyCreatedSpaceIds.current.add(data.id);
            setSpaces(current => [destination, ...current.filter(space => space.id !== data.id)]);
          }

          if (!destination || destination.role !== 'admin') {
            throw new Error('Choose an admin space for the complete guest-data import.');
          }

          await db.rehomeContext({
            fromUserId: GUEST_USER_ID,
            fromSpaceId: GUEST_SPACE_ID,
            toUserId: user.id,
            toSpaceId: destination.id,
          });
          window.localStorage.removeItem(GUEST_SESSION_KEY);
          setGuestMigrationPending(false);
          setGuestMigrationSummary(null);
          setActiveSpaceIdState(destination.id);
          window.localStorage.setItem(`activeSpace:${user.id}`, destination.id);
          setOfflineSession(false);
          return destination;
        } catch (error) {
          setGuestMigrationError(error?.message ?? 'Unable to migrate guest data.');
          throw error;
        } finally {
          setGuestMigrationBusy(false);
        }
      })();

      guestMigrationInFlight.current = migration;
      try {
        return await migration;
      } finally {
        if (guestMigrationInFlight.current === migration) guestMigrationInFlight.current = null;
      }
    },
    [guestMigrationPending, spaces, supabase, user]
  );

  const deferGuestMigration = useCallback(() => {
    setGuestMigrationPending(false);
    setGuestMigrationError(null);
    setOfflineSession(false);
  }, []);

  const discardGuestData = useCallback(async () => {
    if (!guestMigrationPending || guestMigrationBusy) return;
    setGuestMigrationBusy(true);
    setGuestMigrationError(null);
    try {
      await db.discardContext(GUEST_USER_ID, GUEST_SPACE_ID);
      window.localStorage.removeItem(GUEST_SESSION_KEY);
      setGuestMigrationPending(false);
      setGuestMigrationSummary(null);
      setOfflineSession(false);
    } catch (error) {
      setGuestMigrationError(error?.message ?? 'Unable to discard guest data.');
      throw error;
    } finally {
      setGuestMigrationBusy(false);
    }
  }, [guestMigrationBusy, guestMigrationPending]);

  const createSpace = useCallback(
    async name => {
      if (user?.is_guest) {
        const createdSpace = { ...GUEST_SPACE, name };
        setSpaces([createdSpace]);
        setActiveSpaceIdState(GUEST_SPACE_ID);
        return createdSpace;
      }
      const { data, error } = await supabase.rpc('create_space', {
        space_name: name,
      });
      if (error) throw error;
      spacesRequest.current += 1;
      const createdSpace = { ...data, role: 'admin' };
      newlyCreatedSpaceIds.current.add(data.id);
      setSpaces(current => [createdSpace, ...current.filter(space => space.id !== data.id)]);
      setActiveSpaceIdState(data.id);
      setSpacesLoading(false);
      window.localStorage.setItem(`activeSpace:${user.id}`, data.id);
      return createdSpace;
    },
    [supabase, user]
  );

  const setActiveSpaceId = useCallback(
    spaceId => {
      setActiveSpaceIdState(spaceId);
      if (user) window.localStorage.setItem(`activeSpace:${user.id}`, spaceId);
    },
    [user]
  );

  const activeSpace = spaces.find(space => space.id === activeSpaceId) ?? null;

  const syncNow = useCallback(async () => {
    if (!user || !activeSpace || !localContextReady || offlineSession) return;
    setSyncStatus('syncing');
    try {
      await syncSpace({ supabase, user, space: activeSpace });
      setPendingCount((await db.getPendingMutations(user.id, activeSpace.id)).length);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      throw error;
    }
  }, [activeSpace, localContextReady, offlineSession, supabase, user]);

  useEffect(() => {
    let cancelled = false;
    setLocalContextReady(false);
    setSyncStatus('idle');
    if (!user || !activeSpace) return;

    const initializationKey = `${user.id}:${activeSpace.id}:${activeSpace.role}`;
    if (localInitialization.current.key !== initializationKey) {
      localInitialization.current = {
        key: initializationKey,
        promise: (async () => {
          await db.configureContext({
            userId: user.id,
            spaceId: activeSpace.id,
            role: activeSpace.role,
          });
          if (newlyCreatedSpaceIds.current.delete(activeSpace.id)) {
            await db.seedCategories(getCategories());
          }
          return (await db.getPendingMutations(user.id, activeSpace.id)).length;
        })(),
      };
    }

    localInitialization.current.promise
      .then(nextPendingCount => {
        if (cancelled) return;
        setPendingCount(nextPendingCount);
        if (!cancelled) setLocalContextReady(true);
      })
      .catch(error => {
        console.error('Local data initialization failed', error);
        if (!cancelled) setSyncStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [activeSpace, user]);

  useEffect(() => {
    if (!activeSpace || !localContextReady || !navigator.onLine || offlineSession) return;
    syncNow().catch(() => {});
    const handleOnline = () => syncNow().catch(() => {});
    const handleFocus = () => navigator.onLine && syncNow().catch(() => {});
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeSpace, localContextReady, offlineSession, syncNow]);

  const authValue = {
    configured,
    supabase,
    user,
    profile,
    authLoading,
    offlineSession,
    isGuest: user?.is_guest === true,
    guestMigrationPending,
    guestMigrationSummary,
    guestMigrationBusy,
    guestMigrationError,
    startGuest: activateGuest,
    signInWithGoogle,
    signOut,
    importGuestData,
    deferGuestMigration,
    discardGuestData,
    refreshProfile: () => user && !user.is_guest && loadProfile(user),
  };
  const spaceValue = {
    spaces,
    activeSpace,
    activeSpaceId,
    spacesLoading,
    setActiveSpaceId,
    createSpace,
    refreshSpaces: () => user && !user.is_guest && loadSpaces(user),
    syncStatus,
    pendingCount,
    syncNow,
    canManageSpace: activeSpace?.role === 'admin',
    canWriteTransactions: ['admin', 'collaborator'].includes(activeSpace?.role),
  };

  return (
    <AuthContext.Provider value={authValue}>
      <SpaceContext.Provider value={spaceValue}>{children}</SpaceContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useSpace() {
  return useContext(SpaceContext);
}
