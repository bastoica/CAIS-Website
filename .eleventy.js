module.exports = function(eleventyConfig) {
  // Copy assets folder to output
  eleventyConfig.addPassthroughCopy("src/assets");

  // Watch for changes in assets
  eleventyConfig.addWatchTarget("src/assets/");

  // Helper to get current year
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Filter to check if current page matches a nav item
  eleventyConfig.addFilter("isActiveNav", function(navUrl, pageUrl) {
    if (navUrl === "/" && pageUrl === "/") return true;
    if (navUrl !== "/" && pageUrl.startsWith(navUrl)) return true;
    return false;
  });

  // Filter that returns the longest nav href that is a prefix of pageUrl,
  // so we can highlight only the most specific match (e.g. "Committee" rather
  // than both "Program" and "Committee" when the user is on /program/2026/committee/).
  eleventyConfig.addFilter("bestNavMatch", function(navItems, pageUrl) {
    let best = "";
    function walk(items) {
      for (const item of items) {
        if (item.href && item.href !== "/" && pageUrl.startsWith(item.href) && item.href.length > best.length) {
          best = item.href;
        }
        if (item.children) walk(item.children);
      }
    }
    walk(navItems);
    return best;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data"
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
