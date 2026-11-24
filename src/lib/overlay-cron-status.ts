/**
 * Status HTTP cron overlay.
 * 503 bila ada lapisan, maritim, atau peringatan yang gagal.
 * pg_cron tetap mencatat sukses SQL saat net.http_post mengantri;
 * kode ini membuat net._http_response.status_code dan curl -f melihat kegagalan.
 */

export function overlayCronResponseStatus(input: {
  layers: { ok: boolean }[];
  maritimeOk: boolean;
  warningsOk: boolean;
}): 200 | 503 {
  const layersOk = input.layers.length > 0 && input.layers.every((layer) => layer.ok);
  if (layersOk && input.maritimeOk && input.warningsOk) return 200;
  return 503;
}
