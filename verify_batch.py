"""
MediLens — Batch Verification Script
=====================================
ทดสอบระบบกับรูปภาพ/PDF หลายไฟล์พร้อมกัน แล้วรายงานอัตราสำเร็จ

วิธีใช้:
  python verify_batch.py                        # ใช้โฟลเดอร์ "Pics sample" (default)
  python verify_batch.py --folder path/to/imgs  # ระบุโฟลเดอร์เอง
  python verify_batch.py --url http://localhost:8000  # เปลี่ยน server URL
  python verify_batch.py --out results.csv      # บันทึกผลลงไฟล์ CSV
"""

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌  ต้องติดตั้ง requests ก่อน:  pip install requests")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
SUPPORTED = {".jpg", ".jpeg", ".png", ".pdf"}
TIMEOUT   = 120   # วินาที ต่อไฟล์

# ── Criteria for "success" ─────────────────────────────────────────────────────
# SUCCESS  = OCR มีข้อความ  AND  analysis มี parameters อย่างน้อย 1 ตัว
# PARTIAL  = OCR มีข้อความ  แต่  analysis ไม่พบ parameters
# FAILED   = OCR ไม่ได้ข้อความ หรือ เกิด error

def test_file(base_url: str, filepath: Path) -> dict:
    result = {
        "file":       filepath.name,
        "status":     "failed",
        "ocr_chars":  0,
        "param_count": 0,
        "abnormal":   0,
        "error":      "",
        "elapsed_s":  0.0,
    }
    t0 = time.time()

    # ── Step 1 : Upload + OCR ─────────────────────────────────────────────────
    try:
        with open(filepath, "rb") as f:
            resp = requests.post(
                f"{base_url}/api/upload",
                files={"file": (filepath.name, f)},
                timeout=TIMEOUT,
            )
        if resp.status_code != 200:
            result["error"] = f"upload HTTP {resp.status_code}"
            return _finish(result, t0)

        ocr_text = resp.json().get("ocr_text", "")
        result["ocr_chars"] = len(ocr_text.strip())

        if result["ocr_chars"] < 10:
            result["error"] = "OCR returned too little text"
            return _finish(result, t0)

    except Exception as e:
        result["error"] = f"upload error: {e}"
        return _finish(result, t0)

    # ── Step 2 : Analyze ──────────────────────────────────────────────────────
    try:
        resp2 = requests.post(
            f"{base_url}/api/analyze",
            json={"ocr_text": ocr_text},
            timeout=TIMEOUT,
        )
        if resp2.status_code != 200:
            result["error"] = f"analyze HTTP {resp2.status_code}"
            result["status"] = "partial"   # OCR ok แต่ analyze ล้มเหลว
            return _finish(result, t0)

        data = resp2.json()
        params = data.get("parameters", [])
        result["param_count"] = len(params)
        result["abnormal"]    = data.get("abnormal_count", 0)

        if result["param_count"] == 0:
            result["status"] = "partial"
            result["error"]  = "no parameters extracted"
        else:
            result["status"] = "success"

    except Exception as e:
        result["error"]  = f"analyze error: {e}"
        result["status"] = "partial"

    return _finish(result, t0)


def _finish(r: dict, t0: float) -> dict:
    r["elapsed_s"] = round(time.time() - t0, 1)
    return r


# ── Progress bar (ไม่ต้องติดตั้ง tqdm) ─────────────────────────────────────────
def progress(done: int, total: int, width: int = 40) -> str:
    pct   = done / total
    filled = int(width * pct)
    bar   = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {done}/{total}  ({pct*100:.0f}%)"


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="MediLens Batch Verifier")
    parser.add_argument("--folder", default="Pics sample",
                        help="โฟลเดอร์ที่มีรูป/PDF (default: 'Pics sample')")
    parser.add_argument("--url",    default="http://localhost:8000",
                        help="URL ของ server (default: http://localhost:8000)")
    parser.add_argument("--out",    default="",
                        help="บันทึกผลลงไฟล์ CSV (optional)")
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.exists():
        print(f"❌  ไม่พบโฟลเดอร์: {folder}")
        sys.exit(1)

    files = sorted([f for f in folder.iterdir() if f.suffix.lower() in SUPPORTED])
    if not files:
        print(f"❌  ไม่มีไฟล์รองรับ ({', '.join(SUPPORTED)}) ใน {folder}")
        sys.exit(1)

    # ── Health check ─────────────────────────────────────────────────────────
    print(f"\n🔗  Server : {args.url}")
    try:
        h = requests.get(f"{args.url}/api/health", timeout=10)
        print(f"✅  Health : {h.json()}\n")
    except Exception as e:
        print(f"⚠️   Server ไม่ตอบสนอง ({e}) — ตรวจสอบว่าเปิด server แล้ว\n")

    print(f"📂  โฟลเดอร์  : {folder.resolve()}")
    print(f"📄  ไฟล์ทั้งหมด: {len(files)} ไฟล์\n")

    results  = []
    counters = {"success": 0, "partial": 0, "failed": 0}

    for i, fp in enumerate(files, 1):
        sys.stdout.write(f"\r{progress(i-1, len(files))}  กำลังทดสอบ: {fp.name[:40]:<40}")
        sys.stdout.flush()

        r = test_file(args.url, fp)
        results.append(r)
        counters[r["status"]] += 1

        icon = {"success": "✅", "partial": "⚠️ ", "failed": "❌"}[r["status"]]
        sys.stdout.write(
            f"\r{icon}  [{i:>3}/{len(files)}]  {fp.name:<40}  "
            f"OCR:{r['ocr_chars']:>5} chars  "
            f"Params:{r['param_count']:>3}  "
            f"{r['elapsed_s']:>5}s"
            f"{'  ← ' + r['error'] if r['error'] else ''}\n"
        )
        sys.stdout.flush()

    # ── Summary ───────────────────────────────────────────────────────────────
    total      = len(results)
    success_r  = counters["success"] / total * 100
    partial_r  = counters["partial"] / total * 100
    failed_r   = counters["failed"]  / total * 100
    avg_time   = sum(r["elapsed_s"] for r in results) / total
    avg_params = (
        sum(r["param_count"] for r in results if r["status"] == "success")
        / max(counters["success"], 1)
    )

    print("\n" + "═" * 60)
    print("  📊  สรุปผลการทดสอบ MediLens")
    print("═" * 60)
    print(f"  ทดสอบทั้งหมด   : {total:>5} ไฟล์")
    print(f"  ✅ สำเร็จ        : {counters['success']:>5} ไฟล์  ({success_r:.1f}%)")
    print(f"  ⚠️  OCR ได้แต่ไม่มี params : {counters['partial']:>3} ไฟล์  ({partial_r:.1f}%)")
    print(f"  ❌ ล้มเหลว       : {counters['failed']:>5} ไฟล์  ({failed_r:.1f}%)")
    print("─" * 60)
    print(f"  ⏱  เวลาเฉลี่ยต่อไฟล์  : {avg_time:.1f} วินาที")
    print(f"  🔬 ค่าเฉลี่ย params/ไฟล์ : {avg_params:.1f} ตัว  (เฉพาะที่สำเร็จ)")
    print("═" * 60)

    # ── Failure breakdown ─────────────────────────────────────────────────────
    failures = [r for r in results if r["status"] != "success"]
    if failures:
        print(f"\n  ❌⚠️  รายการที่ไม่สำเร็จ ({len(failures)} ไฟล์)")
        print("  " + "─" * 56)
        error_groups: dict[str, list[str]] = {}
        for r in failures:
            key = r["error"] or "(ไม่ทราบสาเหตุ)"
            error_groups.setdefault(key, []).append(r["file"])
        for err, flist in sorted(error_groups.items(), key=lambda x: -len(x[1])):
            print(f"  • {err}")
            for fn in flist[:5]:
                print(f"      – {fn}")
            if len(flist) > 5:
                print(f"      … และอีก {len(flist)-5} ไฟล์")
        print()

    # ── CSV export ────────────────────────────────────────────────────────────
    if args.out:
        out_path = Path(args.out)
        with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        print(f"  💾  บันทึก CSV → {out_path.resolve()}\n")


if __name__ == "__main__":
    main()
