// Supabase Edge Function: birthday-api
// Set BIRTHDAY_GUEST_PIN, BIRTHDAY_ADMIN_PIN and SUPABASE_SERVICE_ROLE_KEY as secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { pin, action, payload = {} } = await req.json();
    const guestPin = Deno.env.get("BIRTHDAY_GUEST_PIN") ?? "";
    const adminPin = Deno.env.get("BIRTHDAY_ADMIN_PIN") ?? "";
    const role = pin === adminPin && adminPin ? "admin" : pin === guestPin && guestPin ? "guest" : "";
    if (!role) return json({ error: "كلمة المرور غير صحيحة." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "get") {
      const { data, error } = await supabase.from("birthday_content").select("content").eq("id", 1).single();
      if (error) throw error;
      return json({ role, content: data.content });
    }

    if (role !== "admin") return json({ error: "غير مسموح." }, 403);

    if (action === "save") {
      const content = payload.content;
      if (!content || typeof content !== "object") return json({ error: "بيانات غير صالحة." }, 400);
      const safe = {
        subtitle: String(content.subtitle ?? "").slice(0, 500),
        letter: String(content.letter ?? "").slice(0, 12000),
        photos: Array.isArray(content.photos) ? content.photos.slice(0, 80) : [],
        tracks: Array.isArray(content.tracks) ? content.tracks.slice(0, 40) : [],
      };
      const { error } = await supabase.from("birthday_content")
        .upsert({ id: 1, content: safe, updated_at: new Date().toISOString() });
      if (error) throw error;
      return json({ content: safe });
    }

    if (action === "upload") {
      const { kind, name, mime, base64, title } = payload;
      if (!["photos", "tracks"].includes(kind)) return json({ error: "نوع ملف غير مدعوم." }, 400);
      if (typeof base64 !== "string" || base64.length > 22_000_000) return json({ error: "الملف كبير جدًا." }, 413);
      const allowed = kind === "photos" ? /^image\/(jpeg|png|webp|gif)$/ : /^audio\/(mpeg|mp4|aac|ogg|wav|webm)$/;
      if (!allowed.test(String(mime))) return json({ error: "صيغة الملف غير مدعومة." }, 400);
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const ext = (String(name).split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("birthday-media")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("birthday-media").getPublicUrl(path);
      return json({ url: data.publicUrl, path, title: String(title ?? "").slice(0, 180) });
    }

    if (action === "delete") {
      const path = String(payload.path ?? "");
      if (!/^(photos|tracks)\/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(path)) return json({ error: "مسار غير صالح." }, 400);
      const { error } = await supabase.storage.from("birthday-media").remove([path]);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Action not found." }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "حصل خطأ في السيرفر. راجع إعدادات Supabase." }, 500);
  }
});
