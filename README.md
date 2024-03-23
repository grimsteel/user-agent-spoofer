# User Agent Spoofer

Firefox extension to change your user agent. Includes up to date user agent data from [`user-agents`](https://www.npmjs.com/package/user-agents).

## Build Instructions (for AMO reviewers)

### Tools required

* `node` (built using v20.10.0)
* `npm` (built using v10.5.0)
* `gunzip` (built using gzip v1.12)
* `zip` (built using Zip v3.0)

1. Install dependencies: `npm ci`
2. Setup `user-agents` for building manually: `npm run setup-user-agents`
  
    Unfortunately, the prebuilt version of `user-agents` distributed on NPM cannot be used in an extension, as it includes a call to `Function()`. See `setup-user-agents.js` for more information.
3. Build: `npm run build`
4. Package it into a zip file: `npm run package`
5. The output will be in `extension.zip`. This is what I upload to AMO