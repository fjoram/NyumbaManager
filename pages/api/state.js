import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const [properties, tenants, payments, maintenance] = await Promise.all([
      prisma.property.findMany({ orderBy: { name: "asc" } }),
      prisma.tenant.findMany({ orderBy: { name: "asc" } }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.maintenance.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    res.json({ properties, tenants, payments, maintenance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
