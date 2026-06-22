import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Payload {
  to: string;
  studentName: string;
  organization: string;
  activity: string;
  hours: number;
  date: string;
  location: string;
  description?: string | null;
  proofUrl?: string | null;
  proofFileName?: string | null;
  verificationToken: string;
  appOrigin: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body: Payload = await req.json();
    const required = ["to", "studentName", "organization", "activity", "verificationToken", "appOrigin"];
    for (const k of required) {
      if (!body[k as keyof Payload]) {
        return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const verifyUrl = `${body.appOrigin}/guest-verify?token=${body.verificationToken}`;
    const studentName = escapeHtml(body.studentName);
    const organization = escapeHtml(body.organization);
    const activity = escapeHtml(body.activity);
    const date = escapeHtml(body.date);
    const location = escapeHtml(body.location);
    const description = body.description ? escapeHtml(body.description) : "";
    const proofFileName = body.proofFileName ? escapeHtml(body.proofFileName) : "View attached proof";

    const proofBlock = body.proofUrl
      ? `
        <tr><td style="padding:0 32px 8px;">
          <div style="background:#0f172a;border:1px dashed #fb7c4c;border-radius:10px;padding:14px 16px;font-size:14px;">
            <div style="color:#fb7c4c;font-weight:700;margin-bottom:6px;">📎 Proof of Hours Submitted by Student</div>
            <a href="${body.proofUrl}" style="color:#fb7c4c;word-break:break-all;text-decoration:underline;" target="_blank" rel="noopener">${proofFileName}</a>
            <div style="color:#94a3b8;font-size:12px;margin-top:6px;">Click the link above to view the file the student attached as proof. Link valid for 14 days.</div>
          </div>
        </td></tr>`
      : `
        <tr><td style="padding:0 32px 8px;">
          <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 16px;font-size:13px;color:#94a3b8;">
            No proof file was attached by the student.
          </div>
        </td></tr>`;

    const descriptionRow = description
      ? `<tr><td style="padding:6px 0;"><strong>Notes from student:</strong> ${description}</td></tr>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#1e293b;border-radius:14px;overflow:hidden;border:1px solid #334155;">
        <tr><td style="padding:32px 32px 8px;">
          <h1 style="margin:0;color:#fb7c4c;font-size:22px;font-weight:700;">Action Required: Verify Volunteer Hours</h1>
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.6;">
          <p>Hello,</p>
          <p><strong>${studentName}</strong> has submitted volunteer hours and listed your organization as the supervisor. Please review the details and the attached proof, then confirm whether they are accurate.</p>
        </td></tr>
        <tr><td style="padding:16px 32px 8px;">
          <table width="100%" style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;font-size:14px;">
            <tr><td style="padding:6px 0;"><strong>Student:</strong> ${studentName}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Organization:</strong> ${organization}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Activity:</strong> ${activity}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Hours:</strong> ${body.hours}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Date:</strong> ${date}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Location:</strong> ${location}</td></tr>
            ${descriptionRow}
          </table>
        </td></tr>
        ${proofBlock}
        <tr><td align="center" style="padding:16px 32px 32px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#fb7c4c;color:#0f172a;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:15px;">Verify Hours</a>
          <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">Or copy this link:<br/><a href="${verifyUrl}" style="color:#fb7c4c;word-break:break-all;">${verifyUrl}</a></p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#64748b;margin-top:16px;">If you do not recognize this request, you can safely ignore this email.</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Volunteer Hours <onboarding@resend.dev>",
        to: [body.to],
        subject: `Action Required: Verify Volunteer Hours for ${body.studentName}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data?.message || "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-org-verification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
