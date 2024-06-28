import { readFileSync, readdirSync } from 'fs';
import { program } from 'commander';

program
  .name('check-missing-tokens')
  .version('1.0.0')
  .description('Script to check missing tokens in CSS files.')
  .arguments('<cssRootFolder> <tokenCssFile> [fileFilterPattern]')
  .option('--limit <number>', 'Maximum number of missing tokens to log', parseInt)
  .option('-v, --verbose', 'Enable verbose logging')
  .action((cssRootFolder, tokenCssFile = '', fileFilterPattern = '') => {
    const options = program.opts();
    const limit = options.limit !== undefined ? options.limit : Infinity;
    const verbose = options.verbose;

    try {
      const stylesDirents = readdirSync(cssRootFolder, { withFileTypes: true, recursive: true, encoding: 'utf-8' });
      const cssDirents = stylesDirents
        .filter((dirent) => dirent.path !== cssRootFolder)
        .filter((dirent) => dirent.isFile() && /.min.css$/.test(dirent.name));

      let filteredCssDirents = [];

      if (fileFilterPattern) {
        filteredCssDirents = cssDirents.filter((dirent) => {
          const fileFullName = `${dirent.path}/${dirent.name}`;
          return new RegExp(fileFilterPattern).test(fileFullName);
        });

        if (filteredCssDirents.length === 0) {
          throw new Error('No matching style file found.');
        }
      }

      const tokenFileContent = readFileSync(tokenCssFile, { encoding: 'utf-8' });
      const tokenRegExp = /--(-|\w|\d)+(?=:.*;)/g;
      const tokenSet = new Set(tokenFileContent.match(tokenRegExp));

      const missingTokenSet = new Set();

      const cssVariableRegExp = /(?<=var\()(-|\w|\d)+(?=\))/g;

      const files = fileFilterPattern ? filteredCssDirents : cssDirents;

      files.forEach((dirent) => {
        const fileFullName = `${dirent.path}/${dirent.name}`;
        const cssFileContent = readFileSync(fileFullName, { encoding: 'utf-8' });
        const usedCssVariableList = cssFileContent.match(cssVariableRegExp);

        usedCssVariableList.forEach((cssVariable) => {
          const tokenExists = tokenSet.has(cssVariable);
          if (!tokenExists) {
            missingTokenSet.add(cssVariable);
          }
        });
      });

      const missingTokensCount = missingTokenSet.size;
      if (missingTokensCount > 0) {
        const missingTokenList = Array.from(missingTokenSet);
        const printableMissingTokens =
          missingTokensCount <= limit || limit === Infinity
            ? missingTokenList
            : [...missingTokenList.slice(0, limit), `...and ${missingTokensCount - limit} more.`];
        throw new Error(`${missingTokensCount} tokens are missing` + '\n' + printableMissingTokens.join('\n'));
      }

      console.info('Great! No tokens are missing.');
    } catch (error) {
      console.error(error.message);
    }
  });

program.parse(process.argv);
