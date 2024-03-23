import UserAgent from "user-agents/src/index";

const rulesContainer = document.querySelector<HTMLTableSectionElement>("#table-rules tbody")!;
const dialogAddRule = document.querySelector<HTMLDialogElement>("#dialog-add-rule")!;
const formAddRule = dialogAddRule.querySelector("form")!;

const inputName = document.querySelector<HTMLInputElement>("#input-name")!;
const inputUrlFilter = document.querySelector<HTMLInputElement>("#input-url-filter")!;
const inputUserAgent = document.querySelector<HTMLInputElement>("#input-user-agent")!;
const inputFilter = document.querySelector<HTMLInputElement>("#input-filter")!;

const btnAddRule = document.querySelector<HTMLButtonElement>("#btn-add-rule")!;
const btnGenerateUserAgent = document.querySelector<HTMLButtonElement>("#btn-generate-user-agent")!;

interface Rule {
  name: string;
  urlFilter: string;
  userAgent: string;
  id: number;
}

async function getRuleMetadata() {
  return (await browser.storage.local.get({
    ruleMetadata: {} // default to empty object
  }))["ruleMetadata"] as Record<string, string>;
}

async function deleteRule(id: number) {
  // Delete from DNR
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [id]
  });

  // Delete metadata from storage
  const ruleMetadata = await getRuleMetadata();
  delete ruleMetadata[id.toString()];
  await browser.storage.local.set({ ruleMetadata });
}

function createRuleRow(rule: Rule) {
  const row = document.createElement("tr");
  row.appendChild(document.createElement("th")).innerText = rule.name;
  row.appendChild(document.createElement("td")).innerText = rule.urlFilter;
  row.appendChild(document.createElement("td")).innerText = rule.userAgent;

  const actions = row.appendChild(document.createElement("td"));

  // Button which deletes the rule 
  const btnDelete = actions.appendChild(document.createElement("button"));
  btnDelete.innerText = "Delete";
  btnDelete.type = "button";
  btnDelete.addEventListener("click", async () => {
    await deleteRule(rule.id);
    row.remove();
  });

  return row;
}

// Query if we have a host permission and prompt the user if not
async function queryRequestPermission(origin: string) {
  //if (await browser.permissions.contains({ origins: [origin] })) return true;

  return await browser.permissions.request({ origins: [origin] });
}

// Extract the user agent out of a DNR rule
function getUserAgent(rule: browser.declarativeNetRequest.Rule) {
  const reqHeaders = rule.action.requestHeaders;
  if (reqHeaders) {
    // Find the User-Agent header
    const userAgentHeader = reqHeaders.find(rh => rh.header.toLowerCase() === "user-agent");
    if (userAgentHeader && userAgentHeader.operation === "set") {
      return userAgentHeader.value!;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

async function initializeRuleTable() {
  const rawRules = await browser.declarativeNetRequest.getDynamicRules();
  const ruleMetadata = await getRuleMetadata();

  // Convert DNR rules into our `Rule` objects
  const rules: Rule[] = rawRules.map(rule => ({
    name: ruleMetadata[rule.id.toString()] ?? "Unknown name",
    urlFilter: rule.condition.urlFilter ?? "",
    userAgent: getUserAgent(rule) ?? "",
    id: rule.id
  }));

  rulesContainer.textContent = "";

  for (const rule of rules) {
    rulesContainer.appendChild(createRuleRow(rule));
  }
}

btnAddRule.addEventListener("click", () => dialogAddRule.showModal());
formAddRule.addEventListener("submit", async () => {
  const name = inputName.value;
  const urlFilter = inputUrlFilter.value;
  const userAgent = inputUserAgent.value;

  // First check if we have the host permission
  if (await queryRequestPermission(urlFilter)) {
    const existingIds = (await browser.declarativeNetRequest.getDynamicRules())
      .map(r => r.id)
      .sort((a, b) => a - b);

    // Biggest ID + 1
    const newId = (existingIds[existingIds.length - 1] ?? 0) + 1;
    
    // Add this rule
    await browser.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: newId,
        condition: {
          urlFilter,
          excludedResourceTypes: []
        },
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              operation: "set",
              header: "user-agent",
              value: userAgent
            },
            {
              operation: "set",
              header: "sec-ch-ua-platform",
              value: "Unknown"
            }
          ]
        }
      }]
    });

    // Update the metadata
    const ruleMetadata = await getRuleMetadata();
    ruleMetadata[newId.toString()] = name;
    await browser.storage.local.set({ ruleMetadata });
    
    await initializeRuleTable();
  }

  formAddRule.reset();
});

// Generate a user agent using the filter provided
btnGenerateUserAgent.addEventListener("click", () => {
  if (inputFilter.value) {
    const regex = new RegExp(inputFilter.value);
    const userAgent = new UserAgent(regex).toString();
    inputUserAgent.value = userAgent;
  } else {
    inputUserAgent.value = new UserAgent().toString();
  }
});

initializeRuleTable();