var ghpages = require("gh-pages");

ghpages.publish(
  "public", // path to public directory
  {
    branch: "gh-pages",
    repo: "https://github.com/marauder89/svelte.git", // Update to point to your repository
    user: {
      name: "marauder89", // update to use your name
      email: "rainbow-aaaa@nate.com", // Update to use your email
    },
    dotfiles: true,
  },
  () => {
    console.log("Deploy Complete!");
  }
);
