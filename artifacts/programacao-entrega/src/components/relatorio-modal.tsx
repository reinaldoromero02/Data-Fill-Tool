import { useState, useEffect } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Divergencia {
  id: number;
  date: string;
  cliente: string;
  motorista: string | null;
  placa: string | null;
  divergencias: string;
}

export function RelatorioModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Divergencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError(null);
    fetch("/api/entregas/divergencias")
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(setData)
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Erro ao carregar divergências");
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const exportExcel = () => {
    const rows = [
      ["DATA", "CLIENTE", "MOTORISTA", "PLACA", "DIVERGÊNCIAS"],
      ...data.map((d) => [
        d.date,
        d.cliente,
        d.motorista ?? "",
        d.placa ?? "",
        d.divergencias,
      ]),
    ];
    const xml = rows
      .map(
        (row) =>
          "<Row>" +
          row
            .map(
              (cell) =>
                `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`
            )
            .join("") +
          "</Row>"
      )
      .join("");

    const ss = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Divergencias">
  <Table>${xml}</Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([ss], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `divergencias_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-slate-700 border-slate-300 hover:bg-slate-100"
        >
          <FileText className="w-4 h-4" />
          RELATÓRIO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            Relatório de Divergências
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-500 text-center py-8">
            {fetchError}
          </p>
        ) : data.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8 italic">
            Nenhuma divergência registrada.
          </p>
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
                  {data.map((d) => (
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
              <Button
                size="sm"
                onClick={exportExcel}
                className="gap-2 bg-green-700 hover:bg-green-800 text-white"
              >
                <Download className="w-4 h-4" />
                Exportar para Excel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
