import { getQuickplayData } from "@ssg/quickplayData";

export async function GET() {
  const { quickplayData } = await getQuickplayData();
  return new Response(JSON.stringify(quickplayData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getStaticPaths() {
  const { hash } = await getQuickplayData();

  return [{ params: { id: `${hash.substring(0, 8)}.cached` } }];
}
