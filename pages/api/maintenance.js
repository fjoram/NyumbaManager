import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const m = req.body;
      if (!m.title) return res.status(400).json({ error: "Issue title is required." });
      const created = await prisma.maintenance.create({
        data: {
          id: m.id,
          propertyId: m.propertyId || "",
          title: m.title,
          status: m.status || "open",
          cost: Number(m.cost) || 0,
          date: m.date || "",
        },
      });
      return res.json(created);
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body;
      const updated = await prisma.maintenance.update({ where: { id }, data: { status } });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      await prisma.maintenance.delete({ where: { id } });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
