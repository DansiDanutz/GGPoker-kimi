import math
import struct
import sys
import zlib

SIZE = 1024
CENTER = SIZE / 2
RADIUS = 220


def inside_rounded_square(x, y):
    dx = max(abs(x - CENTER) - (CENTER - RADIUS), 0)
    dy = max(abs(y - CENTER) - (CENTER - RADIUS), 0)
    return dx * dx + dy * dy <= RADIUS * RADIUS


def inside_spade(x, y):
    nx = (x - CENTER) / 290
    ny = (y - 490) / 310
    top = (0, -0.95)
    left = (-0.64, 0.08)
    right = (0.64, 0.08)

    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    point = (nx, ny)
    b1 = sign(point, top, left) < 0
    b2 = sign(point, left, right) < 0
    b3 = sign(point, right, top) < 0
    triangle = b1 == b2 == b3
    left_lobe = (nx + 0.34) ** 2 + (ny - 0.04) ** 2 <= 0.43 ** 2
    right_lobe = (nx - 0.34) ** 2 + (ny - 0.04) ** 2 <= 0.43 ** 2
    stem = abs(nx) <= 0.14 + max(0, ny - 0.15) * 0.12 and 0.12 <= ny <= 0.93
    base = abs(nx) <= 0.37 and 0.78 <= ny <= 0.94
    return triangle or left_lobe or right_lobe or stem or base


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def main(output):
    rows = []
    for y in range(SIZE):
        row = bytearray([0])
        for x in range(SIZE):
            if not inside_rounded_square(x, y):
                row.extend((0, 0, 0, 0))
                continue
            glow = max(0, 1 - math.hypot(x - 580, y - 400) / 760)
            red = int(6 + glow * 10)
            green = int(25 + glow * 36)
            blue = int(20 + glow * 25)
            if inside_spade(x, y):
                shine = max(0, 1 - y / SIZE)
                red, green, blue = int(220 + shine * 25), int(169 + shine * 36), int(83 + shine * 35)
            row.extend((red, green, blue, 255))
        rows.append(bytes(row))
    raw = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(output, "wb") as handle:
        handle.write(png)


if __name__ == "__main__":
    main(sys.argv[1])
