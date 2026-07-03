import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Entrega } from "@workspace/api-client-react";

interface PrintViewProps {
  entregas: Entrega[];
  date: string;
}

const EMPTY_ROWS = 8;

export function PrintView({ entregas, date }: PrintViewProps) {
  const parsedDate = new Date(date + "T12:00:00");
  const dayLabel = format(parsedDate, "dd/MM/yyyy");
  const weekDay = format(parsedDate, "EEEE", { locale: ptBR }).toUpperCase();

  const sortedEntregas = [...entregas].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });

  const extraRows = Math.max(EMPTY_ROWS, EMPTY_ROWS - sortedEntregas.length);
  const emptyRows = Array.from({ length: extraRows });

  return (
    <div className="print-page">
      {/* Top header matching the spreadsheet */}
      <table className="print-table print-header-table">
        <tbody>
          <tr>
            <td className="print-date-cell" rowSpan={2}>
              <div className="print-date-day">{dayLabel}</div>
              <div className="print-date-week">{weekDay}</div>
            </td>
            <td className="print-title-cell" colSpan={8}>
              PROGRAMAÇÃO DE ENTREGA
            </td>
          </tr>
        </tbody>
      </table>

      {/* Main delivery table */}
      <table className="print-table print-data-table">
        <thead>
          <tr className="print-header-row">
            <th className="print-th print-th-s">S</th>
            <th className="print-th print-th-cliente">CLIENTE</th>
            <th className="print-th print-th-hrs">HRS</th>
            <th className="print-th print-th-obs">OBS</th>
            <th className="print-th print-th-motorista">MOTORISTA • PLACA</th>
            <th className="print-th print-th-v">V</th>
            <th className="print-th print-th-unidade">UNIDADE</th>
            <th className="print-th print-th-nf">NF</th>
            <th className="print-th print-th-cg">CG</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntregas.map((e) => (
            <tr key={e.id} className="print-data-row">
              <td className="print-td print-td-center">
                {e.checked && <span className="print-check">✓</span>}
              </td>
              <td className="print-td print-td-cliente">{e.cliente}</td>
              <td className={`print-td print-td-center${e.hrs ? " print-yellow" : ""}`}>
                {e.hrs ?? ""}
              </td>
              <td className="print-td">{e.obs ?? ""}</td>
              <td className="print-td print-td-motorista">
                {e.motorista && e.placa
                  ? `${e.motorista} • ${e.placa}`
                  : e.motorista ?? e.placa ?? ""}
              </td>
              <td className={`print-td print-td-center${e.v === "2A" ? " print-blue" : ""}`}>
                {e.v === "2A" ? "2ª" : ""}
              </td>
              <td className="print-td print-td-center">{e.unidade}</td>
              <td className={`print-td print-td-center${e.nf ? " print-green" : ""}`} />
              <td className={`print-td print-td-center${e.cg ? " print-green" : ""}`} />
            </tr>
          ))}

          {/* Empty rows at the bottom */}
          {emptyRows.map((_, i) => (
            <tr key={`empty-${i}`} className="print-data-row print-empty-row">
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
              <td className="print-td" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
