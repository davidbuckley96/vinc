// Edge Function: geocode (V-01/busca de endereço)
//
// Proxy server-side para o Nominatim (OSM). O app chamava o Nominatim DIRETO
// do aparelho, e no 4G isso falha: o IP compartilhado da operadora é
// bloqueado/limitado pela política do Nominatim (que proíbe uso de app) e o
// header User-Agent é ignorado no Android. Aqui a requisição sai de um IP
// estável de servidor, com User-Agent identificável — o Nominatim responde
// normalmente. Também centraliza para, depois, trocar por LocationIQ/Mapbox
// sem tocar no app.
//
// Deploy: verify_jwt=true (só usuários logados buscam endereço).

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "VincApp/1.0 (marketplace de servicos; contato@vinc.app)";
const HEADERS = { "Accept-Language": "pt-BR", "User-Agent": UA };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function fromNominatim(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let body: { op?: string; q?: string; lat?: number; lng?: number;
    near?: { lat: number; lng: number } };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { op, q, lat, lng, near } = body;

  if (op === "search" && typeof q === "string") {
    const data = await fromNominatim(
      `${NOMINATIM}/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(q)}`,
    );
    return json({ data: data ?? [] });
  }

  if (op === "region" && typeof q === "string") {
    let viewbox = "";
    if (near) {
      const d = 0.7; // ~75 km ao redor do GPS
      viewbox = `&viewbox=${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}&bounded=0`;
    }
    const data = await fromNominatim(
      `${NOMINATIM}/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=6&q=${encodeURIComponent(q)}${viewbox}`,
    );
    return json({ data: data ?? [] });
  }

  if (op === "reverse" && typeof lat === "number" && typeof lng === "number") {
    const data = await fromNominatim(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
    );
    return json({ data: data ?? null });
  }

  return json({ error: "invalid_request" }, 400);
});
