/** @jsx h */

import blog, {h, ga, redirects } from "https://deno.land/x/blog@0.3.3/blog.tsx";

blog({
  title: "Donnie Hyxos",
  avatar: "rabbit_icon.svg",
  avatarClass: "rounded-full",
  author: "Donnie Hyxos",
  description: <span>Cofounder of <a href="https://hyxos.io">hyxos.io</a></span>,
  links: [
    { title: "Twitter", url: "https://twitter.com/macbraughton" },
    { title: "GitHub", url: "https://github.com/macbraughton" },
  ],
  background: "#c1aec5",

  // middlewares: [
    
    // If you want to set up Google Analytics, paste your GA key here.
    // ga("UA-XXXXXXXX-X"),

    // If you want to provide some redirections, you can specify them here,
    // pathname specified in a key will redirect to pathname in the value.
    // redirects({
    //  "/hello_world.html": "/hello_world",
    // }),

  // ]
});
