const sharp = require("sharp");
const toIco = require("image-to-ico");
const fs = require("fs").promises;
const path = require("path");

function Sleep(milliseconds) {
return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function generateIcoFavicon({ width, height, density }, sourcePath) {
  const faviconDimensions = [32, 64];
  // Create buffer for each size
  return Promise.all(
    faviconDimensions.map((dimension) =>
      sharp(sourcePath, {
        density: (dimension / Math.max(width, height)) * density,
      })
        .resize(dimension, dimension)
        .toBuffer()
    )
  ).then((buffers) => toIco(buffers));
}

function generatePngFavicon({ density, width, height }, sourcePath) {
  return sharp(sourcePath, {
    density: (180 / Math.max(width, height)) * density,
  })
    .resize(180, 180)
    .png()
    .toBuffer();
}

async function saveFile(destination) {
  return async function (buffer) {
    return await fs.writeFile(destination, buffer);
  };
}

const faviconTypes = [
  ["favicon.ico", generateIcoFavicon],
  ["apple-touch-icon.png", generatePngFavicon],
];

const defaultOptions = {
  destination: "./_site",
};

module.exports = function (config, options = defaultOptions) {

  const destination = options.destination || defaultOptions.destination;

  config.addAsyncShortcode("favicon", async function (img) {

    if (!img) {
      try {
        await fs.unlink(`${destination}/apple-touch-icon.png`);
      } catch {
        // nothing to do here - if the file isn't there ... it isn't there
      }
      try {
        await fs.unlink(`${destination}/favicon.ico`);
      } catch {
        // nothing to do here - if the file isn't there ... it isn't there
      }
      return '';
    }

    let faviconFile = path.join(process.cwd(), '/public/', img.url);

    if (img.ext == '.ico' || img.mime == "image/x-icon") {
      try {
        await fs.copyFile(faviconFile, `${destination}/favicon.ico`);
      } catch(e) {
        await Sleep(100);
        try {
          await fs.copyFile(faviconFile, `${destination}/favicon.ico`);
        }
        catch(e) {
          console.log('Error: Couldn\'t copy Favicon File!');
        }
      }
      try {
        await fs.unlink(`${destination}/apple-touch-icon.png`);
      } catch(e) {
        // nothing to do here - if the file isn't there ... it isn't there
      }
      return `
<link rel="icon" href="/favicon.ico">      
      `;
    }
    else {
      const metadata = await sharp(faviconFile).metadata();
      faviconTypes.forEach(async ([name, generator]) =>
        generator(metadata, faviconFile).then(
          await saveFile(`${destination}/${name}`)
        )
      );

      return `
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
      `;
    }

  });
};
