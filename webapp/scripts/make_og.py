"""Run: python scripts/make_og.py public/og.png (needs Chrome on Windows).
Renders the share image, scripts/og.svg, to a 1200x630 PNG."""
import pathlib
import subprocess
import sys

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
svg = pathlib.Path(__file__).with_name("og.svg").resolve()
out = pathlib.Path(sys.argv[1]).resolve()
subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--force-device-scale-factor=1",
                "--window-size=1200,630", f"--screenshot={out}", svg.as_uri()], check=True, capture_output=True)
assert out.stat().st_size > 50_000, "render looks empty"
print("saved", out)
