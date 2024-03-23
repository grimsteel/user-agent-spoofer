// user-agents by default exposes a class which extends "Function"
// This class then calls super() in the constructor
// This results in a call to Function, which is not allowed in extensions
// This script removes this behavior as we don't need it for our use of user-agents

import { readFile, writeFile } from "node:fs/promises";

let contents = await readFile("node_modules/user-agents/src/user-agent.js", "utf8");

contents = contents.replace(" extends Function", "");
contents = contents.replace("super();", "");

await writeFile("node_modules/user-agents/src/user-agent.js", contents);