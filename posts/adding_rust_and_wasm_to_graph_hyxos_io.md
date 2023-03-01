---
title: Adding rust and wasm to graph.hyxos.io
publish_date: 2023-03-01
---

First off, just to clarify: [graph.hyxos.io](https://graph.hyxos.io) is a design tool we've been working on to create art assets for the gaming products in development at [hyxos.io](https://hyxos.io).

Right now it's mostly javascript and typescript (don't forget JSX and TSX) and built with the help of the [solidjs](https://www.solidjs.com/) library.

There is no documentation other than the code itself. We are currently the primary user, and so the interface is in a quick and dirty "get the job done" state. It works just well enough to do a few things that we need it to do. As time goes on we plan to add more polish. In the interests of "learning in public", we've made it an open repo on [github](https://github.com/hyxos/graph.hyxos.io) and considering what license to use.  

As we started building, the need to do some extremely expensive computations that just aren't that fast in javascript surfaced quickly. (Unoptimized computations can generate 13k+ dom nodes). We started down the route of doing some algorithmic optimizations in javascript, which led to some noticable performance improvements, and eventually realized that if we really wanted speed there are other options.

After listening to a podcast with Tim McNamara on [syntax.fm](https://syntax.fm/show/571/supper-club-rust-in-action-with-tim-mcnamara) the other day, we decided to look into what it would be like add rust to the project. The thing is that it can't be done directly. It has to be compiled to wasm in order to use it within our javascript code (there are a few ways to do this we will explore in this post).

This project is already deployed on netlify. We like netlify, we like vercel as well. This project has been on both providers and ended up with it's main deployment on netlify for organizational purposes (we get to stay on the free tier and deploy it from our github organization [hyxos](https://github.com/hyxos)).

So, let's hack the netlify build process to install the necessary tools for getting this to work there!

## Adding the cargo file to the root of the project

```fish
$ cargo init --lib

```

This adds the `Cargo.toml` file to the root of the project as well as a `lib.rs` file into the `/src/lib/` path of our project.

We have to manually add a few more settings to the file to get the compile to work.

```toml
[package]
name = "golden_triangle_graph"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[lib]
crate-type = ["cdylib"]
path = "src/lib.rs" 

[dependencies]
```
This file will grow as we add dependencies to the project.

## Adding `rust-toolchain.toml` to the root of the project.

According to the [netlify docs](https://docs.netlify.com/configure-builds/manage-dependencies/#rust), `rustup` and `cargo` come preinstalled, but we have to specify which toolchain they are to use. 

```fish
$ touch rust-toolchain.toml
```

We'll just use a default configuration and worry about optiimization later.

```toml
[toolchain]
# The default profile includes rustc, rust-std, cargo, rust-docs, rustfmt and clippy.
# https://rust-lang.github.io/rustup/concepts/profiles.html
profile = "default"
channel = "1.67.1"
```

## Adding a `netlify.toml` file to the root of the project

```toml
[build]
publish = "dist"
command = "./build.sh"
```

## Building a `build.sh` file and adding it to the root of the project

Add the file to the root of our directory:
```
touch build.sh
```

We have to make the file executable, in order to be able to run it ourselves and for git, so it will run on the deploy.
```
chmod u+x build.sh
```

Looking through a few different options, it looks like we can use cargo to directly create the wasm
```
cargo build --target wasm32-unknown-unknown --release
```

This creates a bunch of files in the target directory, the one we are most concerned with is
```
./target/wasm32-unknown-unknown/release/golden_triangle_graph.wasm
```

The only issue here is that the file is big!

```
1.7M Feb 27 20:23 golden_triangle_graph.wasm*
```

So if we are going this route we will have to compress it:

```
wasm-gc target/wasm32-unknown-unknown/release/golden_triangle_graph.wasm
```

Ooh, that brings it down to `184B`.

We will have add `wasm-gc` to our build script.

## Take another road

Well, turns out that pursuing that solution worked in my dev environment, but not when it was deployed.

The issue had to do with the way we were referencing the file in javascript. Using `fetch` to get it from the local file system ran into permissions issues when trying access it from the deploy. 

A possible workaround would be to add it as a dependency in the `package.json` but there is an much easier way to do it.

### `wasm-pack` to the rescue!

This solution worked quite well, and simplified the javascript portion of the code a ton. *Bonus*: no need for a separate optimization step. Just add `cargo add wasm-pack` to the `build.sh` file and we are good to go.

Here's our final build file:

```bash
#!/bin/bash

cargo install wasm-pack
wasm-pack build --target web
npm run build
```

## One more snag

This seemed to do it on our dev setup when we ran the build file and used the `npm run serve` command to simulate the deployment. 

After trying to deploy with netlify we got a new error this time. 

`ERR_PNPM_OUTDATED_LOCKFILE`

This was new one, the system complaining about a `pnpm-lock.yaml` file. We don't use pnpm, but netlify does. So we tried clearing the cache in the netlify panel and redeploying a few times but that didn't fix it.

After looking at this post on stack overflow about a similar [issue](https://stackoverflow.com/questions/73968943/how-to-have-pnpm-install-install-everything-exactly-to-the-specs-of-the-pnpm-l), we decided to try removing the `node_modules` and running pnpm in our project to generate our own lockfile to see if it would overright theirs:

`rm -rf node_modules`
`pnpm install --no-frozen-lockfile`

This generated our own `pnpm-lock.yaml` file which I added to our project.

`git add pnpm-lock.yaml`
`git push -u origin main`

This is quite the build:

```log
1:13:57 PM: build-image version: ... (focal)
1:13:57 PM: buildbot version: ...
1:13:57 PM: Fetching cached dependencies
1:13:57 PM: Starting to download cache of 471.5MB
1:14:02 PM: Finished downloading cache in 4.656s
1:14:02 PM: Starting to extract cache
1:14:05 PM: Finished extracting cache in 2.76s
1:14:05 PM: Finished fetching cache in 7.483s
1:14:05 PM: Starting to prepare the repo for build
1:14:05 PM: Preparing Git Reference refs/heads/main
1:14:05 PM: Parsing package.json dependencies
1:14:06 PM: Different build command detected, going to use the one specified in the Netlify configuration file: './build.sh' versus 'npm run build' in the Netlify UI
1:14:07 PM: Starting build script
1:14:07 PM: Installing dependencies
1:14:07 PM: Python version set to 2.7
1:14:07 PM: Started restoring cached Node.js version
1:14:07 PM: Finished restoring cached Node.js version
1:14:08 PM: v16.19.1 is already installed.
1:14:08 PM: Now using node v16.19.1 (npm v8.19.3)
1:14:08 PM: Enabling Node.js Corepack
1:14:08 PM: Started restoring cached build plugins
1:14:08 PM: Finished restoring cached build plugins
1:14:08 PM: Attempting Ruby version 2.7.2, read from environment
1:14:09 PM: Using Ruby version 2.7.2
1:14:09 PM: Using PHP version 8.0
1:14:09 PM: Started restoring cached corepack dependencies
1:14:09 PM: Finished restoring cached corepack dependencies
1:14:09 PM: No pnpm workspaces detected
1:14:09 PM: Started restoring cached node modules
1:14:09 PM: Finished restoring cached node modules
1:14:09 PM: Installing npm packages using pnpm version 7.13.4
1:14:10 PM: Lockfile is up to date, resolution step is skipped
1:14:10 PM: Progress: resolved 1, reused 0, downloaded 0, added 0
1:14:10 PM: Packages: +10
1:14:10 PM: ++++++++++
1:14:11 PM: Progress: resolved 10, reused 0, downloaded 8, added 8
1:14:11 PM: .../node_modules/@swc/core postinstall$ node postinstall.js
1:14:11 PM: .../esbuild@0.15.18/node_modules/esbuild postinstall$ node install.js
1:14:11 PM: .../node_modules/@swc/core postinstall: Done
1:14:11 PM: .../esbuild@0.15.18/node_modules/esbuild postinstall: Done
1:14:11 PM: devDependencies:
1:14:11 PM: + vite-plugin-top-level-await 1.3.0
1:14:11 PM: + vite-plugin-wasm 3.2.1
1:14:11 PM: Done in 1.7s
1:14:12 PM: Progress: resolved 10, reused 0, downloaded 10, added 10, done
1:14:12 PM: npm packages installed using pnpm
1:14:12 PM: Started restoring cached go cache
1:14:12 PM: Finished restoring cached go cache
1:14:12 PM: go version go1.19.6 linux/amd64
1:14:12 PM: Started restoring cached rust rustup cache
1:14:14 PM: Finished restoring cached rust rustup cache
1:14:14 PM: Started restoring cached rust cargo registry cache
1:14:14 PM: Finished restoring cached rust cargo registry cache
1:14:14 PM: Started restoring cached rust cargo bin cache
1:14:15 PM: Finished restoring cached rust cargo bin cache
1:14:15 PM: Started restoring cached rust compile output
1:14:15 PM: Finished restoring cached rust compile output
1:14:15 PM: Detected 1 framework(s)
1:14:15 PM: "solid-js" at version "1.6.6"
1:14:15 PM: Section completed: initializing
1:14:16 PM: ​
1:14:16 PM:   Netlify Build                                                 
1:14:16 PM: ────────────────────────────────────────────────────────────────
1:14:16 PM: ​
1:14:16 PM: ❯ Version
1:14:16 PM:   @netlify/build 29.5.8
1:14:16 PM: ​
1:14:16 PM: ❯ Flags
1:14:16 PM:   baseRelDir: true
1:14:16 PM:   buildId: ...
1:14:16 PM:   deployId: ...
1:14:16 PM: ​
1:14:16 PM: ❯ Current directory
1:14:16 PM:   /opt/build/repo
1:14:16 PM: ​
1:14:16 PM: ❯ Config file
1:14:16 PM:   /opt/build/repo/netlify.toml
1:14:16 PM: ​
1:14:16 PM: ❯ Context
1:14:16 PM:   production
1:14:16 PM: ​
1:14:16 PM:   1. build.command from netlify.toml                            
1:14:16 PM: ────────────────────────────────────────────────────────────────
1:14:16 PM: ​
1:14:16 PM: $ ./build.sh
1:14:16 PM:     Updating crates.io index
1:14:25 PM:  Downloading crates ...
1:14:25 PM:   Downloaded wasm-pack v0.10.3
1:14:25 PM:   Installing wasm-pack v0.10.3
1:14:25 PM:  Downloading crates ...
1:14:26 PM:   Downloaded http-body v0.1.0
1:14:26 PM:   Downloaded rand_isaac v0.1.1
1:14:26 PM:   Downloaded rand_core v0.3.1
1:14:26 PM:   Downloaded hyper-tls v0.3.2
1:14:26 PM:   Downloaded publicsuffix v1.5.6
1:14:26 PM:   Downloaded rand_jitter v0.1.4
1:14:26 PM:   Downloaded rand_xorshift v0.1.1
1:14:26 PM:   Downloaded string v0.2.1
1:14:26 PM:   Downloaded rand v0.3.23
1:14:26 PM:   Downloaded flate2 v1.0.25
1:14:26 PM:   Downloaded tokio-tcp v0.1.4
1:14:26 PM:   Downloaded tokio-threadpool v0.1.18
1:14:26 PM:   Downloaded uuid v0.7.4
1:14:26 PM:   Downloaded try_from v0.3.2
1:14:26 PM:   Downloaded pkg-config v0.3.26
1:14:26 PM:   Downloaded same-file v1.0.6
1:14:26 PM:   Downloaded tinyvec_macros v0.1.1
1:14:26 PM:   Downloaded try-lock v0.2.4
1:14:26 PM:   Downloaded unicode-xid v0.2.4
1:14:26 PM:   Downloaded time v0.1.45
1:14:26 PM:   Downloaded unicode-bidi v0.3.10
1:14:26 PM:   Downloaded walkdir v2.3.2
1:14:26 PM:   Downloaded vec_map v0.8.2
1:14:26 PM:   Downloaded xattr v0.2.3
1:14:26 PM:   Downloaded version_check v0.9.4
1:14:26 PM:   Downloaded uuid v0.8.2
1:14:26 PM:   Downloaded thiserror v1.0.38
1:14:26 PM:   Downloaded cfg-if v0.1.10
1:14:26 PM:   Downloaded iovec v0.1.4
1:14:26 PM:   Downloaded socket2 v0.4.7
1:14:26 PM:   Downloaded itoa v1.0.5
1:14:26 PM:   Downloaded serde v1.0.152
1:14:26 PM:   Downloaded unicode-normalization v0.1.22
1:14:26 PM:   Downloaded openssl-probe v0.1.5
1:14:26 PM:   Downloaded url v2.3.1
1:14:26 PM:   Downloaded tempfile v2.2.0
1:14:26 PM:   Downloaded textwrap v0.11.0
1:14:26 PM:   Downloaded unicode-segmentation v1.10.1
1:14:26 PM:   Downloaded toml v0.5.11
1:14:26 PM:   Downloaded semver-parser v0.7.0
1:14:26 PM:   Downloaded semver v0.9.0
1:14:26 PM:   Downloaded unicase v2.6.0
1:14:26 PM:   Downloaded zip v0.5.13
1:14:26 PM:   Downloaded memchr v2.5.0
1:14:26 PM:   Downloaded object v0.30.3
1:14:26 PM:   Downloaded tokio-reactor v0.1.12
1:14:26 PM:   Downloaded want v0.2.0
1:14:26 PM:   Downloaded url v1.7.2
1:14:26 PM:   Downloaded which v2.0.1
1:14:26 PM:   Downloaded serde_ignored v0.0.4
1:14:26 PM:   Downloaded structopt v0.3.26
1:14:26 PM:   Downloaded syn v1.0.109
1:14:26 PM:   Downloaded rand v0.5.6
1:14:26 PM:   Downloaded openssl-macros v0.1.0
1:14:26 PM:   Downloaded encoding_rs v0.8.32
1:14:26 PM:   Downloaded curl-sys v0.4.60+curl-7.88.1
1:14:26 PM:   Downloaded linux-raw-sys v0.1.4
1:14:26 PM:   Downloaded dirs v1.0.5
1:14:26 PM:   Downloaded libz-sys v1.1.8
1:14:27 PM:   Downloaded percent-encoding v1.0.1
1:14:27 PM:   Downloaded openssl-src v111.25.1+1.1.1t
1:14:27 PM:   Downloaded getrandom v0.2.8
1:14:27 PM:   Downloaded cargo_metadata v0.8.2
1:14:27 PM:   Downloaded http v0.1.21
1:14:27 PM:   Downloaded clicolors-control v0.2.0
1:14:27 PM:   Downloaded h2 v0.1.26
1:14:27 PM:   Downloaded glob v0.2.11
1:14:27 PM:   Downloaded parking_lot v0.9.0
1:14:27 PM:   Downloaded memoffset v0.5.6
1:14:27 PM:   Downloaded hex v0.3.2
1:14:27 PM:   Downloaded futures-cpupool v0.1.8
1:14:27 PM:   Downloaded tokio-io v0.1.13
1:14:27 PM:   Downloaded tokio-buf v0.1.1
1:14:27 PM:   Downloaded heck v0.3.3
1:14:27 PM:   Downloaded tokio-executor v0.1.10
1:14:27 PM:   Downloaded structopt-derive v0.4.18
1:14:27 PM:   Downloaded smallvec v0.6.14
1:14:27 PM:   Downloaded hashbrown v0.12.3
1:14:27 PM:   Downloaded either v1.8.1
1:14:27 PM:   Downloaded idna v0.3.0
1:14:27 PM:   Downloaded foreign-types v0.3.2
1:14:27 PM:   Downloaded dtoa v0.4.8
1:14:27 PM:   Downloaded fnv v1.0.7
1:14:27 PM:   Downloaded bzip2-sys v0.1.11+1.0.8
1:14:27 PM:   Downloaded httparse v1.8.0
1:14:27 PM:   Downloaded filetime v0.2.20
1:14:27 PM:   Downloaded bytes v0.4.12
1:14:27 PM:   Downloaded tokio-timer v0.2.13
1:14:27 PM:   Downloaded tar v0.4.38
1:14:27 PM:   Downloaded rand_chacha v0.1.1
1:14:27 PM:   Downloaded rand v0.4.6
1:14:27 PM:   Downloaded parking_lot v0.6.4
1:14:27 PM:   Downloaded lock_api v0.1.5
1:14:27 PM:   Downloaded is_executable v0.1.2
1:14:27 PM:   Downloaded binary-install v0.0.2
1:14:27 PM:   Downloaded scopeguard v0.3.3
1:14:27 PM:   Downloaded parking_lot_core v0.3.1
1:14:27 PM:   Downloaded rustc_version v0.2.3
1:14:27 PM:   Downloaded mio v0.6.23
1:14:27 PM:   Downloaded idna v0.2.3
1:14:27 PM:   Downloaded curl v0.4.44
1:14:27 PM:   Downloaded crossbeam-utils v0.7.2
1:14:27 PM:   Downloaded chrono v0.4.23
1:14:27 PM:   Downloaded tinyvec v1.6.0
1:14:27 PM:   Downloaded proc-macro2 v1.0.51
1:14:27 PM:   Downloaded proc-macro-error v1.0.4
1:14:27 PM:   Downloaded miniz_oxide v0.6.2
1:14:27 PM:   Downloaded cc v1.0.79
1:14:27 PM:   Downloaded synstructure v0.12.6
1:14:27 PM:   Downloaded openssl-sys v0.9.80
1:14:27 PM:   Downloaded parking_lot_core v0.9.7
1:14:27 PM:   Downloaded num-traits v0.2.15
1:14:27 PM:   Downloaded mime_guess v2.0.4
1:14:27 PM:   Downloaded gimli v0.27.2
1:14:27 PM:   Downloaded num-integer v0.1.45
1:14:27 PM:   Downloaded native-tls v0.2.11
1:14:27 PM:   Downloaded failure_derive v0.1.8
1:14:27 PM:   Downloaded failure v0.1.8
1:14:27 PM:   Downloaded concolor v0.0.11
1:14:27 PM:   Downloaded backtrace v0.3.67
1:14:27 PM:   Downloaded toml v0.4.10
1:14:27 PM:   Downloaded num_cpus v1.15.0
1:14:27 PM:   Downloaded indexmap v1.9.2
1:14:27 PM:   Downloaded base64 v0.10.1
1:14:27 PM:   Downloaded io-lifetimes v1.0.5
1:14:27 PM:   Downloaded console v0.15.5
1:14:27 PM:   Downloaded lock_api v0.4.9
1:14:27 PM:   Downloaded clap v2.34.0
1:14:27 PM:   Downloaded aho-corasick v0.7.20
1:14:27 PM:   Downloaded rustix v0.36.8
1:14:27 PM:   Downloaded mime v0.3.16
1:14:27 PM:   Downloaded crc32fast v1.3.2
1:14:27 PM:   Downloaded bzip2 v0.4.4
1:14:27 PM:   Downloaded scopeguard v1.1.0
1:14:27 PM:   Downloaded regex v1.7.1
1:14:27 PM:   Downloaded iana-time-zone v0.1.53
1:14:27 PM:   Downloaded addr2line v0.19.0
1:14:27 PM:   Downloaded autocfg v1.1.0
1:14:27 PM:   Downloaded adler v1.0.2
1:14:27 PM:   Downloaded regex-syntax v0.6.28
1:14:27 PM:   Downloaded foreign-types-shared v0.1.1
1:14:27 PM:   Downloaded ryu v1.0.12
1:14:27 PM:   Downloaded strsim v0.8.0
1:14:27 PM:   Downloaded stable_deref_trait v1.2.0
1:14:27 PM:   Downloaded unicode-ident v1.0.6
1:14:27 PM:   Downloaded termios v0.3.3
1:14:27 PM:   Downloaded owning_ref v0.4.1
1:14:27 PM:   Downloaded siphasher v0.2.3
1:14:27 PM:   Downloaded rand_hc v0.1.0
1:14:27 PM:   Downloaded rand v0.6.5
1:14:27 PM:   Downloaded parking_lot_core v0.6.3
1:14:27 PM:   Downloaded openssl v0.10.45
1:14:27 PM:   Downloaded dialoguer v0.3.0
1:14:27 PM:   Downloaded os_info v2.0.8
1:14:27 PM:   Downloaded thiserror-impl v1.0.38
1:14:27 PM:   Downloaded serde_json v1.0.93
1:14:27 PM:   Downloaded net2 v0.2.38
1:14:27 PM:   Downloaded matches v0.1.10
1:14:27 PM:   Downloaded smallvec v1.10.0
1:14:27 PM:   Downloaded maybe-uninit v2.0.0
1:14:27 PM:   Downloaded is-terminal v0.4.4
1:14:27 PM:   Downloaded serde_derive v1.0.152
1:14:27 PM:   Downloaded lock_api v0.3.4
1:14:27 PM:   Downloaded human-panic v1.1.0
1:14:27 PM:   Downloaded slab v0.4.8
1:14:27 PM:   Downloaded parking_lot v0.12.1
1:14:27 PM:   Downloaded idna v0.1.5
1:14:27 PM:   Downloaded crossbeam-queue v0.2.3
1:14:27 PM:   Downloaded once_cell v1.17.1
1:14:27 PM:   Downloaded hyper v0.12.36
1:14:27 PM:   Downloaded crossbeam-epoch v0.8.2
1:14:27 PM:   Downloaded cookie v0.12.0
1:14:27 PM:   Downloaded crossbeam-deque v0.7.4
1:14:27 PM:   Downloaded proc-macro-error-attr v1.0.4
1:14:27 PM:   Downloaded lazy_static v1.4.0
1:14:27 PM:   Downloaded itoa v0.4.8
1:14:27 PM:   Downloaded futures v0.1.31
1:14:27 PM:   Downloaded cookie_store v0.7.0
1:14:27 PM:   Downloaded concolor-query v0.1.0
1:14:27 PM:   Downloaded autocfg v0.1.8
1:14:27 PM:   Downloaded tokio-current-thread v0.1.7
1:14:27 PM:   Downloaded serde_urlencoded v0.5.5
1:14:27 PM:   Downloaded quote v1.0.23
1:14:27 PM:   Downloaded percent-encoding v2.2.0
1:14:27 PM:   Downloaded lazy_static v0.2.11
1:14:27 PM:   Downloaded console v0.6.2
1:14:27 PM:   Downloaded tokio v0.1.22
1:14:27 PM:   Downloaded rand_pcg v0.1.2
1:14:27 PM:   Downloaded rand_os v0.1.3
1:14:27 PM:   Downloaded rand_core v0.4.2
1:14:27 PM:   Downloaded tokio-sync v0.1.8
1:14:27 PM:   Downloaded reqwest v0.9.24
1:14:27 PM:   Downloaded bitflags v1.3.2
1:14:27 PM:   Downloaded form_urlencoded v1.1.0
1:14:27 PM:   Downloaded ansi_term v0.12.1
1:14:27 PM:    Compiling libc v0.2.139
1:14:27 PM:    Compiling autocfg v1.1.0
1:14:27 PM:    Compiling proc-macro2 v1.0.51
1:14:27 PM:    Compiling unicode-ident v1.0.6
1:14:27 PM:    Compiling quote v1.0.23
1:14:27 PM:    Compiling syn v1.0.109
1:14:27 PM:    Compiling serde v1.0.152
1:14:28 PM:    Compiling serde_derive v1.0.152
1:14:28 PM:    Compiling cfg-if v1.0.0
1:14:28 PM:    Compiling cc v1.0.79
1:14:28 PM:    Compiling pkg-config v0.3.26
1:14:28 PM:    Compiling cfg-if v0.1.10
1:14:29 PM:    Compiling semver-parser v0.7.0
1:14:29 PM:    Compiling lazy_static v1.4.0
1:14:29 PM:    Compiling log v0.4.17
1:14:29 PM:    Compiling futures v0.1.31
1:14:29 PM:    Compiling maybe-uninit v2.0.0
1:14:29 PM:    Compiling version_check v0.9.4
1:14:29 PM:    Compiling byteorder v1.4.3
1:14:29 PM:    Compiling crossbeam-utils v0.7.2
1:14:29 PM:    Compiling openssl-src v111.25.1+1.1.1t
1:14:30 PM:    Compiling iovec v0.1.4
1:14:30 PM:    Compiling rand_core v0.4.2
1:14:30 PM:    Compiling scopeguard v1.1.0
1:14:30 PM:    Compiling openssl-sys v0.9.80
1:14:30 PM:    Compiling either v1.8.1
1:14:30 PM:    Compiling memchr v2.5.0
1:14:31 PM:    Compiling bytes v0.4.12
1:14:31 PM:    Compiling slab v0.4.8
1:14:31 PM:    Compiling tinyvec_macros v0.1.1
1:14:31 PM:    Compiling tinyvec v1.6.0
1:14:32 PM:    Compiling autocfg v0.1.8
1:14:32 PM:    Compiling unicode-normalization v0.1.22
1:14:32 PM:    Compiling rand_core v0.3.1
1:14:32 PM:    Compiling smallvec v0.6.14
1:14:32 PM:    Compiling adler v1.0.2
1:14:32 PM:    Compiling fnv v1.0.7
1:14:32 PM:    Compiling bitflags v1.3.2
1:14:32 PM:    Compiling unicode-bidi v0.3.10
1:14:33 PM:    Compiling miniz_oxide v0.6.2
1:14:34 PM:    Compiling tokio-executor v0.1.10
1:14:34 PM:    Compiling memoffset v0.5.6
1:14:34 PM:    Compiling unicase v2.6.0
1:14:34 PM:    Compiling backtrace v0.3.67
1:14:35 PM:    Compiling time v0.1.45
1:14:35 PM:    Compiling num_cpus v1.15.0
1:14:35 PM:    Compiling crossbeam-epoch v0.8.2
1:14:36 PM:    Compiling matches v0.1.10
1:14:36 PM:    Compiling gimli v0.27.2
1:14:38 PM:    Compiling semver v0.9.0
1:14:38 PM:    Compiling rustc_version v0.2.3
1:14:39 PM:    Compiling addr2line v0.19.0
1:14:39 PM:    Compiling parking_lot_core v0.6.3
1:14:39 PM:    Compiling parking_lot v0.9.0
1:14:39 PM:    Compiling object v0.30.3
1:14:39 PM:    Compiling tokio-io v0.1.13
1:14:39 PM:    Compiling lock_api v0.3.4
1:14:39 PM:    Compiling libz-sys v1.1.8
1:14:40 PM:    Compiling net2 v0.2.38
1:14:40 PM:    Compiling failure_derive v0.1.8
1:14:40 PM:    Compiling itoa v0.4.8
1:14:40 PM:    Compiling unicode-xid v0.2.4
1:14:40 PM:    Compiling rustc-demangle v0.1.21
1:14:40 PM:    Compiling synstructure v0.12.6
1:14:41 PM:    Compiling mio v0.6.23
1:14:43 PM:    Compiling tokio-sync v0.1.8
1:14:43 PM:    Compiling indexmap v1.9.2
1:14:43 PM:    Compiling unicode-width v0.1.10
1:14:43 PM:    Compiling crc32fast v1.3.2
1:14:43 PM:    Compiling io-lifetimes v1.0.5
1:14:44 PM:    Compiling tokio-reactor v0.1.12
1:14:44 PM:    Compiling crossbeam-deque v0.7.4
1:14:44 PM:    Compiling http v0.1.21
1:14:45 PM:    Compiling idna v0.1.5
1:14:45 PM:    Compiling rand_chacha v0.1.1
1:14:46 PM:    Compiling rand_pcg v0.1.2
1:14:46 PM:    Compiling crossbeam-queue v0.2.3
1:14:46 PM:    Compiling proc-macro-error-attr v1.0.4
1:14:46 PM:    Compiling curl-sys v0.4.60+curl-7.88.1
1:14:46 PM:    Compiling bzip2-sys v0.1.11+1.0.8
1:14:46 PM:    Compiling rustix v0.36.8
1:14:47 PM:    Compiling hashbrown v0.12.3
1:14:47 PM:    Compiling percent-encoding v2.2.0
1:14:47 PM:    Compiling percent-encoding v1.0.1
1:14:47 PM:    Compiling openssl-probe v0.1.5
1:14:47 PM:    Compiling openssl v0.10.45
1:14:47 PM:    Compiling httparse v1.8.0
1:14:47 PM:    Compiling serde_json v1.0.93
1:14:47 PM:    Compiling foreign-types-shared v0.1.1
1:14:47 PM:    Compiling foreign-types v0.3.2
1:14:47 PM:    Compiling url v1.7.2
1:14:48 PM:    Compiling form_urlencoded v1.1.0
1:14:48 PM:    Compiling tokio-threadpool v0.1.18
1:14:50 PM:    Compiling failure v0.1.8
1:14:50 PM:    Compiling tokio-tcp v0.1.4
1:14:51 PM:    Compiling hyper v0.12.36
1:14:51 PM:    Compiling tokio-current-thread v0.1.7
1:14:51 PM:    Compiling tokio-timer v0.2.13
1:14:51 PM:    Compiling idna v0.3.0
1:14:51 PM:    Compiling openssl-macros v0.1.0
1:14:52 PM:    Compiling rand v0.6.5
1:14:52 PM:    Compiling tokio-buf v0.1.1
1:14:52 PM:    Compiling string v0.2.1
1:14:52 PM:    Compiling proc-macro-error v1.0.4
1:14:52 PM:    Compiling atty v0.2.14
1:14:52 PM:    Compiling lock_api v0.4.9
1:14:52 PM:    Compiling num-traits v0.2.15
1:14:52 PM:    Compiling parking_lot_core v0.9.7
1:14:52 PM:    Compiling linux-raw-sys v0.1.4
1:14:52 PM:    Compiling ryu v1.0.12
1:14:52 PM:    Compiling once_cell v1.17.1
1:14:53 PM:    Compiling native-tls v0.2.11
1:14:53 PM:    Compiling itoa v1.0.5
1:14:53 PM:    Compiling thiserror v1.0.38
1:14:53 PM:    Compiling try-lock v0.2.4
1:14:53 PM:    Compiling want v0.2.0
1:14:54 PM:    Compiling h2 v0.1.26
1:14:55 PM:    Compiling http-body v0.1.0
1:14:55 PM:    Compiling url v2.3.1
1:14:56 PM:    Compiling tokio v0.1.22
1:14:58 PM:    Compiling flate2 v1.0.25
1:14:58 PM:    Compiling mime_guess v2.0.4
1:14:59 PM:    Compiling parking_lot_core v0.3.1
1:14:59 PM:    Compiling idna v0.2.3
1:14:59 PM:    Compiling futures-cpupool v0.1.8
1:14:59 PM:    Compiling thiserror-impl v1.0.38
1:15:01 PM:    Compiling rand_isaac v0.1.1
1:15:01 PM:    Compiling rand_xorshift v0.1.1
1:15:01 PM:    Compiling rand_hc v0.1.0
1:15:01 PM:    Compiling rand_jitter v0.1.4
1:15:01 PM:    Compiling rand_os v0.1.3
1:15:01 PM:    Compiling rand v0.4.6
1:15:01 PM:    Compiling num-integer v0.1.45
1:15:01 PM:    Compiling unicode-segmentation v1.10.1
1:15:01 PM:    Compiling smallvec v1.10.0
1:15:02 PM:    Compiling curl v0.4.44
1:15:02 PM:    Compiling stable_deref_trait v1.2.0
1:15:02 PM:    Compiling owning_ref v0.4.1
1:15:02 PM:    Compiling heck v0.3.3
1:15:02 PM:    Compiling rand v0.3.23
1:15:02 PM:    Compiling publicsuffix v1.5.6
1:15:04 PM:    Compiling bzip2 v0.4.4
1:15:04 PM:    Compiling is-terminal v0.4.4
1:15:04 PM:    Compiling cookie v0.12.0
1:15:05 PM:    Compiling textwrap v0.11.0
1:15:05 PM:    Compiling rand v0.5.6
1:15:05 PM:    Compiling aho-corasick v0.7.20
1:15:07 PM:    Compiling try_from v0.3.2
1:15:07 PM:    Compiling socket2 v0.4.7
1:15:08 PM:    Compiling getrandom v0.2.8
1:15:08 PM:    Compiling filetime v0.2.20
1:15:08 PM:    Compiling xattr v0.2.3
1:15:08 PM:    Compiling concolor-query v0.1.0
1:15:08 PM:    Compiling termcolor v1.2.0
1:15:09 PM:    Compiling mime v0.3.16
1:15:09 PM:    Compiling regex-syntax v0.6.28
1:15:09 PM:    Compiling vec_map v0.8.2
1:15:09 PM:    Compiling dtoa v0.4.8
1:15:09 PM:    Compiling quick-error v1.2.3
1:15:09 PM:    Compiling strsim v0.8.0
1:15:10 PM:    Compiling ansi_term v0.12.1
1:15:10 PM:    Compiling lazy_static v0.2.11
1:15:10 PM:    Compiling scopeguard v0.3.3
1:15:10 PM:    Compiling lock_api v0.1.5
1:15:11 PM:    Compiling clicolors-control v0.2.0
1:15:11 PM:    Compiling clap v2.34.0
1:15:11 PM:    Compiling regex v1.7.1
1:15:17 PM:    Compiling humantime v1.3.0
1:15:17 PM:    Compiling serde_urlencoded v0.5.5
1:15:19 PM:    Compiling tar v0.4.38
1:15:22 PM:    Compiling concolor v0.0.11
1:15:22 PM:    Compiling uuid v0.8.2
1:15:22 PM:    Compiling cookie_store v0.7.0
1:15:23 PM:    Compiling parking_lot v0.12.1
1:15:24 PM:    Compiling zip v0.5.13
1:15:24 PM:    Compiling structopt-derive v0.4.18
1:15:25 PM:    Compiling uuid v0.7.4
1:15:25 PM:    Compiling tempfile v2.2.0
1:15:25 PM:    Compiling console v0.15.5
1:15:25 PM:    Compiling toml v0.5.11
1:15:25 PM:    Compiling os_info v2.0.8
1:15:26 PM:    Compiling base64 v0.10.1
1:15:27 PM:    Compiling termios v0.3.3
1:15:27 PM:    Compiling dirs v1.0.5
1:15:27 PM:    Compiling encoding_rs v0.8.32
1:15:27 PM:    Compiling hex v0.3.2
1:15:28 PM:    Compiling same-file v1.0.6
1:15:28 PM:    Compiling iana-time-zone v0.1.53
1:15:28 PM:    Compiling siphasher v0.2.3
1:15:28 PM:    Compiling is_executable v0.1.2
1:15:28 PM:    Compiling chrono v0.4.23
1:15:30 PM:    Compiling walkdir v2.3.2
1:15:31 PM:    Compiling console v0.6.2
1:15:31 PM:    Compiling human-panic v1.1.0
1:15:31 PM:    Compiling structopt v0.3.26
1:15:32 PM:    Compiling dialoguer v0.3.0
1:15:32 PM:    Compiling parking_lot v0.6.4
1:15:32 PM:    Compiling cargo_metadata v0.8.2
1:15:32 PM:    Compiling env_logger v0.5.13
1:15:33 PM:    Compiling which v2.0.1
1:15:33 PM:    Compiling toml v0.4.10
1:15:34 PM:    Compiling serde_ignored v0.0.4
1:15:34 PM:    Compiling glob v0.2.11
1:15:40 PM:    Compiling binary-install v0.0.2
1:15:42 PM:    Compiling hyper-tls v0.3.2
1:15:42 PM:    Compiling reqwest v0.9.24
1:15:43 PM:    Compiling wasm-pack v0.10.3
1:15:53 PM:     Finished release [optimized] target(s) in 1m 37s
1:15:54 PM:   Installing /opt/buildhome/.cargo/bin/wasm-pack
1:15:54 PM:    Installed package `wasm-pack v0.10.3` (executable `wasm-pack`)
1:15:55 PM: [INFO]: Checking for the Wasm target...
1:15:55 PM: info: downloading component 'rust-std' for 'wasm32-unknown-unknown'
1:15:55 PM: info: installing component 'rust-std' for 'wasm32-unknown-unknown'
1:15:57 PM: [INFO]: Compiling to Wasm...
1:15:57 PM:    Compiling proc-macro2 v1.0.51
1:15:57 PM:    Compiling unicode-ident v1.0.6
1:15:57 PM:    Compiling quote v1.0.23
1:15:57 PM:    Compiling wasm-bindgen-shared v0.2.84
1:15:57 PM:    Compiling log v0.4.17
1:15:57 PM:    Compiling syn v1.0.109
1:15:58 PM:    Compiling cfg-if v1.0.0
1:15:58 PM:    Compiling bumpalo v3.12.0
1:15:58 PM:    Compiling once_cell v1.17.1
1:15:58 PM:    Compiling wasm-bindgen v0.2.84
1:16:00 PM:    Compiling wasm-bindgen-backend v0.2.84
1:16:01 PM:    Compiling wasm-bindgen-macro-support v0.2.84
1:16:01 PM:    Compiling wasm-bindgen-macro v0.2.84
1:16:02 PM:    Compiling golden_triangle_graph v0.1.0 (/opt/build/repo)
1:16:02 PM:     Finished release [optimized] target(s) in 5.50s
1:16:02 PM: [INFO]: Installing wasm-bindgen...
1:16:04 PM: [INFO]: Optimizing wasm binaries with `wasm-opt`...
1:16:04 PM: [INFO]: Optional fields missing from Cargo.toml: 'description', 'repository', and 'license'. These are not necessary, but recommended
1:16:04 PM: [INFO]: :-) Done in 9.34s
1:16:04 PM: [INFO]: :-) Your wasm pkg is ready to publish at /opt/build/repo/pkg.
1:16:04 PM: > golden-triangle-graph@0.0.1 build
1:16:04 PM: > vite build
1:16:05 PM: vite v4.0.3 building for production...
1:16:05 PM: transforming...
1:16:07 PM: ✓ 1043 modules transformed.
1:16:07 PM: rendering chunks...
1:16:08 PM: computing gzip size...
1:16:08 PM: dist/assets/favicon-c91bed29.svg    0.53 kB
1:16:08 PM: dist/index.html                     0.60 kB
1:16:08 PM: dist/assets/index-b3bf50e6.css      1.41 kB │ gzip:  0.70 kB
1:16:08 PM: dist/assets/index-ec8f8ef5.js     250.58 kB │ gzip: 75.59 kB
1:16:08 PM: ​
1:16:08 PM: (build.command completed in 1m 51.6s)
1:16:08 PM: ​
1:16:08 PM:   2. Deploy site                                                
1:16:08 PM: ────────────────────────────────────────────────────────────────
1:16:08 PM: ​
1:16:08 PM: Starting to deploy site from 'dist'
1:16:08 PM: Starting post processing
1:16:08 PM: Calculating files to upload
1:16:08 PM: 2 new files to upload
1:16:08 PM: 0 new functions to upload
1:16:08 PM: Section completed: deploying
1:16:08 PM: Post processing - HTML
1:16:08 PM: Site deploy was successfully initiated
1:16:08 PM: ​
1:16:08 PM: (Deploy site completed in 267ms)
1:16:08 PM: ​
1:16:08 PM:   Netlify Build Complete                                        
1:16:08 PM: Post processing - header rules
1:16:08 PM: ────────────────────────────────────────────────────────────────
1:16:08 PM: ​
1:16:09 PM: Post processing - redirect rules
1:16:08 PM: (Netlify Build completed in 1m 51.9s)
1:16:08 PM: Caching artifacts
1:16:08 PM: Started saving node modules
1:16:09 PM: Post processing done
1:16:08 PM: Finished saving node modules
1:16:08 PM: Started saving build plugins
1:16:08 PM: Finished saving build plugins
1:16:09 PM: Section completed: postprocessing
1:16:08 PM: Started saving rust compile output
1:16:08 PM: Finished saving rust compile output
1:16:08 PM: Started saving corepack cache
1:16:08 PM: Finished saving corepack cache
1:16:08 PM: Started saving pip cache
1:16:08 PM: Finished saving pip cache
1:16:08 PM: Started saving emacs cask dependencies
1:16:08 PM: Finished saving emacs cask dependencies
1:16:08 PM: Started saving maven dependencies
1:16:08 PM: Finished saving maven dependencies
1:16:08 PM: Started saving boot dependencies
1:16:08 PM: Finished saving boot dependencies
1:16:08 PM: Started saving rust rustup cache
1:16:10 PM: Site is live ✨
1:16:11 PM: Finished saving rust rustup cache
1:16:11 PM: Started saving rust cargo registry cache
1:16:12 PM: Finished saving rust cargo registry cache
1:16:12 PM: Started saving rust cargo bin cache
1:16:12 PM: Finished saving rust cargo bin cache
1:16:12 PM: Started saving go dependencies
1:16:12 PM: Finished saving go dependencies
1:16:12 PM: Build script success
1:16:12 PM: Section completed: building
1:16:15 PM: Uploading Cache of size 604.6MB
1:16:19 PM: Section completed: cleanup
1:16:19 PM: Finished processing build request in 2m22.081s
```

That did it! We can see in the console log the number `64` which is the result of javascript calling the wasm file from the `src/App.jsx` file.

Here's the rust:

```rust
#[no_mangle]
pub extern "C" fn add_one(x: i32) -> i32 {
    x + 1
}
```

Here's the javascript:

```js
import * as wasm from '../pkg/golden_triangle_graph_bg.wasm'
console.log(wasm.add_one(63))
```

This is so beautiful... gotta love `wasm-pack`, we don't have to worry about importing asynchronous code into our project as we did when we were generating the wasm file directly from the rust compiler.

## Where do we go from here?

So, the output is quite trivial, but now we are able to add rust to this project and never have to worry about the deployment details again.

Next steps are to go through some of the javascript utilities used to generate the graph and see if we can move the functions over to rust. There are so many excellent tools out there in the rust world that we can use to accomplish this. As a webdev, we are particularly interested in [`web-sys`](https://rustwasm.github.io/wasm-bindgen/web-sys/index.html#the-web-sys-crate) for generating dom nodes outside of the javascript runtime. So many possibilities!