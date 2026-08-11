/** Health-check для Docker HEALTHCHECK и мониторинга. Обязателен по правилам воркспейса. */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ status: 'ok', service: 'utmka-web' })
}
