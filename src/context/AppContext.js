import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection, doc, query, where, onSnapshot,
  addDoc, setDoc, updateDoc, deleteDoc, getDoc,
  serverTimestamp, documentId,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { PRAYERS, newChild } from '../constants';

const AppContext = createContext(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0];

const nDaysAgoKey = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

const calcStreak = (logs = {}) => {
  const todayK = todayKey();
  const todayAllDone = PRAYERS.every(p => (logs[todayK] || {})[p.id]);
  let streak = 0;
  const startOffset = todayAllDone ? 0 : 1;
  for (let i = startOffset; i < 366; i++) {
    const k = nDaysAgoKey(i);
    if (PRAYERS.every(p => (logs[k] || {})[p.id])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

const calcPoints = (logs = {}) =>
  Object.values(logs).reduce((sum, day) => sum + PRAYERS.filter(p => day[p.id]).length, 0);

// ─── Invite Code ──────────────────────────────────────────────────────────────
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children: nodes }) {
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [parentData, setParentData] = useState(null);
  const [children, setChildren] = useState([]);
  const [prayerLogs, setPrayerLogs] = useState({}); // { childId: { dateStr: { fajr, ... } } }

  // ─── App-level auth status (drives navigator conditional screens) ────────────
  // 'loading' | 'parent' | 'child' | 'none'
  const [appStatus, setAppStatus] = useState('loading');
  const [savedChildId, setSavedChildId] = useState(null);

  // Track active Firestore unsubscribers so we can clean them up
  const logUnsubs = useRef([]);

  // ─── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setAuthUser(user ?? null);
      if (user) {
        await AsyncStorage.setItem('@pq/mode', 'parent');
        setAppStatus('parent');
      } else {
        const [mode, childId] = await Promise.all([
          AsyncStorage.getItem('@pq/mode'),
          AsyncStorage.getItem('@pq/childId'),
        ]);
        if (mode === 'child' && childId) {
          setSavedChildId(childId);
          setAppStatus('child');
        } else {
          if (mode === 'parent') await AsyncStorage.removeItem('@pq/mode');
          setAppStatus('none');
        }
      }
    });
  }, []);

  // Called by ChildJoinScreen after verifying an invite code
  const setChildSession = useCallback(async (childId) => {
    await AsyncStorage.setItem('@pq/mode', 'child');
    await AsyncStorage.setItem('@pq/childId', childId);
    setSavedChildId(childId);
    setAppStatus('child');
  }, []);

  // ─── Parent data listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) { setParentData(null); return; }
    return onSnapshot(doc(db, 'users', authUser.uid), snap => {
      if (snap.exists()) setParentData(snap.data());
    });
  }, [authUser]);

  // ─── Children listener (parent mode) ───────────────────────────────────────
  useEffect(() => {
    if (!authUser) {
      // Not logged in as parent — don't wipe children (child mode may have set them)
      return;
    }
    const q = query(collection(db, 'children'), where('parentId', '==', authUser.uid));
    const unsub = onSnapshot(q, snap => {
      setChildren(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [authUser]);

  // ─── Prayer log listeners (last 30 days) per child ─────────────────────────
  const childIds = children.map(c => c.id).join(',');
  useEffect(() => {
    // Clean up previous listeners
    logUnsubs.current.forEach(u => u());
    logUnsubs.current = [];

    if (children.length === 0) return;

    const thirtyDaysAgo = nDaysAgoKey(30);

    children.forEach(child => {
      const q = query(
        collection(db, 'prayerLogs', child.id, 'days'),
        where(documentId(), '>=', thirtyDaysAgo),
      );
      const unsub = onSnapshot(q, snap => {
        const logs = {};
        snap.forEach(d => { logs[d.id] = d.data(); });
        setPrayerLogs(prev => ({ ...prev, [child.id]: logs }));
      });
      logUnsubs.current.push(unsub);
    });

    return () => {
      logUnsubs.current.forEach(u => u());
      logUnsubs.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIds]);

  // ─── Child mode: load a single child by ID (no parent auth) ────────────────
  const loadChildById = useCallback(async (childId) => {
    // Already loaded
    if (children.some(c => c.id === childId)) return;
    const snap = await getDoc(doc(db, 'children', childId));
    if (snap.exists()) {
      setChildren([{ id: snap.id, ...snap.data() }]);
    }
  }, [children]);

  // ─── Firestore mutations ────────────────────────────────────────────────────

  const togglePrayer = useCallback(async (childId, prayerId) => {
    const today = todayKey();
    const logRef = doc(db, 'prayerLogs', childId, 'days', today);
    const current = prayerLogs[childId]?.[today] || {};
    await setDoc(logRef, {
      ...current,
      [prayerId]: !current[prayerId],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [prayerLogs]);

  const addChild = useCallback(async () => {
    if (!authUser) return null;
    const idx = children.length;
    const base = newChild(idx);
    const inviteCode = generateInviteCode();
    const childData = {
      ...base,
      id: undefined, // Firestore will generate the ID
      parentId: authUser.uid,
      inviteCode,
      createdAt: serverTimestamp(),
    };
    delete childData.id;
    const ref = await addDoc(collection(db, 'children'), childData);
    // Store invite code index
    await setDoc(doc(db, 'inviteCodes', inviteCode), {
      childId: ref.id,
      parentId: authUser.uid,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, [authUser, children.length]);

  const updateChild = useCallback(async (childId, updates) => {
    await updateDoc(doc(db, 'children', childId), updates);
  }, []);

  const updateChildRewards = useCallback(async (childId, rewards) => {
    await updateDoc(doc(db, 'children', childId), { rewards });
  }, []);

  const removeChild = useCallback(async (childId) => {
    await deleteDoc(doc(db, 'children', childId));
  }, []);

  // ─── Derived helpers ────────────────────────────────────────────────────────
  const getTodayLog = useCallback(
    (childId) => prayerLogs[childId]?.[todayKey()] || {},
    [prayerLogs],
  );

  const getStreak = useCallback(
    (childId) => calcStreak(prayerLogs[childId]),
    [prayerLogs],
  );

  const getPoints = useCallback(
    (childId) => calcPoints(prayerLogs[childId]),
    [prayerLogs],
  );

  const getCompleteDays = useCallback((childId) => {
    const logs = prayerLogs[childId] || {};
    return Object.values(logs).filter(day => PRAYERS.every(p => day[p.id])).length;
  }, [prayerLogs]);

  // ─── State exposed ──────────────────────────────────────────────────────────
  const api = useMemo(() => ({
    state: { authUser, parentData, children, prayerLogs },
    appStatus,
    savedChildId,
    setChildSession,
    authUser,
    parentData,
    loadChildById,
    togglePrayer,
    addChild,
    updateChild,
    updateChildRewards,
    removeChild,
    getTodayLog,
    getStreak,
    getPoints,
    getCompleteDays,
  }), [
    authUser, parentData, children, prayerLogs,
    appStatus, savedChildId, setChildSession,
    loadChildById, togglePrayer, addChild,
    updateChild, updateChildRewards, removeChild,
    getTodayLog, getStreak, getPoints, getCompleteDays,
  ]);

  return <AppContext.Provider value={api}>{nodes}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
