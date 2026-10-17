"""
Make the FICTIONAL sample "scanned" documents in /samples.

Each document is drawn as HTML with real Bangla fonts, captured with a
headless browser, then given a light scan look (grey paper, slight tilt,
blur and speckle). Every person, place and number is made up.

Run:  python tools/make_sample_scans.py      (needs playwright + pillow)
"""
import asyncio, pathlib, random
from PIL import Image, ImageFilter, ImageOps
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = (ROOT / "assets" / "fonts").as_uri()
OUT = ROOT / "samples"

BASE_CSS = f"""
@font-face {{ font-family: Serif; src: url({FONTS}/noto-serif-bengali-bengali-400-normal.woff2); unicode-range: U+0980-09FF, U+200C-200D, U+25CC; }}
@font-face {{ font-family: Serif; src: url({FONTS}/noto-serif-bengali-latin-400-normal.woff2); }}
@font-face {{ font-family: Serif; font-weight: 700; src: url({FONTS}/noto-serif-bengali-bengali-700-normal.woff2); unicode-range: U+0980-09FF, U+200C-200D, U+25CC; }}
@font-face {{ font-family: Serif; font-weight: 700; src: url({FONTS}/noto-serif-bengali-latin-700-normal.woff2); }}
@font-face {{ font-family: Hand; src: url({FONTS}/galada-bengali-400-normal.woff2); unicode-range: U+0980-09FF, U+200C-200D, U+25CC; }}
@font-face {{ font-family: Hand; src: url({FONTS}/galada-latin-400-normal.woff2); }}
body {{ margin: 0; background: #fff; color: #111; }}
.page {{ width: 1100px; padding: 56px 64px; box-sizing: border-box; font-family: Serif; font-size: 25px; line-height: 1.75; }}
h1 {{ text-align: center; font-size: 34px; margin: 0 0 6px; }}
.sub {{ text-align: center; margin: 0 0 22px; font-size: 22px; }}
table {{ width: 100%; border-collapse: collapse; margin: 14px 0; }}
td, th {{ border: 2px solid #222; padding: 6px 10px; text-align: left; vertical-align: top; }}
th {{ font-weight: 700; font-size: 22px; }}
.foot {{ margin-top: 26px; font-size: 18px; color: #444; }}
.hand {{ font-family: Hand; font-size: 30px; line-height: 1.9; }}
"""

KHATIAN_PRINTED = """
<div class="page">
<h1>খতিয়ান (বি.এস. জরিপ)</h1>
<p class="sub">নমুনা নথি: সম্পূর্ণ কাল্পনিক, শুধু প্রদর্শনের জন্য</p>
<p>জেলা: ডেমো &nbsp;&nbsp; উপজেলা: ডেমো &nbsp;&nbsp; মৌজা: কাশফুল</p>
<p>জে.এল. নং: ১১৮ &nbsp;&nbsp; খতিয়ান নং: ৩১২ &nbsp;&nbsp; সন: ১৯৯৮</p>
<table>
<tr><th>ক্রমিক</th><th>মালিকের নাম, পিতা/স্বামী ও ঠিকানা</th><th>অংশ</th></tr>
<tr><td>১</td><td>আনোয়ার হোসেন, পিতা: জয়নাল আবেদীন, সাং: কাশফুল</td><td>০.৫০০</td></tr>
<tr><td>২</td><td>রোকেয়া বেগম, স্বামী: আনোয়ার হোসেন, সাং: কাশফুল</td><td>০.৫০০</td></tr>
</table>
<table>
<tr><th>দাগ নং</th><th>জমির শ্রেণী</th><th>দাগে মোট জমি (একর)</th><th>খতিয়ানের অংশ</th><th>জমির পরিমাণ (একর)</th></tr>
<tr><td>১০২১</td><td>নাল</td><td>০.৪২০০</td><td>১.০০০</td><td>০.৪২০০</td></tr>
<tr><td>১০২২</td><td>ভিটা</td><td>০.১৫০০</td><td>০.৫০০</td><td>০.০৭৫০</td></tr>
</table>
<p>মোট জমি: ০.৪৯৫০ একর</p>
<p class="foot">রেভিনিউ অফিসার, ডেমো উপজেলা (কাল্পনিক)</p>
</div>"""

DEED_TYPED = """
<div class="page">
<h1>সাফ কবলা দলিল</h1>
<p class="sub">নমুনা নথি: সম্পূর্ণ কাল্পনিক, শুধু প্রদর্শনের জন্য</p>
<p>দলিল নং: ৩৭৭/২০২১ &nbsp;&nbsp; রেজিস্ট্রির তারিখ: ১৪/০৯/২০২১</p>
<p>সাব-রেজিস্ট্রি অফিস: ডেমো</p>
<p>দাতা: আনোয়ার হোসেন, পিতা: জয়নাল আবেদীন, সাং: কাশফুল</p>
<p>গ্রহীতা: শাহীন আলম, পিতা: নুরুল ইসলাম, সাং: কাশফুল</p>
<p>মূল্য: ১২,০০,০০০ টাকা</p>
<p>আমি দাতা নিম্ন তফসিল বর্ণিত সম্পত্তি উক্ত মূল্যে গ্রহীতার নিকট বিক্রয় করিয়া দখল বুঝাইয়া দিলাম। অদ্য হইতে উক্ত সম্পত্তিতে আমার বা আমার ওয়ারিশগণের কোনো দাবি রহিল না।</p>
<p><b>তফসিল</b></p>
<p>জেলা: ডেমো &nbsp;&nbsp; উপজেলা: ডেমো &nbsp;&nbsp; মৌজা: কাশফুল</p>
<p>জে.এল. নং: ১১৮ &nbsp;&nbsp; বি.এস. খতিয়ান নং: ৩১২</p>
<p>দাগ নং: ১০২২ &nbsp;&nbsp; জমির পরিমাণ: ০.০৭৫০ একর</p>
<p class="foot">দাতার স্বাক্ষর ......................... &nbsp;&nbsp; সাক্ষী ......................... (কাল্পনিক)</p>
</div>"""

KHATIAN_HAND = """
<div class="page hand">
<h1 class="hand" style="font-size:38px">খতিয়ান নং ৮৯ (এস.এ.)</h1>
<p>মৌজা: কাশফুল &nbsp; জে.এল. নং: ১১৮ &nbsp; সন: ১৯৬২</p>
<p>মালিক: জয়নাল আবেদীন, পিতা: করম আলী, সাং: কাশফুল &nbsp; অংশ: ১.০০০</p>
<p>দাগ নং ১০২১ &nbsp; নাল &nbsp; ০.৪২০০ একর</p>
<p>দাগ নং ১০২২ &nbsp; ভিটা &nbsp; ০.১৫০০ একর</p>
<p>মোট জমি: ০.৫৭০০ একর</p>
<p style="font-size:22px">নমুনা: সম্পূর্ণ কাল্পনিক</p>
</div>"""

DOCS = [
    ("khatian-kashful-bs-312-printed", KHATIAN_PRINTED, 0.6),
    ("deed-kashful-377-2021-typed", DEED_TYPED, -0.5),
    ("khatian-kashful-sa-89-handwritten", KHATIAN_HAND, 0.9),
]


def scan_look(src: pathlib.Path, angle: float, seed: int):
    rnd = random.Random(seed)
    im = Image.open(src).convert("L")
    im = im.rotate(angle, resample=Image.BICUBIC, expand=True, fillcolor=255)
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    px = im.load()
    w, h = im.size
    for _ in range(w * h // 900):  # dust specks
        x, y = rnd.randrange(w), rnd.randrange(h)
        px[x, y] = rnd.randrange(60, 160)
    paper = Image.new("L", im.size, 236)
    im = Image.composite(im, paper, ImageOps.invert(im).point(lambda v: 255 if v > 18 else int(v * 14)))
    im.save(src.with_suffix(".png"), optimize=True)


async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1100, "height": 800}, device_scale_factor=1)
        for i, (name, body, angle) in enumerate(DOCS):
            tmp = OUT / f"_{name}.html"
            tmp.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{BASE_CSS}</style></head><body>{body}</body></html>", encoding="utf-8")
            await pg.goto(tmp.as_uri())
            await pg.evaluate("Promise.all([document.fonts.load('25px Serif', 'ক'), document.fonts.load('700 25px Serif', 'ক'), document.fonts.load('30px Hand', 'ক')]).then(() => document.fonts.ready)")
            await pg.wait_for_timeout(300)
            path = OUT / f"{name}.png"
            await pg.locator(".page").screenshot(path=str(path))
            scan_look(path, angle, i)
            tmp.unlink()
            print("made", path.name)
        await b.close()

asyncio.run(main())
