import {
  getDocs,
  getDoc,
  type Query,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";

/**
 * SWR fetcher for Firestore queries.
 * Returns documents as typed array with id injected.
 */
export async function fetchCollection<T>(q: Query<DocumentData>): Promise<T[]> {
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
}

/**
 * SWR fetcher for a single Firestore document.
 */
export async function fetchDocument<T>(
  ref: DocumentReference<DocumentData>
): Promise<T | null> {
  const docSnap = await getDoc(ref);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}
