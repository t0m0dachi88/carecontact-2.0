export function extractChatPart(content) {
  const start = content.indexOf("===REPORT_START===");
  if (start === -1) return content;
  return content.slice(0, start).trim();
}

export function extractReport(content) {
  const start = content.indexOf("===REPORT_START===");
  const end   = content.indexOf("===REPORT_END===");
  if (start === -1) return null;
  const raw = end === -1 ? content.slice(start + 18) : content.slice(start + 18, end);
  return raw.trim();
}

export function hasReport(content) {
  return content.includes("===REPORT_START===");
}

export function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm,  '<h1 class="rh1">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="rh2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^---$/gm, '<hr class="rdivider"/>')
    .replace(/^\|[-| :]+\|$/gm, "")
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.slice(1, -1).split("|").map(c => c.trim());
      return `<tr>${cells.map(c => `<td class="rtd">${c}</td>`).join("")}</tr>`;
    })
    .replace(/^\d+\. \*\*(.+?)\*\* - (.+)$/gm,
      '<div class="rdiff"><strong>$1</strong><span> — $2</span></div>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "<br/>").replace(/\n/g, "<br/>");

  html = html.replace(/(<tr>.*?<\/tr>(<br\/>)?)+/gs,
    m => `<table class="rtable">${m.replace(/<br\/>/g, "")}</table>`);
  html = html.replace(/(<li>.*?<\/li>(<br\/>)?)+/gs,
    m => `<ul class="rul">${m.replace(/<br\/>/g, "")}</ul>`);
  return html;
}

export async function generatePDF(reportText, patientName) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const usableW = pageW - margin * 2;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkY  = (needed = 10) => { if (y + needed > pageH - margin) addPage(); };

  doc.setFillColor(13, 27, 46);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(226, 238, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CareConnect — Pre-Consultation Report", pageW / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(147, 197, 253);
  doc.text("AI-assisted pre-screening · Not a diagnosis · For physician review only", pageW / 2, 20, { align: "center" });
  y = 36;

  const lines = reportText.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { y += 3; continue; }
    if (line.startsWith("# ")) {
      checkY(12); doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(13,27,46);
      doc.text(line.slice(2), margin, y); y += 8; continue;
    }
    if (line.startsWith("## ")) {
      checkY(10); doc.setFillColor(240,246,255); doc.rect(margin, y-4, usableW, 8, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(29,78,216);
      doc.text(line.slice(3).toUpperCase(), margin+2, y); y += 7; continue;
    }
    if (line === "---") {
      checkY(6); doc.setDrawColor(191,219,254); doc.line(margin, y, margin+usableW, y); y += 5; continue;
    }
    if (line.startsWith("|") && line.endsWith("|") && !line.match(/^\|[-| :]+\|$/)) {
      const cells = line.slice(1,-1).split("|").map(c=>c.trim());
      const colW  = usableW / cells.length;
      checkY(8); doc.setFontSize(8);
      cells.forEach((cell,i) => {
        doc.setFillColor(i===0?240:248, i===0?246:250, 255);
        doc.rect(margin+i*colW, y-4, colW, 7, "F");
        doc.setDrawColor(191,219,254); doc.rect(margin+i*colW, y-4, colW, 7, "S");
        doc.setTextColor(45,90,78); doc.setFont("helvetica","normal");
        doc.text(cell.length>30?cell.slice(0,28)+"..":cell, margin+i*colW+2, y);
      });
      y += 8; continue;
    }
    if (line.startsWith("- ")) {
      checkY(7); doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(71,85,105);
      const wrapped = doc.splitTextToSize(`• ${line.slice(2).replace(/\*\*(.+?)\*\*/g,"$1")}`, usableW-5);
      wrapped.forEach(l => { checkY(6); doc.text(l, margin+3, y); y += 5.5; }); continue;
    }
    if (/^\d+\./.test(line)) {
      checkY(9); doc.setFillColor(240,246,255); doc.rect(margin, y-4, usableW, 8, "F");
      doc.setDrawColor(59,130,246); doc.rect(margin, y-4, 2, 8, "F");
      doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(13,27,46);
      const wrapped = doc.splitTextToSize(line.replace(/\*\*(.+?)\*\*/g,"$1"), usableW-6);
      wrapped.forEach(l => { checkY(6); doc.text(l, margin+4, y); y += 5.5; }); y += 2; continue;
    }
    checkY(7); doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(71,85,105);
    const wrapped = doc.splitTextToSize(line.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1"), usableW);
    wrapped.forEach(l => { checkY(6); doc.text(l, margin, y); y += 5.5; });
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(148,163,184);
    doc.text(`CareConnect · Page ${i} of ${total} · ${patientName || "Patient"}`, pageW/2, pageH-8, { align:"center" });
  }
  return doc;
}
