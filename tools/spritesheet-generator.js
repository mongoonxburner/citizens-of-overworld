const {createAlchemyWeb3} = require("@alch/alchemy-web3");
const sharp = require("sharp");
const svg2png = require("svg2png");
const {JSDOM} = require("jsdom");
const fs = require("fs");

const abi = JSON.parse(fs.readFileSync("./scripts/testing/abi.json"));
const contractAddress = JSON.parse(fs.readFileSync("./scripts/testing/contract-address.json")).contract;
const dotenv = require("dotenv");
dotenv.config();
const web3 = createAlchemyWeb3(`wss://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`);

var IMG_WIDTH = 32;
var IMG_HEIGHT = 32;

const ANIMATED_FRAME_FILLS = ["red", "orangered", "orange", "#FFAA33", "yellow", "#9ACD32", "green", "#0D98BA", "blue", "#8A2BE2", "violet", "#A71F8B"];

const NUM_SPRITE_FRAMES = ANIMATED_FRAME_FILLS.length; // 12

function getContract() {
  const contract = new web3.eth.Contract(abi, contractAddress);
  return contract;
}

/**
 * Calls contract to get SVG for tokenId.
 *
 * @param {Contract} contract
 * @param {number} tokenId
 * @returns {String} svg
 */
async function getSVGFromContract(contract, tokenId) {
  var svg = await contract.methods.tokenIdToSVG(tokenId).call();
  return svg;
}

/**
 * Reduces the size of the SVG to 32x32 and removes animation and shadow elements.
 *
 * @param {String} svg
 * @returns {String} svg with reduced size and removed animation and shadow elements
 */
function parseSVGToSpriteSize(svg) {
  var svgString = svg.toString();

  // replace width="640" height="640" with width="32" height="32"
  var svgString32x32 = svgString.replace(/width="640"/g, 'width="' + IMG_WIDTH + '"');
  svgString32x32 = svgString32x32.replace(/height="640"/g, 'height="' + IMG_HEIGHT + '"');

  // remove viewBox="-4.5 -5 42 42"
  var svgWithoutViewBox = svgString32x32.replace(/viewBox="-4.5 -5 42 42"/g, "");

  // remove style="..."
  var svgWithoutStyle = svgWithoutViewBox.replace(/style="[^"]*"/g, "");

  // remove <animateTransform>...</animateTransform>
  var svgWithoutAnimateTransform = svgWithoutStyle.replace(/<animateTransform[^>]*>/g, "");

  // remove <ellipse>...</ellipse>
  var svgWithoutEllipseElement = svgWithoutAnimateTransform.replace(/<ellipse.*?\/ellipse>/g, "");

  return svgWithoutEllipseElement;
}

/**
 * Checks if a Citizen has a rainbow trait.
 *
 * @param {DNA} dna
 * @returns {boolean} true if the Citizen has a rainbow trait
 */
function checkForRainbowTrait(dna) {
  return dna.Pants == 15 || dna.Shirt == 20 || dna.Hat == 32 || dna.Accessory == 6;
}

/**
 * Gets PNG frames for a Citizen with no rainbow trait(s) and no legendary attribute.
 *
 * First, we convert the original SVG to a PNG.
 * Then, we create a second SVG with the pixels above the Citizen's legs shifted down by 1 pixel.
 * We then convert both to PNGs, and duplicate/alternate them for 3 frames each to create all 12 animation frames.
 * (e.g. frame 1 = original, frame 2 = original, frame 3 = original, frame 4 = shifted, frame 5 = shifted, frame 6 = shifted, etc.)
 *
 * @param {String} unparsedSvg
 * @returns {List[PNG]} list of frames as PNGs
 */
async function getAnimationPNGFrames(unparsedSvg) {
  let svg = parseSVGToSpriteSize(unparsedSvg);
  let dom = new JSDOM(svg);
  let rects = dom.window.document.getElementsByTagName("rect");

  for (let i = 0; i < rects.length; i++) {
    let rect = rects[i];
    let x = parseInt(rect.getAttribute("x"));
    let y = parseInt(rect.getAttribute("y"));

    if (y <= 28 || x < 9) {
      rect.setAttribute("y", y + 1);
    }
  }

  let updatedSvg = dom.serialize();

  var frames = [];

  var frame1 = await getPngFromSvg(svg);

  var frame2 = await getPngFromSvg(updatedSvg);

  for (let i = 0; i < NUM_SPRITE_FRAMES; i++) {
    if ((0 <= i && i <= 2) || (6 <= i && i <= 8)) {
      frames.push(frame1);
    }
    if ((3 <= i && i <= 5) || (9 <= i && i <= 11)) {
      frames.push(frame2);
    }
  }

  return frames;
}

/**
 * Gets PNG frames for a Citizen with rainbow trait(s).
 *
 * For each rainbow color, we replace the <animate> element with a <linearGradient> element setting the fill to the rainbow color.
 * Then we convert the SVG to a PNG.
 * We do this for each frame of the animation (12 frames).
 *
 * @param {String} an SVG
 * @returns {List[PNG]} list of frames as PNGs
 */
async function getFramesForRainbowTrait(svg) {
  var frames = [];
  // for each frame
  for (let j = 0; j < NUM_SPRITE_FRAMES; j++) {
    var parsedSVG = parseSVGToSpriteSize(svg);

    var frame = await getRainbowAnimationFrame(parsedSVG, j);

    var png = await getPngFromSvg(frame);

    frames.push(png);
  }

  return frames;
}

/**
 * Given an SVG and frame index, replaces the <animate> element with a <linearGradient> element setting the fill to the proper rainbow color based on the frame index.
 *
 * @param {String} svg
 * @param {number} frameIndex
 * @returns {String} an SVG with the <animate> element replaced
 */
async function getRainbowAnimationFrame(svg, frameIndex) {
  var svgString = svg.toString();

  var ANIMATION_REPLACEMENT = `<linearGradient id="0"><stop offset="100%" stop-color="${ANIMATED_FRAME_FILLS[frameIndex]}" /></linearGradient>`;

  var svgWithFrame = svgString.replace(/<animate xmlns=\"http:\/\/www.w3.org\/2000\/svg\" href=\"#r\".*?\/>/g, ANIMATION_REPLACEMENT);

  return svgWithFrame;
}

/**
 * Gets pre-made PNG spritesheet for a Citizen with a legendary attribute.
 *
 * @param {number} legendaryIndex
 * @returns {boole
 */
async function getLegendarySpritesheet(legendaryIndex) {
  var legendaryPng = sharp(`./spritesheets/legendary-${legendaryIndex}.png`);
  const legendaryBuffer = await Promise.resolve(legendaryPng.toBuffer());
  return legendaryBuffer;
}

/**
 * Converts an SVG to a PNG.
 *
 * @param {String} svg
 * @returns {PNG} png
 */
async function getPngFromSvg(svg) {
  const png = await svg2png(svg, {width: IMG_WIDTH, height: IMG_HEIGHT});
  return png;
}

/**
 * Given a list of PNGs, raturns a 256x64 spritesheet with 12 frames of original 32x32 png on top and 12 frames of y-flipped 32x32 on bottom.
 *
 * @param {List[PNG]} frames
 * @returns {PNG} spritesheet
 */
async function createSpritesheet(frames) {
  var composites = [];
  for (let i = 0; i < frames.length; i++) {
    const original = sharp(frames[i]);
    const flipped = sharp(frames[i]).flop();

    const [originalBuffer, flippedBuffer] = await Promise.all([original.toBuffer(), flipped.toBuffer()]);

    sharp(originalBuffer);
    sharp(flippedBuffer);

    composites.push({
      input: originalBuffer,
      top: 0,
      left: IMG_WIDTH * i,
    });
    composites.push({
      input: flippedBuffer,
      top: IMG_HEIGHT,
      left: IMG_WIDTH * i,
    });
  }

  const spritesheet = await sharp({
    create: {
      width: IMG_WIDTH * 12,
      height: IMG_HEIGHT * 2,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .png()
    .composite(composites)
    .toBuffer();

  return spritesheet;
}

async function main() {
  console.log("Running token-svg-to-sprite-png.js...");

  // STEP 1: Get the Citizens of Overworld contract
  const contract = getContract();

  // STEP 2: Get the max supply of the contract
  const maxSupply = await contract.methods.totalSupply().call();

  // start benchmark
  var start = new Date().getTime();

  // STEP 3: For each token, get the seed, DNA, and SVG. Then, create a spritesheet for each token and write to ./spriesheets directory
  for (let i = 0; i < maxSupply; i++) {
    // STEP 3a: Get seed from contract
    var seed = await contract.methods.tokenIdToSeed(i).call();

    // STEP 3b: Get SVG from contract
    var svg = await getSVGFromContract(contract, i);

    // STEP 3c: Get DNA from contract
    var dna = await contract.methods.getDNA(seed).call();

    // STEP 3d: Check if legendary or has rainbow trait
    var isLegendary = dna.Legendary > 0;
    var hasRainbowTrait = checkForRainbowTrait(dna);

    // STEP 3e: Get the 12 animation frames for this Citizen
    var frames = [];
    // if Citizen is legendary, skip, since we'll read a pre-made spritesheet
    if (isLegendary) console.log("Citizen " + i + " is legendary! Skipping...");
    // if Citizen has a rainbow trait, we need to create 12 SVG frames then convert all 12 to PNG
    else if (hasRainbowTrait) frames = await getFramesForRainbowTrait(svg);
    // if Citizen is not legendary and has no rainbow trait, we only need to create 2 PNG frames, which we can then loop and alternate to get all 12 frames
    else frames = await getAnimationPNGFrames(svg);

    // STEP 3f:  Create spritesheet from frames
    var spritesheet;
    // if legendary, read the pre-made spritesheet based on the legendary index
    if (isLegendary) {
      spritesheet = await getLegendarySpritesheet(dna.Legendary);
    }
    // else, create the spritesheet from the frames
    else {
      spritesheet = await createSpritesheet(frames);
    }

    // STEP 3g: Write the spritesheet to file
    fs.writeFileSync("./spritesheets/" + i + ".png", spritesheet);
  }

  // end benchmark
  var end = new Date().getTime();
  var time = end - start;
  console.log("Execution time: " + time);

  console.log("done");
  // exit process
  process.exit(0);
}

main();
