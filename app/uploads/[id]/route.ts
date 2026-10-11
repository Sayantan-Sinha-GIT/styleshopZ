import { query } from "@/lib/server/db";
import { uuid } from "@/lib/server/rules";
import { currentUser } from "@/lib/server/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [file] = await query(
      "SELECT mime,data,user_id,private FROM uploads WHERE id=$1",
      [uuid(id)],
    );
    if (!file) return new Response("Not found", { status: 404 });
    if (file.private) {
      const u = await currentUser();
      if (!u || (u.id !== file.user_id && u.role !== "admin"))
        return new Response("Not found", { status: 404 });
    }
    return new Response(Buffer.from(file.data, "base64"), {
      headers: {
        "Content-Type": file.mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
