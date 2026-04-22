import { doc, getDoc } from "firebase/firestore";
import { getFirestoreClient } from "./firebaseClient";

export type VerifiedCertificate = {
  name: string;
  course: string;
  date: string;
  details: Array<{ label: string; value: string }>;
};

type RawCertificateData = Record<string, unknown>;

const firstStringValue = (data: RawCertificateData, keys: string[]): string => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
};

const normalizeDateValue = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toLocaleDateString();
    }

    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000).toLocaleDateString();
    }
  }

  return "";
};

const humanizeKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeValue = (key: string, value: unknown): string => {
  if (value == null) {
    return "";
  }

  if (["date", "issuedAt", "issuedOn", "awardedAt", "dateIssued", "createdAt"].includes(key)) {
    const normalizedDate = normalizeDateValue(value);
    if (normalizedDate) {
      return normalizedDate;
    }
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof maybeTimestamp.toDate === "function" || typeof maybeTimestamp.seconds === "number") {
      return normalizeDateValue(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
};

export async function verifyCertificateById(id: string): Promise<{
  valid: boolean;
  data?: VerifiedCertificate;
}> {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new Error("Please enter a certificate ID.");
  }

  const db = getFirestoreClient();
  if (!db) {
    throw new Error("Firebase config missing in frontend environment.");
  }

  const snapshot = await getDoc(doc(db, "certificates", trimmedId));
  if (!snapshot.exists()) {
    return { valid: false };
  }

  const raw = snapshot.data() as RawCertificateData;
  const details = Object.entries(raw)
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: normalizeValue(key, value),
    }))
    .filter((entry) => entry.value && !["Name", "Course", "Date"].includes(entry.label));

  return {
    valid: true,
    data: {
      name: firstStringValue(raw, ["name", "fullName", "studentName", "certificateName", "recipientName"]),
      course: firstStringValue(raw, ["course", "courseName", "program", "event", "title"]),
      date: normalizeDateValue(
        raw.date ?? raw.issuedAt ?? raw.issuedOn ?? raw.awardedAt ?? raw.dateIssued ?? raw.createdAt,
      ),
      details,
    },
  };
}
