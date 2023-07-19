import { checkForVariables } from "../utils/controller/checkForVariables";
import { getStorageConfig } from "../utils/controller/getStorageConfig";

import { stylesToTokens } from "../utils/styles/stylesToTokens";
// import { colorStylesToTokens } from "../utils/styles/colorStylesToTokens";
// import { textStylesToTokens } from "../utils/styles/textStylesToTokens";
// import { gridStylesToTokens } from "../utils/styles/gridStylesToTokens";
// import { effectStylesToTokens } from "../utils/styles/effectStylesToTokens";

import { variablesToTokens } from "../utils/variablesToTokens";
import { mergeVaraiblsAndStyleTokens } from "../utils/mergeVaraiblsAndStyleTokens";

import { removeDollarSign } from "../utils/removeDollarSign";

import { config } from "../utils/config";

// clear console on reload
console.clear();

////////////////////////
// EXPORT TOKENS ///////
////////////////////////

const figmaRoot = figma.root;
console.log("figmaRoot", figmaRoot);

const pluginConfigKey = "tokenbrücke-config";

getStorageConfig(pluginConfigKey);

//
let isCodePreviewOpen = false;

const frameWidthWithCodePreview = 800;
const frameWidth = isCodePreviewOpen
  ? frameWidthWithCodePreview
  : config.frameWidth;

figma.showUI(__html__, {
  width: 300,
  height: 600,
  themeColors: true,
});

let JSONSettingsConfig: JSONSettingsConfigI;

const getTokens = async () => {
  const variableCollection =
    figma.variables.getLocalVariableCollections() as VariableCollection[];
  const variables = figma.variables.getLocalVariables() as Variable[];

  const variableTokens = await variablesToTokens(
    variables,
    variableCollection,
    JSONSettingsConfig
  );

  const styleTokens = await stylesToTokens(
    JSONSettingsConfig.includeStyles,
    JSONSettingsConfig.colorMode,
    variableTokens
  );

  // console.log("styleTokens", styleTokens);

  const mergedVariables = mergeVaraiblsAndStyleTokens(
    variableTokens,
    styleTokens,
    JSONSettingsConfig.selectedCollection
  );

  // console.log("mergedVariables", mergedVariables);

  return mergedVariables;
};

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  await checkForVariables(msg.type);

  // get JSON settings config from UI and store it in a variable
  if (msg.type === "JSONSettingsConfig") {
    // update JSONSettingsConfig
    JSONSettingsConfig = msg.config;

    // console.log("updated JSONSettingsConfig received", JSONSettingsConfig);

    // handle client storage
    await figma.clientStorage.setAsync(
      pluginConfigKey,
      JSON.stringify(JSONSettingsConfig)
    );
  }

  // generate tokens and send them to the UI
  if (msg.type === "getTokens") {
    await getTokens().then((tokens) => {
      const isDTCGKeys = JSONSettingsConfig.useDTCGKeys;
      const updatedTokens = isDTCGKeys ? tokens : removeDollarSign(tokens);

      figma.ui.postMessage({
        type: "setTokens",
        tokens: updatedTokens,
        role: msg.role,
        server: msg.server,
      } as TokensMessageI);
    });
  }

  // change size of UI
  if (msg.type === "resizeUIHeight") {
    figma.ui.resize(frameWidth, msg.height);
  }

  if (msg.type === "openCodePreview") {
    console.log("openCodePreview", msg.isCodePreviewOpen);

    isCodePreviewOpen = msg.isCodePreviewOpen;
    figma.ui.resize(frameWidthWithCodePreview, msg.height);
  }
};
