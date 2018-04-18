import { dirname } from 'path';
import { writeFileSync } from 'fs';
import { renderSync } from 'node-sass';
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './style.js';
import { ensureFileSync } from 'fs-extra';

export default function plugin (options = {}) {
  const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
  const insertFnName = '___$insertStyle';
  const styles = [];
  const styleMaps = {};
  let prependSass = '';

  options.output = options.output || false;
  options.insert = options.insert || false;
  options.processor = options.processor || null;
  options.options = options.options || null;

  if (options.options && options.options.data) {
    prependSass = options.options.data;
    delete options.options.data;
  }

  return {
    name: 'sass',

    intro () {
      if (options.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    async transform (code, id) {
      if (!filter(id)) {
        return null;
      }

      const paths = [dirname(id), process.cwd()];
      const baseConfig = prependSass
        ? { data: `${prependSass}${code}` }
        : { file: id };
      const sassConfig = Object.assign(baseConfig, options.options);

      sassConfig.includePaths = sassConfig.includePaths
        ? sassConfig.includePaths.concat(paths)
        : paths;
      try {
        const result = renderSync(sassConfig);
        let code = '';
        let {
          css,
          map,
        } = result;

        console.log(sassConfig);
        console.log(result);

        css = css.toString();
        map = map && map.toString();
        if (css.trim()) {
          if (isFunction(options.processor)) {
            css = await options.processor(css, id);
          }
          if (styleMaps[id]) {
            styleMaps[id].content = css;
          } else {
            styles.push(styleMaps[id] = {
              id: id,
              content: css,
            });
          }
          css = JSON.stringify(css);
          if (options.insert === true) {
            code = `${insertFnName}(${css});`;
          } else if (options.output === false) {
            code = css;
          } else {
            code = `"";`;
          }
        }
        return {
          code: `export default ${code};`,
          map: { mappings: '' },
        };
      } catch (error) {
        throw error;
      }
    },

    async ongenerate (opts) {
      if (!options.insert && (!styles.length || options.output === false)) {
        return;
      }

      const css = styles.map(style => style.content).join('');
      let dest = opts.file;

      if (isString(options.output)) {
        ensureFileSync(options.output, (err) => {
          if (err) {
            throw err;
          }
        });
        return writeFileSync(options.output, css);
      } else if (isFunction(options.output)) {
        return options.output(css, styles);
      } else if (!options.insert && dest) {
        if (dest.endsWith('.js') || dest.endsWith('.ts')) {
          dest = dest.slice(0, -3);
        }
        dest = `${dest}.css`;
        ensureFileSync(dest, (err) => {
          if (err) {
            throw err;
          }
        });
        return writeFileSync(dest, css);
      }
    },
  };
}
