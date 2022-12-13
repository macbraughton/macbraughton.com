---
title: Generating Code with ChatGPT
publish_date: 2022-12-11
---

Recently I noticed people discussing [ChatGPT](https://openai.com/blog/chatgpt/) on Mastodon and Twitter and found some interesting examples that involved using it to generate code. I thought I would try it myself to see how far it could take me in building an HTML file that included all the major bits. 

* Demo - [Spinning Hexagon](https://macbraughton.github.io/hexagon/)
* Code - [Spinning Hexagon](https://github.com/macbraughton/hexagon)

Going forward I'm planning on learning how to use the ChatGPT API to better capture the data entered and generated from the prompts. For now, I'm just going to talk about my experience and you can use the links above to see the demo work and the also code of the generated page.

I feel like after using this tool for the better part of a day I'm already starting to understand it better and getting better results. If you want to see me interact with the prompts more directly, I shared some screenshots of those interactions with Dr. Berry, you can check out the thread here: [infosec.exchange - Creating a calculate function using ChatGPT](https://infosec.exchange/@macbraughton/109496511540995380)

So, for this example, in addition to content we have styling, and a script tag as well so we can use Javascript to calculate coordinates for more precision in the shape of our object. We'll use a `polygon` element inside of an SVG and use our Javascript code to enter the coordinates values into the `points` attribute.

I began getting the first bits of code from ChatGPT by asking  for an html file of a white spinning hexagon SVG in a blue background.

This gave me the skeleton of the code that went on to be refined into the the final product. And, indeed gave me a spinning hexagon. The shape was not a *regular* hexagon however. It looked very strange when it spun and it took some tweaks to get it to look better.

I started by asking for it to be centered horizontally and vertically.

It took a few tries but eventually I was getting code that had it in the center. I also asked for it to only take up 33% of the page and to be responsive, which also seemed to work without much fuss.

I continued to refine what should be included in the file. It looks like ChatGPT is not very good at math when using English, but there is a magic spot where if you get it to generate code examples the output of the code legitimately produces the proper output. But you must be very, very specific and be prepared to ask it to try again with more speceficity.

I struggled a bit to get it to produce the proper coordinates for an SVG based on width. When I went into getting it to produce a Javascript function to produce the coordinates that seemed to do the trick.

I noticed one of the coordinates was a negative exponent when it should have been zero, which when I searched for the number generated I found this interesting post [Issue 43830: (-1) ** 0.5 returns (6.123233995736766e-17+1j) instead of 1j - Python tracker](https://1hx.ca/36t) regarding a how floating point numbers can cause nonzero values to operations that use trigonometry functions on values for *pi*. I was even able to get ChatGPT to explain this issue in more detail and offer a code snippet to deal with these non zero values.

After finally getting the proper coordinates to plot a regular hexagon, I added the Javascript to the original file and made a few adjustments so that the values would be updated in the `points` attribute on the `pologyon` element of the SVG.

Please let me know if you have any questions or want to discuss any details of the process further. I'm pretty excited about using ChatGPT to build more complex artifacts. I have a Mastodon profile now over on [infosec.exchange - macbraughton](https://infosec.exchange) if you would like to reach out.