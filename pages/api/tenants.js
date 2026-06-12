import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const t = req.body;
      if (!t.name) return res.status(400).json({ error: "Tenant name is required." });
      if (!t.leaseStart) return res.status(400).json({ error: "Lease start date is required." });
      if (!t.leaseEnd) return res.status(400).json({ error: "Lease end date is required." });
      if (t.leaseEnd <= t.leaseStart)
        return res.status(400).json({ error: "Lease end month must be after the lease start month." });

      if (t.propertyId) {
        const existing = await prisma.tenant.findFirst({
          where: { propertyId: t.propertyId, status: "active" },
        });
        if (existing && existing.id !== t.id)
          return res.status(400).json({ error: `This property is already occupied by ${existing.name}.` });
      }

      const data = {
        name: t.name,
        phone: t.phone || "",
        propertyId: t.propertyId || "",
        leaseStart: t.leaseStart,
        leaseEnd: t.leaseEnd,
        status: "active",
        exitReason: "",
        exitDate: "",
      };
      const saved = await prisma.tenant.upsert({
        where: { id: t.id },
        update: data,
        create: { id: t.id, ...data },
      });
      return res.json(saved);
    }

    // Remove a tenant (mark as removed, keep record)
    if (req.method === "PATCH") {
      const { id, exitReason, exitDate } = req.body;
      if (!id) return res.status(400).json({ error: "Tenant id is required." });
      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          status: "removed",
          exitReason: exitReason || "other",
          exitDate: exitDate || "",
          propertyId: "",
        },
      });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      await prisma.tenant.delete({ where: { id } });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
