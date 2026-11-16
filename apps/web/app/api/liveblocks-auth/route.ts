import { getSessionUser } from "@/lib/auth";
import {
  ensureLiveblocksRoom,
  getLiveblocksClient,
  isAllowedLiveblocksRoom,
} from "@/lib/liveblocks-server";
import {
  LIVEBLOCKS_GUEST_COOKIE,
  resolveLiveblocksActor,
} from "@/lib/liveblocks-user";
import { noStoreHeaders } from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthBody = {
  room?: string;
};

export async function POST(request: Request) {
  const liveblocks = getLiveblocksClient();
  if (!liveblocks) {
    return Response.json(
      { error: "Liveblocks is not configured on this server." },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return Response.json(
      { error: "Invalid Liveblocks auth request." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const room = body.room?.trim();
  if (!room || !isAllowedLiveblocksRoom(room)) {
    return Response.json(
      { error: "Room access is not allowed." },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  const authUser = await getSessionUser(request);
  const actor = resolveLiveblocksActor(request, authUser);

  try {
    await ensureLiveblocksRoom(liveblocks, room);
  } catch {
    return Response.json(
      { error: "Could not prepare the collaboration room." },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const session = liveblocks.prepareSession(actor.id, {
    userInfo: {
      name: actor.name,
      avatar: actor.avatar,
      color: actor.color,
    },
  });

  session.allow(room, ["*:write"]);

  const { status, body: authBody } = await session.authorize();

  const headers = new Headers(noStoreHeaders());
  headers.set("Content-Type", "application/json; charset=utf-8");

  if (actor.guestCookie) {
    const secure = request.url.startsWith("https://");
    headers.append(
      "Set-Cookie",
      `${LIVEBLOCKS_GUEST_COOKIE}=${encodeURIComponent(actor.guestCookie)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`
    );
  }

  return new Response(authBody, { status, headers });
}