import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const p = req.body;
      const data = {
        name: p.name || "",
        address: p.address || "",
        type: p.type || "House",
        rent: Number(p.rent) || 0,
      };
      const saved = await prisma.property.upsert({
        where: { id: p.id },
        update: data,
        create: { id: p.id, ...data },
      });
      return res.json(saved);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      // unassign any tenant living in this property, then delete it
      await prisma.tenant.updateMany({ where: { propertyId: id }, data: { propertyId: "" } });
      await prisma.property.delete({ where: { id } });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
