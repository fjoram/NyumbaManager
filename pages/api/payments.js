import { prisma } from "../../lib/prisma";

// number of months in a lease, capped at 48
function leaseMonthCount(t) {
  if (!t.leaseStart || !t.leaseEnd) return 0;
  let y = Number(t.leaseStart.slice(0, 4));
  let m = Number(t.leaseStart.slice(5, 7));
  const ey = Number(t.leaseEnd.slice(0, 4));
  const em = Number(t.leaseEnd.slice(5, 7));
  let n = 0;
  while ((y < ey || (y === ey && m <= em)) && n < 48) {
    n++;
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return n;
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { records } = req.body; // one record per month covered
      if (!Array.isArray(records) || records.length === 0)
        return res.status(400).json({ error: "No payment records provided." });

      const tenantId = records[0].tenantId;
      const total = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      if (!tenantId) return res.status(400).json({ error: "Select a tenant first." });
      if (total <= 0) return res.status(400).json({ error: "Enter a valid payment amount." });

      // server-side overpayment guard (same rule as the UI)
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return res.status(400).json({ error: "Tenant not found." });
      const prop = tenant.propertyId
        ? await prisma.property.findUnique({ where: { id: tenant.propertyId } })
        : null;

      if (prop && tenant.leaseStart && tenant.leaseEnd) {
        const expected = leaseMonthCount(tenant) * (Number(prop.rent) || 0);
        const agg = await prisma.payment.aggregate({
          where: { tenantId },
          _sum: { amount: true },
        });
        const alreadyPaid = agg._sum.amount || 0;
        const pending = expected - alreadyPaid;
        if (pending <= 0)
          return res.status(400).json({
            error: `${tenant.name} has already FULLY PAID the lease total of ${expected}. Payment not saved.`,
          });
        if (total > pending)
          return res.status(400).json({
            error: `Amount too high. ${tenant.name}'s pending balance is only ${pending}. Payment not saved.`,
          });
      }

      const created = await prisma.$transaction(
        records.map((r) =>
          prisma.payment.create({
            data: {
              id: r.id,
              tenantId: r.tenantId,
              propertyId: r.propertyId || "",
              amount: Number(r.amount) || 0,
              month: r.month,
              method: r.method || "Mobile money",
              datePaid: r.datePaid || "",
              batchId: r.batchId || null,
              batchCount: r.batchCount || null,
            },
          })
        )
      );
      return res.json(created);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      await prisma.payment.delete({ where: { id } });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
