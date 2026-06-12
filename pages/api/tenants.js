import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const t = req.body;
      // server-side rule: lease dates are mandatory and must be in order
      if (!t.name) return res.status(400).json({ error: "Tenant name is required." });
      if (!t.leaseStart) return res.status(400).json({ error: "Lease start date is required." });
      if (!t.leaseEnd) return res.status(400).json({ error: "Lease end date is required." });
      if (new Date(t.leaseEnd) <= new Date(t.leaseStart))
        return res.status(400).json({ error: "Lease end date must be after the lease start date." });

      if (t.propertyId) {
        const existing = await prisma.tenant.findFirst({ where: { propertyId: t.propertyId } });
        if (existing && existing.id !== t.id)
          return res.status(400).json({ error: `This property is already occupied by ${existing.name}.` });
      }

      const data = {
        name: t.name,
        phone: t.phone || "",
        propertyId: t.propertyId || "",
        leaseStart: t.leaseStart,
        leaseEnd: t.leaseEnd,
      };
      const saved = await prisma.tenant.upsert({
        where: { id: t.id },
        update: data,
        create: { id: t.id, ...data },
      });
      return res.json(saved);
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
