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
    labels, n = ndimage.label(dist < 55)
    edge = np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
    keep = np.unique(edge[edge > 0])
    # A limb can wall a pocket of real backdrop off from every edge: both hands going up to
    # the headphones, or a mug raised to his mouth. The rule above would leave those at the
    # raw drifting red, and on the page -- where the backdrop is meant to vanish into the
    # section colour -- they read as a dark shape stuck to him. Measured across all 15 raw
    # clips, enclosed skin shadow sits 32-47 from the backdrop colour while walled-off
    # backdrop sits at 9-11, so the two separate cleanly.
    if n:
        idx = np.arange(1, n + 1)
        flat_labels = labels.ravel()
        sizes = np.bincount(flat_labels, minlength=n + 1)[1:]
        sums = np.bincount(flat_labels, weights=dist.ravel(), minlength=n + 1)[1:]
        means = sums / np.maximum(sizes, 1)
        keep = np.union1d(keep, idx[(means < 20) & (sizes >= 200)])
    core = np.isin(labels, keep)
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
# The page opens in non-focus mode (headphones off), and frame 0 is what both video
# elements show before the first seek lands -- so it has to be a headphones-off frame.
idle = read('B1-idle.mp4')
from PIL import Image
Image.fromarray(idle[0]).save(ROOT + 'images/hero-poster.jpg', quality=84, optimize=True, progressive=True)
w.add('idle', idle); del idle
w.add('typing', read('A1-typing.mp4'))     # already a seamless ping-pong
w.add('notice', read('A4-notice.mp4'))
w.add('hpOff', read('A5-headphones-off.mp4'))
w.add('hpOn', read('A6-headphones-on.mp4'))
b8 = read('B8-talk.mp4')
w.add('talk', pingpong(b8[0:61]))          # mouth moving, hands down
w.add('greet', b8); del b8                 # talks, then waves
w.add('wave', read('B5-wave.mp4'))
w.add('laugh', read('B4-laugh.mp4'))
w.add('idea', read('B6-point.mp4'))        # raised "one moment" finger
w.add('flinch', read('B9-flinch.mp4'))
w.add('shy', read('B10-shy.mp4'))
w.add('coffee', read('A7-coffee.mp4'))          # a sip mid-work, headphones on
# One nod cycle runs ~12 frames. 42 and 73 are both extremes of the head's rise and fall,
# so ping-ponging between them loops with no velocity jump -- the same trick as `talk`.
w.add('nod', pingpong(read('A8-nod.mp4')[42:74]))
actions = w.close()

print('gaze')
# one monotonic sweep per state: far screen-left -> centre -> far screen-right.
# The join between the two halves is the frame where he faces forward, which is what
# script.js calls `center`, so record it rather than hand-tuning it downstream.
g = Writer(ROOT + 'videos/hero-gaze.mp4', gop=2, crf=22)
centre = {}
a2 = read('A2-look.mp4')
left, right = a2[28:45][::-1], a2[56:81]
centre['on'] = len(left) - 0.5
g.add('on', left + right); del a2, left, right
b2 = read('B2-look.mp4')
left, right = b2[18:37][::-1], b2[56:81]
centre['off'] = len(left) - 0.5
g.add('off', left + right); del b2, left, right
gaze = g.close()

# script.js fetches this, so the tables cannot drift from the encode
out = {
    'actions': actions,
    'gaze': {k: {'start': v[0],
                 'frames': int(round((v[1] - v[0]) * 24)),
                 'center': centre[k]} for k, v in gaze.items()}
}
with open(ROOT + 'videos/hero-clips.json', 'w') as fh:
    json.dump(out, fh, indent=2)
    fh.write('\n')
print('wrote videos/hero-clips.json')
print(json.dumps(out))
