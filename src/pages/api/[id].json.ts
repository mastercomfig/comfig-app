import { getAppData } from "@ssg/appData";

export async function GET() {
  const { appData } = await getAppData();
  return new Response(JSON.stringify(appData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getStaticPaths() {
  const { appData, hash } = await getAppData();

  return [{ params: { id: `${appData.v[0]}.${hash.substring(0, 8)}.cached` } }];
}
