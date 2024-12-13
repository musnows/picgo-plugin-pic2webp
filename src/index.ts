import { IPicGo } from 'picgo'
import fs from "fs"
import path from "path"
import webp_converter from "webp-converter"
import pLimit from 'p-limit';

const PLUGIN_NAME = "pic2webp";
let ignore: string[] = [];

const changeExt = (pic, oe) => {
  if (!oe.startsWith('.')) {
    oe = '.' + oe;
  }

  const po = path.parse(pic);
  po.ext = oe;

  return path.format(po);
}

const beforeTransformPlugins = { 
    async handle(ctx: IPicGo) {
    ignore = [];
    const uploads: string[] = [];

    const limit = pLimit(5);

    const tasks = ctx.input.map((pic: string) => limit(async () => {
      try {
        if (path.extname(pic) === '.webp') {
          ignore.push(pic);
          uploads.push(pic);
          return;
        }

        if (!path.isAbsolute(pic)) {
          throw new Error('Invalid file path');
        }

        const webp = changeExt(pic, '.webp');
        await webp_converter.cwebp(pic, webp, '-q 80', '-v');
        uploads.push(webp);
      } catch (err) {
        ctx.log.error(`Error converting ${pic} to webp: ${err.message || err}`);
        ctx.emit('notification', {
          title: 'pic2webp plugin error',
          body: `Error converting ${pic} to webp:` + err.message || err
        });
      }
    }));

    await Promise.all(tasks);

    ctx.input = uploads;
    return ctx;
  }
};

const afterUploadPlugins = {
  handle(ctx: IPicGo) {
    const ignoreSet = new Set(ignore);

    ctx.input.forEach(async (pic) => {
      try {
        if (!ignoreSet.has(pic)) {
          await fs.promises.unlink(pic);
        }
      } catch (err) {
        ctx.log.error(`Error deleting file ${pic}: ${err.message || err}`);
        for (let i = 0; i < 3; i++) {
          try {
            await fs.promises.unlink(pic);
            break;
          } catch (retryErr) {
            ctx.log.error(`Retry deleting file ${pic} attempt ${i + 1}: ${retryErr.message || retryErr}`);
          }
        }
      }
    });
  }
};

const registerPlugin = (ctx: IPicGo) => {
  const register = () => {
      ctx.helper.beforeTransformPlugins.register(PLUGIN_NAME, beforeTransformPlugins);
      ctx.helper.afterUploadPlugins.register(PLUGIN_NAME, afterUploadPlugins);
  }
  return {
    register,
  }
}

export default registerPlugin