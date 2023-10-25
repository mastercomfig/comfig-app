import { getGameData } from "@ssg/appData";

export async function GET() {
  const { gameData } = await getGameData();
  return new Response(JSON.stringify(gameData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getStaticPaths() {
  const { hash } = await getGameData();

  return [{ params: { id: `${hash.substring(0, 8)}.cached` } }];
}
