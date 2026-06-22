module.exports = function(eleventyConfig) {
  // Copy assets folder to output
  eleventyConfig.addPassthroughCopy("src/assets");

  // Copy root-level robots.txt to output
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

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

  // Convert a small subset of LaTeX (the patterns we see in submitted abstracts)
  // into HTML. Apply via `{{ paper.abstract | latex | safe }}` in templates.
  //
  // Handles: \href / \url and plain https URLs (auto-linkified, trailing
  // punctuation stripped); text formatting (\textbf, \textit, \emph, \texttt,
  // \enquote, ``..''); escapes (\%, \&, \$, \_, \#); Greek letters and common
  // math symbols (\times, \tau, \alpha, \to, \leq, etc.) inside or outside
  // $..$; brace-wrapped operators inside math like N{=}10 → N=10; LaTeX
  // non-breaking space ~ between words; double/triple dashes; \\ line breaks.
  eleventyConfig.addFilter("latex", function(text) {
    if (!text) return "";
    let t = String(text);

    // 1. URL-bearing LaTeX commands (must run before the generic plain-URL pass
    //    so we don't double-process the URL inside \url{...}).
    t = t.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g,
      (_, url, label) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
    t = t.replace(/\\url\{([^}]+)\}/g, (_, url) => {
      const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener">${url}</a>`;
    });

    // 2. Text formatting
    t = t.replace(/\\textbf\{([^}]+)\}/g,    "<strong>$1</strong>");
    t = t.replace(/\\textit\{([^}]+)\}/g,    "<em>$1</em>");
    t = t.replace(/\\emph\{([^}]+)\}/g,      "<em>$1</em>");
    t = t.replace(/\\texttt\{([^}]+)\}/g,    "<code>$1</code>");
    t = t.replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>");
    t = t.replace(/\\textsc\{([^}]+)\}/g,    "$1");
    t = t.replace(/\\enquote\{([^}]+)\}/g,   "“$1”");

    // 3. LaTeX-style typographic quotes  ``X''  →  "X"
    t = t.replace(/``([^`]+?)''/g, "“$1”");

    // 4. Math symbols & Greek letters (replace whether or not they're wrapped in $..$)
    const SYM = {
      times: "×", cdot: "·", pm: "±", mp: "∓",
      to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔",
      Rightarrow: "⇒", Leftarrow: "⇐",
      infty: "∞",
      leq: "≤", geq: "≥", neq: "≠", equiv: "≡", approx: "≈", sim: "∼",
      in: "∈", notin: "∉", subset: "⊂", supset: "⊃", subseteq: "⊆", supseteq: "⊇",
      cup: "∪", cap: "∩",
      forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨",
      sum: "∑", prod: "∏", int: "∫", partial: "∂", nabla: "∇",
      dots: "…", ldots: "…", cdots: "⋯",
      alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
      zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
      iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
      xi: "ξ", omicron: "ο", pi: "π", varpi: "ϖ",
      rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς",
      tau: "τ", upsilon: "υ", phi: "φ", varphi: "ϕ",
      chi: "χ", psi: "ψ", omega: "ω",
      Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
      Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
    };
    for (const [k, v] of Object.entries(SYM)) {
      t = t.replace(new RegExp(`\\\\${k}\\b`, "g"), v);
    }

    // 5. Inside $..$, strip brace-wrapped operators like N{=}10 → N=10
    t = t.replace(/\$([^$\n]+?)\$/g, (_, inner) =>
      "$" + inner.replace(/\{([^{}a-zA-Z\s]+)\}/g, "$1") + "$"
    );

    // 6. Strip remaining $..$ wrappers (whatever's inside is just plain text now)
    t = t.replace(/\$([^$\n]*?)\$/g, "$1");

    // 7. Escapes
    t = t.replace(/\\%/g,  "%");
    t = t.replace(/\\&/g,  "&");
    t = t.replace(/\\\$/g, "$");
    t = t.replace(/\\_/g,  "_");
    t = t.replace(/\\#/g,  "#");

    // 8. Plain http(s) URLs — auto-linkify; strip trailing .,;:!?)]} from URL.
    //    Negative lookbehind avoids URLs already inside <a href="..."> attrs/text.
    t = t.replace(/(?<!["'>])(https?:\/\/[^\s<>"]+?)([.,;:!?)\]}]*)(?=\s|$|<)/g,
      (_, url, trail) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>${trail}`);

    // 9. ~ → non-breaking space when between word characters (Llama~3, e.g.)
    t = t.replace(/(\w)~(\w)/g, "$1 $2");

    // 10. Dashes between word chars: --- → em-dash, -- → en-dash
    t = t.replace(/(\w)---(\w)/g, "$1—$2");
    t = t.replace(/(\w)--(\w)/g,  "$1–$2");

    // 11. \\ → space (LaTeX hard line break — not meaningful inside an abstract)
    t = t.replace(/\\\\/g, " ");

    return t;
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
