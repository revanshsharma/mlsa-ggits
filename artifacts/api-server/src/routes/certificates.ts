import { Router, type IRouter } from "express";
import { getFirestoreDb } from "../lib/firebaseAdmin";

type CertificateDoc = {
  id: string;
  name: string;
  course: string;
  date: string;
};

const router: IRouter = Router();

router.get("/certificates/verify", async (req, res) => {
  const idParam = req.query.id;
  const id = typeof idParam === "string" ? idParam.trim() : "";

  if (!id) {
    res.status(400).json({ error: "Missing certificate id" });
    return;
  }

  try {
    const db = getFirestoreDb();
    const docRef = db.collection("certificates").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      res.json({ valid: false });
      return;
    }

    const data = snapshot.data() as Partial<CertificateDoc> | undefined;

    res.json({
      valid: true,
      data: {
        name: data?.name ?? "",
        course: data?.course ?? "",
        date: data?.date ?? "",
      },
    });
  } catch (err) {
    req.log.error({ err, certificateId: id }, "Failed to verify certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
