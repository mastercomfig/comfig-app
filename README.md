# mastercomfig web app

The [web app](https://comfig.app/) for mastercomfig.

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

Any Astro/React [components](https://docs.astro.build/en/core-concepts/astro-components/) are put in `src/components/`.

Astro [layouts](https://docs.astro.build/en/core-concepts/layouts/) are put in `src/layouts/`.

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
