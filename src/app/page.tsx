'use client';

import {FormEvent, useEffect, useMemo, useState} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import {getFirebaseClients} from "@/lib/firebase/client";

type Habit = {
  id: string;
  title: string;
  description?: string;
  currentStreak?: number;
  longestStreak?: number;
  lastEntryAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};

type FormState = {
  email: string;
  password: string;
  displayName: string;
};

const initialForm: FormState = {
  email: "",
  password: "",
  displayName: "",
};

const initialHabit = {
  title: "",
  description: "",
};

function formatTimestamp(value?: Timestamp | null) {
  if (!value) return "-";
  try {
    return value.toDate().toLocaleString();
  } catch {
    return "-";
  }
}

export default function HomePage() {
  const firebase = useMemo(() => getFirebaseClients(), []);
  const {auth, firestore} = firebase;

  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState(initialForm);
  const [habitForm, setHabitForm] = useState(initialHabit);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);
    });
    return unsubscribe;
  }, [auth]);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      return;
    }

    setLoadingHabits(true);
    const habitsQuery = query(
      collection(firestore, "habits"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const nextHabits: Habit[] = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            title: data.title ?? "Untitled habit",
            description: data.description ?? "",
            currentStreak: data.currentStreak ?? 0,
            longestStreak: data.longestStreak ?? 0,
            lastEntryAt: data.lastEntryAt ?? null,
            createdAt: data.createdAt ?? null,
          };
        });
        setHabits(nextHabits);
        setLoadingHabits(false);
      },
      (error) => {
        console.error("Failed to load habits", error);
        setHabitError("Failed to load habits. Check console for details.");
        setLoadingHabits(false);
      },
    );

    return unsubscribe;
  }, [firestore, user]);

  const handleAuthInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = event.target;
    setAuthForm((previous) => ({...previous, [name]: value}));
  };

  const handleHabitInput = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = event.target;
    setHabitForm((previous) => ({...previous, [name]: value}));
  };

  const resetAuthForm = () => {
    setAuthForm(initialForm);
  };

  const handleAuthenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    const {email, password, displayName} = authForm;

    try {
      if (isRegistering) {
        const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(credentials.user, {displayName: displayName.trim()});
        }
        await setDoc(
          doc(firestore, "users", credentials.user.uid),
          {
            displayName: displayName.trim() || credentials.user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          {merge: true},
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      resetAuthForm();
    } catch (error: unknown) {
      console.error("Authentication failed", error);
      setAuthError(
        error instanceof Error ? error.message : "Authentication failed. Try again.",
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const handleCreateHabit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHabitError(null);

    if (!user) {
      setHabitError("Sign in to manage habits.");
      return;
    }

    const title = habitForm.title.trim();
    if (!title) {
      setHabitError("Give your habit a title.");
      return;
    }

    try {
      await addDoc(collection(firestore, "habits"), {
        ownerId: user.uid,
        title,
        description: habitForm.description.trim(),
        visibility: "private",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setHabitForm(initialHabit);
    } catch (error: unknown) {
      console.error("Failed to create habit", error);
      setHabitError(
        error instanceof Error ? error.message : "Unable to create habit right now.",
      );
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    setHabitError(null);
    try {
      await deleteDoc(doc(firestore, "habits", habitId));
    } catch (error: unknown) {
      console.error("Failed to delete habit", error);
      setHabitError(
        error instanceof Error ? error.message : "Unable to delete habit.",
      );
    }
  };

  const handleLogEntry = async (habitId: string) => {
    setHabitError(null);
    if (!user) {
      setHabitError("Sign in to log progress.");
      return;
    }

    try {
      const now = serverTimestamp();
      await addDoc(collection(firestore, "habits", habitId, "entries"), {
        performedAt: serverTimestamp(),
      });
      await setDoc(
        doc(firestore, "habits", habitId),
        {updatedAt: now, lastEntryAt: now},
        {merge: true},
      );
    } catch (error: unknown) {
      console.error("Failed to log entry", error);
      setHabitError(
        error instanceof Error ? error.message : "Unable to log this habit.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">FireTrack</h1>
            <p className="text-sm text-slate-400">
              Track habits, maintain streaks, and experiment with Firebase tooling.
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded bg-slate-100 px-3 py-1 text-sm font-medium text-slate-900 transition hover:bg-white"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
        {!user ? (
          <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {isRegistering ? "Create an account" : "Welcome back"}
              </h2>
              <button
                type="button"
                className="text-sm text-slate-300 underline"
                onClick={() => {
                  setIsRegistering((previous) => !previous);
                  setAuthError(null);
                }}
              >
                {isRegistering ? "Already have an account?" : "Need an account?"}
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleAuthenticate}>
              <label className="flex flex-col gap-1 text-sm">
                Email
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={authForm.email}
                  onChange={handleAuthInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Password
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
                  type="password"
                  name="password"
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  minLength={6}
                  required
                  value={authForm.password}
                  onChange={handleAuthInput}
                />
              </label>
              {isRegistering ? (
                <label className="flex flex-col gap-1 text-sm">
                  Display name
                  <input
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
                    type="text"
                    name="displayName"
                    value={authForm.displayName}
                    onChange={handleAuthInput}
                    maxLength={120}
                  />
                </label>
              ) : null}
              {authError ? (
                <p className="rounded bg-red-500/10 p-2 text-sm text-red-200">
                  {authError}
                </p>
              ) : null}
              <button
                className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                type="submit"
              >
                {isRegistering ? "Create account" : "Sign in"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create a habit</h2>
                <span className="text-sm text-slate-400">
                  Signed in as {user.displayName ?? user.email}
                </span>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleCreateHabit}>
                <label className="flex flex-col gap-1 text-sm">
                  Title
                  <input
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
                    name="title"
                    value={habitForm.title}
                    onChange={handleHabitInput}
                    placeholder="Drink water"
                    maxLength={120}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Description
                  <textarea
                    className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
                    name="description"
                    value={habitForm.description}
                    onChange={handleHabitInput}
                    maxLength={500}
                    placeholder="Add context or instructions for the habit."
                  />
                </label>
                {habitError ? (
                  <p className="rounded bg-red-500/10 p-2 text-sm text-red-200">
                    {habitError}
                  </p>
                ) : null}
                <button
                  className="self-start rounded bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                  type="submit"
                >
                  Save habit
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Your habits</h2>
                <p className="text-sm text-slate-400">
                  Schema described in <code>docs/data-model.md</code>
                </p>
              </div>
              {loadingHabits ? (
                <p className="text-sm text-slate-400">Loading habits…</p>
              ) : habits.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No habits yet. Create one above to get started.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="rounded border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">{habit.title}</h3>
                          {habit.description ? (
                            <p className="text-sm text-slate-400">{habit.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Current streak: {habit.currentStreak ?? 0}</span>
                          <span>Longest streak: {habit.longestStreak ?? 0}</span>
                        </div>
                      </div>
                      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-3">
                        <div>
                          <dt className="uppercase tracking-wide text-slate-500">
                            Created
                          </dt>
                          <dd>{formatTimestamp(habit.createdAt ?? null)}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-slate-500">
                            Last log
                          </dt>
                          <dd>{formatTimestamp(habit.lastEntryAt ?? null)}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded bg-emerald-400 px-3 py-1 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300"
                          onClick={() => void handleLogEntry(habit.id)}
                        >
                          Log today&apos;s progress
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-500/50 px-3 py-1 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                          onClick={() => void handleDeleteHabit(habit.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="border-t border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} FireTrack experiments</span>
          <div className="flex gap-3">
            <Link
              className="underline"
              href="https://firebase.google.com/docs/emulator-suite"
              target="_blank"
              rel="noreferrer"
            >
              Emulator docs
            </Link>
            <Link
              className="underline"
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noreferrer"
            >
              Next.js docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
