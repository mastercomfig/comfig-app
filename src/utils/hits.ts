import { WaveFile } from "wavefile";
import WaveSurfer from "wavesurfer.js";

import { getNonce } from "./nonce";

// Adapted from MS-ADPCM decoder
// https://github.com/Snack-X/node-ms-adpcm
// Public Domain

const LE = true;
const BE = false;

const ADAPTATION_TABLE = [
  230, 230, 230, 230, 307, 409, 512, 614, 768, 614, 512, 409, 307, 230, 230,
  230,
];

function clamp(val, min, max) {
  if (val < min) return min;
  else if (val > max) return max;
  else return val;
}

function expandNibble(nibble, state, channel) {
  const signed = 8 <= nibble ? nibble - 16 : nibble;

  let predictor =
    ((state.sample1[channel] * state.coeff1[channel] +
      state.sample2[channel] * state.coeff2[channel]) >>
      8) +
    signed * state.delta[channel];

  predictor = clamp(predictor, -0x8000, 0x7fff);

  state.sample2[channel] = state.sample1[channel];
  state.sample1[channel] = predictor;

  state.delta[channel] = Math.floor(
    (ADAPTATION_TABLE[nibble] * state.delta[channel]) / 256,
  );
  if (state.delta[channel] < 16) state.delta[channel] = 16;

  return predictor;
}

function decodeMsAdpcmBlock(buf, channels, coefficient1, coefficient2) {
  const state = {
    coefficient: [coefficient1, coefficient2],
    coeff1: [],
    coeff2: [],
    delta: [],
    sample1: [],
    sample2: [],
  };

  let offset = 0;

  // Read MS-ADPCM header
  for (let i = 0; i < channels; i++) {
    const predictor = clamp(buf.getUint8(offset, LE), 0, 6);
    offset += 1;

    state.coeff1[i] = state.coefficient[0][predictor];
    state.coeff2[i] = state.coefficient[1][predictor];
  }

  for (let i = 0; i < channels; i++) {
    state.delta.push(buf.getInt16(offset, LE));
    offset += 2;
  }
  for (let i = 0; i < channels; i++) {
    state.sample1.push(buf.getInt16(offset, LE));
    offset += 2;
  }
  for (let i = 0; i < channels; i++) {
    state.sample2.push(buf.getInt16(offset, LE));
    offset += 2;
  }

  // Decode
  const output = [];

  for (let i = 0; i < channels; i++)
    output[i] = [state.sample2[i], state.sample1[i]];

  let channel = 0;
  while (offset < buf.byteLength) {
    const byte = buf.getUint8(offset, LE);
    offset += 1;

    output[channel].push(expandNibble(byte >> 4, state, channel));
    channel = (channel + 1) % channels;

    output[channel].push(expandNibble(byte & 0xf, state, channel));
    channel = (channel + 1) % channels;
  }

  return output;
}

function decodeMsAdpcm(adpcmData) {
  let pcmData = [];

  if (adpcmData.format.format !== 2) throw "is not MS-ADPCM file";

  const blockSize = adpcmData.format.blockAlign;

  for (let i = 0; i < adpcmData.data.byteLength; i += blockSize) {
    const blockNo = i / blockSize;
    const adpcmBlock = adpcmData.data.slice(i, i + blockSize);
    const decoded = decodeMsAdpcmBlock(
      new DataView(adpcmBlock),
      adpcmData.format.channels,
      adpcmData.format.extra.coefficient[0],
      adpcmData.format.extra.coefficient[1],
    );

    //console.log(`${blockSize} bytes of block decoded into ${decoded[0].length} samples in ${decoded.length} channels`);

    const pcmBlockSize = decoded[0].length * 2;
    const data = new DataView(new ArrayBuffer(decoded.length * pcmBlockSize));
    let offset = 0;

    for (let s = 0; s < pcmBlockSize / 2; s++) {
      for (let c = 0; c < decoded.length; c++) {
        data.setUint16(offset, decoded[c][s], LE);
        offset += 2;
      }
    }

    // Compare two blocks
    pcmData = pcmData.concat(Array.from(new Int16Array(data.buffer)));
  }

  return pcmData;
}

function readWav(arr) {
  if (arr.byteLength > 16777216) {
    throw "File is too big";
  }

  let offset = 0;
  const buf = new DataView(arr);

  // 'RIFF'
  const magic = buf.getUint32(offset, BE);
  offset += 4;
  if (magic !== 0x52494646) throw "0x0000:0x0004 != 52:49:46:46";

  const dataSize = buf.getUint32(offset, LE);
  offset += 4;

  // 'WAVE'
  const format = buf.getUint32(offset, BE);
  offset += 4;
  if (format !== 0x57415645) throw "0x0008:0x000B != 57:41:56:45";

  let wavFormat, wavData;

  while (offset < buf.byteLength) {
    const name = buf.getUint32(offset, BE);
    offset += 4;
    const blockSize = buf.getUint32(offset, LE);
    offset += 4;

    // 'fmt '
    if (name === 0x666d7420) {
      wavFormat = {
        format: buf.getUint16(offset + 0, LE),
        channels: buf.getUint16(offset + 2, LE),
        sampleRate: buf.getUint32(offset + 4, LE),
        byteRate: buf.getUint32(offset + 8, LE),
        blockAlign: buf.getUint16(offset + 12, LE),
        bitsPerSample: buf.getUint16(offset + 14, LE),
      };

      offset += 16;

      if (wavFormat.format === 0x01) {
        //console.log("is PCM file");
        continue;
      } else if (wavFormat.format === 0x02) {
        //console.log("is MS-ADPCM file");

        const extraSize = buf.getUint16(offset, LE);
        offset += 2;
        wavFormat.extraSize = extraSize;
        wavFormat.extra = {
          samplesPerBlock: buf.getUint16(offset + 0, LE),
          coefficientCount: buf.getUint16(offset + 2, LE),
          coefficient: [[], []],
        };

        offset += 4;

        for (let i = 0; i < wavFormat.extra.coefficientCount; i++) {
          wavFormat.extra.coefficient[0].push(buf.getInt16(offset + 0, LE));
          wavFormat.extra.coefficient[1].push(buf.getInt16(offset + 2, LE));
          offset += 4;
        }
      } else throw `WAVE format ${wavFormat.format} is unknown`;
    } else if (name === 0x64617461) {
      // 'data'
      wavData = buf.buffer.slice(offset, offset + blockSize);
      offset += blockSize;
    } else {
      offset += blockSize;
    }
  }

  if (wavFormat && wavData) {
    return { format: wavFormat, data: wavData };
  } else {
    throw "'fmt' or/and 'data' block not found";
  }
}

const playerLookupFull = {};
const playerLookupMini = {};
const waveLookupMini: Record<string, WaveSurfer> = {};

export async function createPlayer(
  player: HTMLElement,
  mini: boolean = false,
  shadowRoot: ShadowRoot | undefined = undefined,
) {
  const hash = player.dataset.hash;
  if (!hash) {
    return;
  }
  try {
    const root = shadowRoot ?? document;
    const playLink = root.getElementById(
      mini ? `play-mini-${hash}` : `play-${hash}`,
    );
    if (!playLink) {
      return;
    }
    const wave = WaveSurfer.create({
      container: player,
      height: mini ? 32 : 64,
      interact: false,
      cursorWidth: 0,
      hideScrollbar: true,
    });
    if (mini) {
      waveLookupMini[hash] = wave;
    }
    wave.on("ready", () => {
      player.classList.remove("loading-bg");
    });
    console.log(`Fetching https://hits.comfig.app/${hash}.wav`);
    const response = await fetch(`https://hits.comfig.app/${hash}.wav`);
    if (!player.firstElementChild) {
      unloadPlayer(hash, mini);
      return;
    }
    const buffer = await response.arrayBuffer();
    if (!player.firstElementChild) {
      unloadPlayer(hash, mini);
      return;
    }
    const wav = readWav(buffer);
    const samples = decodeMsAdpcm(wav);
    // TODO: manually encode wav file again
    const wavFile = new WaveFile();
    wavFile.fromScratch(
      wav.format.channels,
      wav.format.sampleRate,
      "16",
      samples,
    );
    const duration =
      wavFile.data.chunkSize /
      wavFile.fmt.numChannels /
      wavFile.fmt.sampleRate /
      (wavFile.fmt.bitsPerSample / 8);
    const buf = wavFile.toBuffer().buffer;
    const audioBlob = new Blob([buf], { type: "audio/wav" });
    wave.loadBlob(audioBlob, samples, duration);
    const shadowDom = player.firstElementChild?.shadowRoot;
    const originalStyleBlock = shadowDom?.querySelector(
      "style",
    ) as HTMLStyleElement;
    const styleBlock = originalStyleBlock?.cloneNode() as HTMLStyleElement;
    if (styleBlock) {
      styleBlock.innerHTML = originalStyleBlock.innerHTML;
    } else {
      console.error(
        "Style block missing!",
        shadowDom ? "shadowDom" : "null",
        originalStyleBlock ? "originalStyleBlock" : "null",
        player.firstElementChild ? "firstElementChild" : "null",
        shadowRoot ? "shadowRoot" : "null",
        mini ? "mini" : "full",
      );
    }
    styleBlock?.setAttribute("nonce", getNonce());
    shadowDom?.insertBefore(styleBlock, shadowDom.firstChild);
    const playerLookup = mini ? playerLookupMini : playerLookupFull;
    playLink.onclick = (e) => {
      e.preventDefault();
      const ratio = wave.getCurrentTime() / wave.getDuration();
      const ratioThreshold = wave.getDuration() <= 0.3 ? 0.98 : 0.56;
      if (ratio < ratioThreshold) {
        if (playerLookup[hash]) {
          playerLookup[hash] = playerLookup[hash].then(() => wave.playPause());
        } else {
          playerLookup[hash] = wave.playPause();
        }
      } else {
        if (wave.isPlaying()) {
          wave.seekTo(0);
        } else {
          if (playerLookup[hash]) {
            playerLookup[hash] = playerLookup[hash].then(() => wave.play());
          } else {
            playerLookup[hash] = wave.play();
          }
        }
      }
    };
  } catch (err) {
    console.error("Create player failed:", err, hash);
  }
}

export function unloadPlayer(hash: string, mini: boolean = false) {
  if (mini) {
    waveLookupMini[hash]?.destroy();
    delete waveLookupMini[hash];
    delete playerLookupMini[hash];
  } else {
    // Full player unload not implemented yet
    console.warn("Full player unload not implemented yet");
    delete playerLookupFull[hash];
  }
}

export default async function initHits() {
  const players = document.querySelectorAll(
    ".hs-container",
  ) as NodeListOf<HTMLElement>;
  const playerPromises = Array.from(players).map((p) => createPlayer(p));
  await Promise.all(playerPromises);
}
