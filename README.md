# mastercomfig web app

The [web app](https://mastercomfig.com/) for mastercomfig.

## Color Scheme

We use [a material color scheme](https://material.io/resources/color/#!/?view.left=0&view.right=0&primary.color=009688&secondary.color=00BFA5).

## Project Structure

You'll see the following folders and files:

```
/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

All other folders are for organizational purposes and can be used for any Astro/Preact components.

Any static assets, like images, scripts, CSS, can be placed in the `public/` directory.

## Commands

All commands are run from the root of the project, from a terminal:

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `pnpm install`    | Installs dependencies                        |
| `pnpm dev`        | Starts local dev server at `localhost:3000`  |
| `pnpm build`      | Build your production site to `./dist/`      |
| `pnpm preview`    | Preview your build locally, before deploying |

## Want to learn more?

Feel free to check the [Astro documentation](https://docs.astro.build/en/getting-started/).
