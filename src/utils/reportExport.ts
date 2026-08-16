import * as XLSXNS from 'xlsx-js-style';
import * as jsPDFNS from 'jspdf';
import * as autoTableNS from 'jspdf-autotable';

// Normalize CJS/ESM interop so the exports are always reachable (Vite & Node).
const XLSX = (XLSXNS as any).default ?? XLSXNS;
const { jsPDF } = jsPDFNS as any;
const autoTable = (autoTableNS as any).default ?? (autoTableNS as any).default_ ?? autoTableNS;

// ── Brand palette (matches the Azhar Residence dashboard) ────────────────
const C = {
  teal: '29B4C4',
  tealDark: '0E7A86',
  slate: '1E293B',
  slateDark: '0F172A',
  text: '334155',
  zebra: 'F1F5F9',
  border: 'CBD5E1',
  white: 'FFFFFF',
};

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'text' | 'number' | 'currency' | 'date';
  align?: 'left' | 'center' | 'right';
}

export interface ReportExportOptions {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, string | number>;
  sheetName?: string;
  filename: string;
  footerNote?: string;
}

const cellValue = (row: Record<string, unknown>, col: ReportColumn) => {
  const v = row[col.key];
  if (v === null || v === undefined) return '';
  if (col.type === 'currency' || col.type === 'number') return typeof v === 'number' ? v : Number(v);
  if (col.type === 'date' && typeof v === 'string' && v.length > 10) return v.slice(0, 10);
  return v;
};

const formatPdf = (v: unknown, type?: ReportColumn['type']) => {
  if (v === '' || v === null || v === undefined) return '';
  if ((type === 'currency' || type === 'number') && typeof v === 'number') {
    return `${v.toLocaleString('en-US')}${type === 'currency' ? ' SR' : ''}`;
  }
  return String(v);
};

// ── Styled Excel (.xlsx) ─────────────────────────────────────────────────
export function exportExcelReport(opts: ReportExportOptions) {
  const nCols = opts.columns.length;
  const titleRow = 0;
  const subRow = 1;
  const headRow = 2;
  const totals = opts.totals ? 1 : 0;

  const aoa: unknown[][] = [];
  aoa.push([opts.title]);
  aoa.push([opts.subtitle || `Generated on ${new Date().toLocaleString()}`]);
  aoa.push(opts.columns.map(c => c.header));
  opts.rows.forEach(r => aoa.push(opts.columns.map(c => cellValue(r, c))));
  if (opts.totals) aoa.push(opts.columns.map(c => opts.totals![c.key] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s: { r: titleRow, c: 0 }, e: { r: titleRow, c: nCols - 1 } },
    { s: { r: subRow, c: 0 }, e: { r: subRow, c: nCols - 1 } },
  ];

  ws['!cols'] = opts.columns.map(c => ({ wch: c.width || 12 }));
  ws['!rows'] = [
    { hpt: 26 },
    { hpt: 16 },
    { hpt: 20 },
    ...opts.rows.map(() => ({ hpt: 18 })),
    ...(totals ? [{ hpt: 20 }] : []),
  ];

  const thin = { style: 'thin' as const, color: { rgb: C.border } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };

  const styleCell = (row: number, col: number) => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = ws[addr];
    if (!cell) return;

    if (row === titleRow) {
      cell.s = {
        font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: C.white } },
        fill: { fgColor: { rgb: C.slateDark }, patternType: 'solid' },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
      return;
    }
    if (row === subRow) {
      cell.s = {
        font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: C.text } },
        fill: { fgColor: { rgb: 'E2E8F0' }, patternType: 'solid' },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
      return;
    }
    if (row === headRow) {
      cell.s = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C.white } },
        fill: { fgColor: { rgb: C.teal }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border,
      };
      return;
    }

    const isTotal = totals && row === aoa.length - 1;
    if (isTotal) {
      cell.s = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C.white } },
        fill: { fgColor: { rgb: C.slate }, patternType: 'solid' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border,
      };
      return;
    }

    const colDef = opts.columns[col];
    const zebra = (row - (headRow + 1)) % 2 === 1;
    cell.s = {
      font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
      fill: zebra ? { fgColor: { rgb: C.zebra }, patternType: 'solid' } : undefined,
      alignment: {
        horizontal: colDef.align || (colDef.type === 'currency' || colDef.type === 'number' ? 'right' : 'left'),
        vertical: 'center',
      },
      border,
      ...((colDef.type === 'currency' || colDef.type === 'number') ? { numFmt: '#,##0' } : {}),
    };
  };

  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < nCols; c++) styleCell(r, c);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (opts.sheetName || 'Report').slice(0, 31));
  XLSX.writeFile(wb, opts.filename);
}

// ── Styled PDF (landscape) ───────────────────────────────────────────────
export function exportPDFReport(opts: ReportExportOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(41, 180, 196);
  doc.rect(0, 22, pageW, 1.2, 'F');

  doc.setTextColor(41, 180, 196);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AZHAR RESIDENCE', pageW - 12, 8, { align: 'right' });
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(opts.subtitle || '', pageW - 12, 12.5, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(opts.title, 12, 12);

  // Meta line under the band
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-GB')}  |  Records: ${opts.rows.length}${opts.totals ? '  |  Totals included' : ''}`,
    12,
    28.5
  );

  const head = [opts.columns.map(c => c.header)];
  const body = opts.rows.map(r => opts.columns.map(c => formatPdf(cellValue(r, c), c.type)));
  const foot = opts.totals
    ? [opts.columns.map(c => {
        const v = opts.totals![c.key];
        return v === '' || v === undefined || v === null
          ? ''
          : formatPdf(v, opts.columns.find(x => x.key === c.key)?.type || 'text');
      })]
    : undefined;

  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};
  opts.columns.forEach((c, i) => {
    if (c.align === 'center' || c.type === 'date') columnStyles[i] = { halign: 'center' };
    else if (c.align === 'right' || c.type === 'currency' || c.type === 'number') columnStyles[i] = { halign: 'right' };
  });

  autoTable(doc, {
    startY: 31,
    head,
    body,
    foot,
    theme: 'grid',
    margin: { left: 8, right: 8, bottom: 16 },
    headStyles: {
      fillColor: [41, 180, 196],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.2, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles,
    didDrawPage: (data) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageH - 11, pageW, 11, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text(opts.footerNote || 'Azhar Residence Portal', 10, pageH - 4.5);
      doc.text(`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`, pageW - 10, pageH - 4.5, { align: 'right' });
    },
  });

  doc.save(opts.filename);
}
