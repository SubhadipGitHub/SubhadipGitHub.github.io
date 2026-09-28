"""Build the hero's web videos from videos/raw.

Run from the repo root:  python videos/build-hero.py   (needs numpy, scipy, imageio-ffmpeg, pillow)
The printed timeline must match CLIPS / GAZE in script.js.

Each source range is cropped to the character, decoded as BT.709, and every frame's
red backdrop is flattened to one target colour (the AI clips drift between ~31 and ~58
in green). Only backdrop regions connected to the frame edge are touched, so red-toned
skin shadows inside the face keep their colours.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy import ndimage
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace(os.sep, '/') + '/'
RAW = ROOT + 'videos/raw/'
W, H = 1080, 806
TARGET = np.array([160.0, 33.0, 30.0], dtype=np.float32)


def read(name, a=None, b=None):
    vf = []
    if a is not None:
        vf.append(f'trim=start_frame={a}:end_frame={b + 1},setpts=PTS-STARTPTS')
    vf.append('crop=1260:940:330:0')
    vf.append(f'scale={W}:{H}:flags=lanczos:in_color_matrix=bt709')
    cmd = [FF, '-loglevel', 'error', '-i', RAW + name, '-vf', ','.join(vf), '-an',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    data = subprocess.run(cmd, capture_output=True, check=True).stdout
    frames = np.frombuffer(data, np.uint8).reshape(-1, H, W, 3)
    return [normalize(f) for f in frames]


def normalize(frame):
    f = frame.astype(np.float32)
    strips = np.concatenate([f[30:520, 0:60].reshape(-1, 3), f[30:520, W - 60:W].reshape(-1, 3)])
    bg = np.median(strips, axis=0)
    dist = np.sqrt(((f - bg) ** 2).sum(axis=2))
    # Backdrop = backdrop-coloured regions connected to the frame edge. Red-toned skin
    # shadows (eyelids, blush, laughing cheeks) are enclosed by skin, so they stay put.
    labels, _ = ndimage.label(dist < 55)
    edge = np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
    core = np.isin(labels, np.unique(edge[edge > 0]))
    band = ndimage.binary_dilation(core, iterations=4)
    # soft colour shift along the outline so anti-aliased edges carry no old-red halo
    shift = (band * np.clip(1.0 - (dist - 55.0) / 60.0, 0.0, 1.0))[..., None]
    # flatten the backdrop itself to the exact target: kills the AI grain (which costs
    # bitrate) and makes the frame edge identical to the page background
    flat = (core * np.clip(1.0 - (dist - 40.0) / 15.0, 0.0, 1.0))[..., None]
    out = f + shift * (TARGET - bg)
    out = out + flat * (TARGET - out)
    return np.clip(out, 0, 255).astype(np.uint8)


def pingpong(frames):
    return frames + frames[-2:0:-1]


class Writer:
    def __init__(self, path, gop, crf):
        self.path, self.count = path, 0
        cmd = [FF, '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
               '-r', '24', '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-pix_fmt', 'yuv420p',
               '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-profile:v', 'high',
               '-g', str(gop), '-keyint_min', str(gop), '-sc_threshold', '0', '-bf', '0' if gop <= 3 else '2',
               '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv',
               '-movflags', '+faststart', '-an', path]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        self.timeline = {}

    def add(self, key, frames):
        start = self.count
        for f in frames:
            self.p.stdin.write(f.tobytes())
            self.count += 1
        self.timeline[key] = [round(start / 24, 4), round(self.count / 24, 4)]
        print(f'  {key:10s} {self.count - start:4d} frames  {self.timeline[key]}', flush=True)

    def close(self):
        self.p.stdin.close()
        if self.p.wait() != 0:
            sys.exit('encode failed: ' + self.path)
        return self.timeline


print('actions')
w = Writer(ROOT + 'videos/hero-actions.mp4', gop=12, crf=25)
typing = read('A1-typing.mp4')             # already a seamless ping-pong
from PIL import Image
Image.fromarray(typing[0]).save(ROOT + 'images/hero-poster.jpg', quality=84, optimize=True, progressive=True)
w.add('typing', typing); del typing
w.add('notice', read('A4-notice.mp4'))
w.add('hpOff', read('A5-headphones-off.mp4'))
w.add('hpOn', read('A6-headphones-on.mp4'))
w.add('idle', read('B1-idle.mp4'))
b8 = read('B8-laugh.mp4')
w.add('talk', pingpong(b8[0:61]))          # mouth moving, hands down
w.add('greet', b8); del b8                 # talks, then waves
w.add('wave', read('B5-wave.mp4'))
w.add('laugh', read('B4-talk.mp4'))        # this file holds the big laugh
w.add('idea', read('B6-point.mp4'))        # raised "one moment" finger
w.add('flinch', read('B9-flinch.mp4'))
w.add('shy', read('B10-shy.mp4'))
actions = w.close()

print('gaze')
# one monotonic sweep per state: far screen-left -> centre -> far screen-right
g = Writer(ROOT + 'videos/hero-gaze.mp4', gop=2, crf=22)
a2 = read('A2-look.mp4'); g.add('on', a2[28:45][::-1] + a2[56:81]); del a2
b2 = read('B2-look.mp4'); g.add('off', b2[18:37][::-1] + b2[56:81]); del b2
gaze = g.close()

out = {'actions': actions, 'gaze': gaze}
print(json.dumps(out))
