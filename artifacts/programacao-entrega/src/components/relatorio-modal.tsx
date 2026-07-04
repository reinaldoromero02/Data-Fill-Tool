import { useState, useEffect } from "react";
import { FileText, Download, Loader2, BarChart2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Divergencia {
  id: number;
  date: string;
  cliente: string;
  motorista: string | null;
  placa: string | null;
  divergencias: string;
}

interface FreteResumo {
  frete: string;
  total: number;
}

interface FretePorDia {
  date: string;
  RIPACK?: number;
  TRANSPORTADORA?: number;
  "3º"?: number;
  COLETA?: number;
}

interface FreteMensalData {
  mes: string;
  resumo: FreteResumo[];
  porDia: FretePorDia[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRETE_CORES: Record<string, string> = {
  RIPACK: "#16a34a",
  TRANSPORTADORA: "#2563eb",
  "3º": "#d97706",
  COLETA: "#7c3aed",
};

const TIPOS = ["RIPACK", "TRANSPORTADORA", "3º", "COLETA"];

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

function mesLabel(mes: string) {
  const [ano, num] = mes.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(num) - 1]} ${ano}`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function localToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}
function localMes() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
}
function localAno() { return String(new Date().getFullYear()); }

type FiltroTipo = "dia" | "mes" | "ano";

// ─── Divergencias tab ─────────────────────────────────────────────────────────

function DivergenciasTab() {
  const [data, setData] = useState<Divergencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // filter state
  const [filtro, setFiltro] = useState<FiltroTipo>("mes");
  const [dia, setDia] = useState(localToday);
  const [mes, setMes] = useState(localMes);
  const [ano, setAno] = useState(localAno);

  useEffect(() => {
    setLoading(true);
    fetch("/api/entregas/divergencias")
      .then((r) => { if (!r.ok) throw new Error(`Erro ${r.status}`); return r.json(); })
      .then(setData)
      .catch((err: unknown) => setFetchError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  // client-side filter
  const filtered = data.filter((d) => {
    if (filtro === "dia") return d.date === dia;
    if (filtro === "mes") return d.date.startsWith(mes);
    return d.date.startsWith(ano);
  });

  // month nav (timezone-safe)
  const prevMes = () => {
    const [a, m] = mes.split("-").map(Number);
    const p = m === 1 ? 12 : m - 1;
    setMes(`${m === 1 ? a - 1 : a}-${String(p).padStart(2,"0")}`);
  };
  const nextMes = () => {
    const [a, m] = mes.split("-").map(Number);
    const p = m === 12 ? 1 : m + 1;
    setMes(`${m === 12 ? a + 1 : a}-${String(p).padStart(2,"0")}`);
  };

  const exportExcel = () => {
    const rows = [
      ["DATA", "CLIENTE", "MOTORISTA", "PLACA", "DIVERGÊNCIAS"],
      ...filtered.map((d) => [d.date, d.cliente, d.motorista ?? "", d.placa ?? "", d.divergencias]),
    ];
    const xml = rows.map((row) =>
      "<Row>" + row.map((cell) =>
        `<Cell><Data ss:Type="String">${String(cell).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</Data></Cell>`
      ).join("") + "</Row>"
    ).join("");
    const ss = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Divergencias"><Table>${xml}</Table></Worksheet></Workbook>`;
    const blob = new Blob([ss], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `divergencias_${dia}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  if (fetchError) return <p className="text-sm text-red-500 text-center py-8">{fetchError}</p>;

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 pb-2">
        {/* Tipo selector */}
        <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs font-semibold">
          {(["dia", "mes", "ano"] as FiltroTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filtro === t ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "dia" ? "Dia" : t === "mes" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>

        {/* Dia picker */}
        {filtro === "dia" && (
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {/* Mês navigator */}
        {filtro === "mes" && (
          <div className="flex items-center gap-1">
            <button onClick={prevMes} className="px-2 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">‹</button>
            <span className="text-sm font-semibold text-slate-700 w-24 text-center">{mesLabel(mes)}</span>
            <button onClick={nextMes} className="px-2 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">›</button>
          </div>
        )}

        {/* Ano navigator */}
        {filtro === "ano" && (
          <div className="flex items-center gap-1">
            <button onClick={() => setAno((a) => String(Number(a) - 1))} className="px-2 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">‹</button>
            <span className="text-sm font-semibold text-slate-700 w-14 text-center">{ano}</span>
            <button onClick={() => setAno((a) => String(Number(a) + 1))} className="px-2 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">›</button>
          </div>
        )}

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8 italic">Nenhuma divergência no período selecionado.</p>
      ) : (
        <>
          <div className="flex-1 overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase sticky top-0">
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Motorista</th>
                  <th className="px-3 py-2 text-left">Placa</th>
                  <th className="px-3 py-2 text-left">Divergências</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{d.cliente}</td>
                    <td className="px-3 py-2 text-slate-600">{d.motorista ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono">{d.placa ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{d.divergencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={exportExcel} className="gap-2 bg-green-700 hover:bg-green-800 text-white">
              <Download className="w-4 h-4" />
              Exportar para Excel
            </Button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Frete mensal tab ─────────────────────────────────────────────────────────

function FreteMensalTab() {
  const [mes, setMes] = useState(mesAtual());
  const [data, setData] = useState<FreteMensalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/entregas/frete-mensal?mes=${mes}`)
      .then((r) => { if (!r.ok) throw new Error(`Erro ${r.status}`); return r.json(); })
      .then(setData)
      .catch((err: unknown) => setFetchError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  }, [mes]);

  const prevMes = () => {
    const [ano, num] = mes.split("-").map(Number);
    const p = num === 1 ? 12 : num - 1;
    const a = num === 1 ? ano - 1 : ano;
    setMes(`${a}-${String(p).padStart(2, "0")}`);
  };
  const nextMes = () => {
    const [ano, num] = mes.split("-").map(Number);
    const p = num === 12 ? 1 : num + 1;
    const a = num === 12 ? ano + 1 : ano;
    setMes(`${a}-${String(p).padStart(2, "0")}`);
  };

  const total = data?.resumo.reduce((s, r) => s + r.total, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevMes} className="px-3 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">‹</button>
        <span className="text-sm font-semibold text-slate-700">{mesLabel(mes)}</span>
        <button onClick={nextMes} className="px-3 py-1 rounded border border-slate-300 text-sm hover:bg-slate-100">›</button>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>}
      {fetchError && <p className="text-sm text-red-500 text-center py-8">{fetchError}</p>}

      {data && !loading && (
        <>
          {total === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 italic">Nenhuma entrega com frete registrado em {mesLabel(mes)}.</p>
          ) : (
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Pie chart — totals */}
              <div className="flex flex-col items-center gap-3 w-52 flex-shrink-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total do Mês</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.resumo.filter((r) => r.total > 0)}
                      dataKey="total"
                      nameKey="frete"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ frete, percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                      labelLine={false}
                    >
                      {data.resumo.filter((r) => r.total > 0).map((entry) => (
                        <Cell key={entry.frete} fill={FRETE_CORES[entry.frete] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}`, name as string]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend cards */}
                <div className="w-full flex flex-col gap-1">
                  {data.resumo.map((r) => (
                    <div key={r.frete} className="flex items-center justify-between px-2 py-1 rounded text-xs" style={{ background: FRETE_CORES[r.frete] + "18" }}>
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: FRETE_CORES[r.frete] }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: FRETE_CORES[r.frete] }} />
                        {r.frete}
                      </span>
                      <span className="font-bold text-slate-700">{r.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart — per day */}
              {data.porDia.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Por Dia</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.porDia} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(8)} /* day number */
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        labelFormatter={(v: string) => v}
                      />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      {TIPOS.filter((t) => data.resumo.find((r) => r.frete === t && r.total > 0)).map((tipo) => (
                        <Bar key={tipo} dataKey={tipo} stackId="a" fill={FRETE_CORES[tipo]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Tab = "divergencias" | "frete";

export function RelatorioModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("divergencias");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 text-slate-700 border-slate-300 hover:bg-slate-100">
          <FileText className="w-4 h-4" />
          RELATÓRIO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            Relatórios
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-1 -mx-1 px-1">
          {([
            { key: "divergencias", label: "Divergências", icon: <FileText className="w-3.5 h-3.5" /> },
            { key: "frete", label: "Frete Mensal", icon: <BarChart2 className="w-3.5 h-3.5" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 pt-1">
          {open && tab === "divergencias" && <DivergenciasTab />}
          {open && tab === "frete" && <FreteMensalTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
