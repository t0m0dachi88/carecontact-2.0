"use client";
import { useState } from "react";
import { renderMarkdown, generatePDF } from "../../lib/utils";
import { createClient } from "../../lib/supabase";

export default function ReportModal({ report, onClose, onNewSession, sessionId, patientId, patientName }) {
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState(null);
  const supabase = createClient();

  const handleDownload = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // 1. Generate PDF
      const doc     = await generatePDF(report, patientName);
      const pdfBlob = doc.output("blob");
      const filePath = `${patientId}/${sessionId}.pdf`;

      // 2. Upload to Supabase Storage (reports bucket)
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("reports")
        .getPublicUrl(filePath);

      // 4. Update ai_sessions — mark as completed
      await supabase
        .from("ai_sessions")
        .update({ status: "completed", report_url: publicUrl })
        .eq("id", sessionId);

      // 5. Insert into medical_records so it shows in Records page
      const { error: recordError } = await supabase
        .from("medical_records")
        .insert({
          patient_id:  patientId,
          doctor_id:   null,
          type:        "ai_report",
          file_url:    publicUrl,
          description: `AI Pre-Consultation Report — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        });

      if (recordError) {
        // Non-fatal — PDF still saved, just log it
        console.warn("Could not save to medical_records:", recordError.message);
      }

      // 6. Trigger browser download
      doc.save(`CareContact_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      setSaved(true);

    } catch (err) {
      console.error("PDF save error:", err);
      setSaveError(err.message || "Could not save PDF. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center">
              📋
            </div>
            <div>
              <div className="text-base font-bold text-slate-100">Pre-Consultation Report</div>
              <div className="text-xs text-slate-500">Ready for physician review</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">← Back</button>
            <button onClick={handleDownload} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
              {saving ? "Saving..." : saved ? "✅ Saved" : "⬇ Download PDF"}
            </button>
            <button onClick={onNewSession} className="btn-success text-xs px-3 py-1.5">New Session</button>
          </div>
        </div>

        {saveError && (
          <div className="px-6 py-2 bg-red-950/40 border-b border-red-800/40 text-red-400 text-xs">
            ⚠️ {saveError}
          </div>
        )}
        {saved && (
          <div className="px-6 py-2 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-400 text-xs">
            ✅ PDF saved to your account, medical records, and downloaded.
          </div>
        )}

        <div className="modal-body">
          <div className="report-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
        </div>
      </div>
    </div>
  );
}
