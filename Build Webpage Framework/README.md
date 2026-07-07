
  # Build Webpage Framework

  This is a code bundle for Build Webpage Framework. The original project is available at https://www.figma.com/design/FRgsDXTVMbxeW6DLeliEWU/Build-Webpage-Framework.

  ## Running the code

  Run `pnpm install` to install the dependencies.

  Run `pnpm run dev` to start the development server.

  Run `pnpm run build` to build the static site.

  ## Responsive audit

  Run `pnpm run dev`, open the app in a browser, set the viewport to the target width, then paste `tools/responsive-audit.js` into the browser console. The expected result is `clippedPx: 0` for every route; elements with `widestRight` beyond the viewport must be inside their own horizontal scroll region.

  ## CI/CD

  GitHub Actions builds the app on pull requests and pushes to `main`. Pushes to `main` also publish `dist/` to GitHub Pages.
  
