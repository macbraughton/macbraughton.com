/** @jsx h */

import blog, { ga, redirects, h } from "blog";

blog({
  title: "Donnie Hyxos",
  avatar: "rabbit_icon.svg",
  favicon: "favicon.ico",
  avatarClass: "rounded-full",
  author: "Donnie Hyxos",
  description: <span>Founder of <a href="https://hyxos.io">hyxos.io</a></span>,
  links: [
    { title: "Mastodon", url: "https://infosec.exchange/@macbraughton" },
    { title: "Twitter", url: "https://twitter.com/macbraughton" },
    { title: "GitHub", url: "https://github.com/macbraughton" },
  ],
  // middlewares: [
  // ]
});
