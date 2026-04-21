import { doc, getDoc } from "firebase/firestore";
import { getFirestoreClient } from "./firebaseClient";

export type VerifiedCertificate = {
  name: string;
  course: string;
  date: string;
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

  const raw = snapshot.data() as Partial<VerifiedCertificate>;
  return {
    valid: true,
    data: {
      name: raw.name ?? "",
      course: raw.course ?? "",
      date: raw.date ?? "",
    },
  };
}
