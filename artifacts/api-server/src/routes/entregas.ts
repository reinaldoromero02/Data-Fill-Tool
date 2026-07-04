import { Router, type IRouter } from "express";
import { eq, asc, sql, inArray } from "drizzle-orm";
import { db, entregasTable, pool } from "@workspace/db";
import {
  ListEntregasQueryParams,
  ListEntregasResponse,
  CreateEntregaBody,
  CreateEntregaResponse,
  GetEntregaParams,
  GetEntregaResponse,
  UpdateEntregaParams,
  UpdateEntregaBody,
  UpdateEntregaResponse,
  DeleteEntregaParams,
  ReorderEntregasBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/entregas", async (req, res): Promise<void> => {
  const query = ListEntregasQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const date = query.data.date ?? new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(entregasTable)
    .where(eq(entregasTable.date, date))
    .orderBy(asc(entregasTable.sortOrder), asc(entregasTable.id));

  res.json(ListEntregasResponse.parse(rows));
});

router.post("/entregas", async (req, res): Promise<void> => {
  const parsed = CreateEntregaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Determine next sort order for the date
  const existing = await db
    .select({ sortOrder: entregasTable.sortOrder })
    .from(entregasTable)
    .where(eq(entregasTable.date, parsed.data.date))
    .orderBy(asc(entregasTable.sortOrder));

  const maxSort = existing.length > 0
    ? Math.max(...existing.map((r) => r.sortOrder ?? 0))
    : -1;

  const [entrega] = await db
    .insert(entregasTable)
    .values({
      ...parsed.data,
      sortOrder: parsed.data.sortOrder ?? maxSort + 1,
      checked: parsed.data.checked ?? "none",
      nf: parsed.data.nf ?? "none",
      cg: parsed.data.cg ?? "none",
      v: parsed.data.v ?? null,
    })
    .returning();

  res.status(201).json(CreateEntregaResponse.parse(entrega));
});

router.post("/entregas/reorder", async (req, res): Promise<void> => {
  const parsed = ReorderEntregasBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ids } = parsed.data;

  // Validate all IDs exist before applying reorder
  const existing = await db
    .select({ id: entregasTable.id })
    .from(entregasTable)
    .where(inArray(entregasTable.id, ids));

  const existingIds = new Set(existing.map((r) => r.id));
  const invalid = ids.filter((id) => !existingIds.has(id));
  if (invalid.length > 0) {
    res.status(400).json({ error: `IDs not found: ${invalid.join(", ")}` });
    return;
  }

  // Apply reorder in a transaction to keep sort_order consistent
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let index = 0; index < ids.length; index++) {
      await client.query(
        "UPDATE entregas SET sort_order = $1 WHERE id = $2",
        [index, ids[index]]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ success: true });
});

router.get("/entregas/divergencias", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: entregasTable.id,
      date: entregasTable.date,
      cliente: entregasTable.cliente,
      motorista: entregasTable.motorista,
      placa: entregasTable.placa,
      divergencias: entregasTable.divergencias,
    })
    .from(entregasTable)
    .where(sql`${entregasTable.divergencias} IS NOT NULL AND ${entregasTable.divergencias} != ''`)
    .orderBy(asc(entregasTable.date), asc(entregasTable.sortOrder));

  res.json(rows);
});

router.get("/entregas/frete-mensal", async (req, res): Promise<void> => {
  const mes = typeof req.query.mes === "string" ? req.query.mes : new Date().toISOString().slice(0, 7);
  // mes format: YYYY-MM
  const start = `${mes}-01`;
  const end = `${mes}-31`;

  const rows = await db
    .select({
      date: entregasTable.date,
      frete: entregasTable.frete,
    })
    .from(entregasTable)
    .where(
      sql`${entregasTable.date} >= ${start} AND ${entregasTable.date} <= ${end} AND ${entregasTable.frete} IS NOT NULL`
    )
    .orderBy(asc(entregasTable.date));

  // Build summary per frete type
  const tipos = ["RIPACK", "TRANSPORTADORA", "3º", "COLETA"];
  const resumo = tipos.map((tipo) => ({
    frete: tipo,
    total: rows.filter((r) => r.frete === tipo).length,
  }));

  // Build per-day breakdown
  const diasMap = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!diasMap.has(row.date)) diasMap.set(row.date, {});
    const d = diasMap.get(row.date)!;
    d[row.frete!] = (d[row.frete!] ?? 0) + 1;
  }
  const porDia = Array.from(diasMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  res.json({ mes, resumo, porDia });
});

router.get("/entregas/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetEntregaParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entrega] = await db
    .select()
    .from(entregasTable)
    .where(eq(entregasTable.id, params.data.id));

  if (!entrega) {
    res.status(404).json({ error: "Entrega não encontrada" });
    return;
  }

  res.json(GetEntregaResponse.parse(entrega));
});

router.patch("/entregas/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateEntregaParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEntregaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entrega] = await db
    .update(entregasTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(parsed.data as any)
    .where(eq(entregasTable.id, params.data.id))
    .returning();

  if (!entrega) {
    res.status(404).json({ error: "Entrega não encontrada" });
    return;
  }

  res.json(UpdateEntregaResponse.parse(entrega));
});

router.delete("/entregas/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteEntregaParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entrega] = await db
    .delete(entregasTable)
    .where(eq(entregasTable.id, params.data.id))
    .returning();

  if (!entrega) {
    res.status(404).json({ error: "Entrega não encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
