import WaveSurfer from "wavesurfer.js";
import {Howl, Howler} from 'howler';
import { WaveFile } from 'wavefile';
import { decodeImaAdpcm } from 'ima-adpcm-decoder';

function decodeMsAdpcm(ctx, buffer) {
  const wav = new WaveFile(new Uint8Array(buffer));
  const fmt = wav.fmt;
  const data = wav.data;
  console.log(wav);
}

const players = document.querySelectorAll(".hs-container");
for (const player of players) {
  const ctx = new AudioContext();
  const response = await fetch(`https://storage.googleapis.com/hits.mastercomfig.com/${player.dataset.hash}.wav`);
  const buffer = await response.arrayBuffer();
  decodeMsAdpcm(ctx, buffer);
  const wave = WaveSurfer.create({
    container: player,
    audioContext: ctx,
  });
  //wave.loadDecodedBuffer(audioBuffer);
  //wave.load(`https://hits.mastercomfig.com/${player.dataset.hash}.wav`);
}
