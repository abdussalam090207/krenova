import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface StatsData {
  clients: string;
  likes: number;
  comments: number;
  visitors: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const VISITORS_FILE = path.join(DATA_DIR, "visitors.json");

function getLocalVisitors(): Set<string> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(VISITORS_FILE)) {
      const content = fs.readFileSync(VISITORS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        return new Set(list);
      }
    }
  } catch (err) {
    console.error("[stats] Error reading visitors file:", err);
  }
  return new Set();
}

function saveLocalVisitors(visitors: Set<string>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(VISITORS_FILE, JSON.stringify(Array.from(visitors)), "utf-8");
  } catch (err) {
    console.error("[stats] Error saving visitors file:", err);
  }
}

async function getStats(): Promise<StatsData> {
  let totalLikes = 0;
  let totalComments = 0;
  let visitorCount = 0;

  try {
    const sb = createSupabaseServerClient();

    // 1. Ambil total like dan total komentar dari tabel projects
    const { data: projects, error: projErr } = await sb
      .from("projects")
      .select("like_count, comment_count");

    if (!projErr && projects) {
      totalLikes = projects.reduce((acc, p) => acc + (Number(p.like_count) || 0), 0);
      totalComments = projects.reduce((acc, p) => acc + (Number(p.comment_count) || 0), 0);
    }

    // 2. Coba hitung visitor dari tabel site_visitors jika tersedia di Supabase
    const { count, error: countErr } = await sb
      .from("site_visitors")
      .select("*", { count: "exact", head: true });

    if (!countErr && typeof count === "number") {
      visitorCount = count;
    } else {
      // Fallback ke penyimpanan lokal
      const local = getLocalVisitors();
      visitorCount = local.size;
    }
  } catch (err) {
    console.error("[stats] Error fetching stats:", err);
    const local = getLocalVisitors();
    visitorCount = local.size;
  }

  // Jika pengunjung masih 0 (baru pertama), tampilkan minimal 1 jika ada visitor lokal
  if (visitorCount === 0) {
    const local = getLocalVisitors();
    visitorCount = Math.max(local.size, 1);
  }

  return {
    clients: "58+",
    likes: totalLikes,
    comments: totalComments,
    visitors: visitorCount,
  };
}

export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const visitorId = body.visitorId;

    if (
      visitorId &&
      typeof visitorId === "string" &&
      visitorId.length <= 64 &&
      /^[a-zA-Z0-9_-]+$/.test(visitorId)
    ) {
      // 1. Simpan ke Supabase jika tabel site_visitors sudah dibuat
      try {
        const sb = createSupabaseServerClient();
        await sb.from("site_visitors").insert({ visitor_id: visitorId });
      } catch {
        /* noop jika tabel belum ada di Supabase */
      }

      // 2. Simpan juga ke local storage sebagai backup
      const local = getLocalVisitors();
      local.add(visitorId);
      saveLocalVisitors(local);
    }
  } catch (err) {
    console.error("[stats] POST error:", err);
  }

  const stats = await getStats();
  return NextResponse.json(stats);
}
