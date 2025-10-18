/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

initializeApp();
const db = getFirestore();
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Return an ISO-8601 date key (yyyy-mm-dd) based on a JS Date.
 * @param {Date} date - Source date.
 * @return {string} ISO formatted date key.
 */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Convert a date key into a UTC midnight timestamp for easy day math.
 * @param {string} dateKey - ISO date key (yyyy-mm-dd).
 * @return {number} UTC timestamp at midnight.
 */
function toUtc(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/**
 * Calculate the current streak length from a descending list of date keys.
 * @param {string[]} dateKeys - Date keys sorted desc (newest first).
 * @return {number} Current streak length.
 */
function computeCurrentStreak(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const todayKey = toDateKey(new Date());
  const todayUtc = toUtc(todayKey);
  const firstUtc = toUtc(dateKeys[0]);
  const diffToday = Math.round((todayUtc - firstUtc) / DAY_MS);
  if (diffToday > 1) {
    return 0;
  }

  let streak = 1;
  let previousUtc = firstUtc;
  for (let index = 1; index < dateKeys.length; index += 1) {
    const currentUtc = toUtc(dateKeys[index]);
    const diff = Math.round((previousUtc - currentUtc) / DAY_MS);
    if (diff === 0) {
      continue;
    }
    if (diff === 1) {
      streak += 1;
      previousUtc = currentUtc;
      continue;
    }
    break;
  }
  return streak;
}

/**
 * Calculate the longest streak across the provided date keys.
 * @param {string[]} dateKeys - Date keys sorted desc (newest first).
 * @return {number} Longest streak length.
 */
function computeLongestStreak(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;

  let longest = 0;
  let run = 0;
  let previousUtc: number | null = null;

  for (const key of dateKeys) {
    const currentUtc = toUtc(key);
    if (previousUtc === null) {
      run = 1;
      longest = Math.max(longest, run);
      previousUtc = currentUtc;
      continue;
    }

    const diff = Math.round((previousUtc - currentUtc) / DAY_MS);
    if (diff === 0) {
      continue;
    }

    if (diff === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previousUtc = currentUtc;
  }

  return longest;
}

export const calculateStreaks = onRequest(async (_req, res) => {
  const habitsSnapshot = await db.collection("habits").get();
  let processed = 0;

  for (const habitDoc of habitsSnapshot.docs) {
    const entriesSnapshot = await habitDoc.ref
      .collection("entries")
      .orderBy("performedAt", "desc")
      .limit(120)
      .get();

    const dateKeys: string[] = [];

    for (const entryDoc of entriesSnapshot.docs) {
      const performedAt = entryDoc.get("performedAt");
      if (performedAt instanceof Timestamp) {
        const key = toDateKey(performedAt.toDate());
        if (dateKeys[dateKeys.length - 1] !== key) {
          dateKeys.push(key);
        }
      }
    }

    const currentStreak = computeCurrentStreak(dateKeys);
    const longestStreakCandidate = computeLongestStreak(dateKeys);
    const previousLongest = Number(habitDoc.get("longestStreak") ?? 0);
    const longestStreak = Math.max(previousLongest, longestStreakCandidate);
    const lastEntryAt = entriesSnapshot.docs[0]?.get("performedAt") ?? null;

    await habitDoc.ref.set(
      {
        currentStreak,
        longestStreak,
        lastEntryAt,
        updatedAt: Timestamp.now(),
      },
      {merge: true},
    );

    processed += 1;
  }

  logger.info("Streak calculation complete", {processed});
  res.json({processed});
});
