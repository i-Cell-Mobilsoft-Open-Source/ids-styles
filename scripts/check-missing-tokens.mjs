import { readFileSync, readdirSync } from "fs";

const stylesRootPath = process.argv[2];
const tokensFile = process.argv[3];
const maxMissingTokenArg = parseInt(process.argv[4], 10);

const stylesDirents = readdirSync(stylesRootPath, { withFileTypes: true, recursive: true, encoding: "utf-8" });
const cssDirents = stylesDirents.filter((dirent) => dirent.isFile() && /.min.css$/.test(dirent.name));

const tokenFileContent = readFileSync(tokensFile, { encoding: "utf-8" });
const tokenRegExp = /--(-|\w|\d)+(?=:.*;)/g;
const tokenList = tokenFileContent.match(tokenRegExp);

const missingTokenList = [];

cssDirents.forEach((dirent) => {
  const fileFullName = `${dirent.path}/${dirent.name}`;
  const cssFileContent = readFileSync(fileFullName, { encoding: "utf-8" });
  const cssVariableRegExp = /(?<=var\()(-|\w|\d)+(?=\))/g;
  const usedCssVariableList = cssFileContent.match(cssVariableRegExp);

  usedCssVariableList.forEach((cssVariable) => {
    const tokenExists = tokenList.some((token) => token === cssVariable);
    if (!tokenExists) {
      missingTokenList.push(cssVariable);
    }
  });
});

const missingTokensCount = missingTokenList.length;
if (missingTokensCount > 0) {
  const MAX_PRINTABLE_MISSING_TOKENS = isNaN(maxMissingTokenArg) ? 1000 : maxMissingTokenArg;

  const printableMissingTokens =
    missingTokensCount <= MAX_PRINTABLE_MISSING_TOKENS
      ? missingTokenList
      : [
          ...missingTokenList.slice(0, MAX_PRINTABLE_MISSING_TOKENS - 1),
          `...and ${missingTokensCount - MAX_PRINTABLE_MISSING_TOKENS} more.`,
        ];
  throw new Error(`${missingTokensCount} tokens are missing` + "\n" + printableMissingTokens.join("\n"));
}

console.info("Great! No tokens are missing.");
