/** @jsx h */

import blog, { h } from "https://deno.land/x/blog/blog.tsx";

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
  theme: "light",
  style: "body, footer {  background: #c1aec5; color: #080808 }",
  footer: <footer class="mt-20 pb-16 lt-sm:pb-8 lt-sm:mt-16"><p class="flex items-center gap-2.5 text-gray-400/800 text-sm"><span>© 2022 Donnie Hyxos, Powered by <a class="inline-flex items-center gap-1 underline hover:text-gray-800 transition-colors" href="https://deno.land/x/blog">Deno Blog</a></span><a href="/feed" class="inline-flex items-center gap-1 hover:text-gray-800 transition-colors" title="Atom Feed"><svg class="inline-block w-4 h-4" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 8.373 11.627 3 5 3z"></path><path d="M4 9a1 1 0 011-1 7 7 0 017 7 1 1 0 11-2 0 5 5 0 00-5-5 1 1 0 01-1-1zM3 15a2 2 0 114 0 2 2 0 01-4 0z"></path></svg> RSS</a></p> <a rel="me" href="https://infosec.exchange/@macbraughton"></a></footer>
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
