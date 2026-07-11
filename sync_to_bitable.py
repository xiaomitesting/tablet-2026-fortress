#!/usr/bin/env python3
"""
MIMI 問答數據 → 飛書 Bitable 同步腳本
用法:
  1. 導出網站數據: 在網站按 F12 → Console → 輸入 QuizData.exportJSON() → 複製輸出
  2. 保存為 data.json 文件
  3. 運行: python3 sync_to_bitable.py data.json
"""
import json
import sys
import urllib.request

import os

# ============ 配置 ============
FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "cli_aad8c63cb6389cc9")
FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "")  # 從環境變量讀取
BITABLE_BASE_TOKEN = "XenmbYueGa1lP4sMiEhcTU0YnOg"
BITABLE_TABLE_ID = "tbl4X2EDh1wYYvrL"
FEISHU_BASE = "https://open.feishu.cn/open-apis"

# ============ 場景/選項映射 ============
SCENARIO_LABELS = {
    "productivity": "辦公/學習", "gaming": "遊戲電競", "media": "影音娛樂",
    "creative": "創意設計", "reading": "閱讀", "portable": "便攜出行",
    "kids": "兒童教育", "outdoor": "戶外辦公"
}
BUDGET_LABELS = {"low": "入門級", "mid": "主流級", "premium": "旗艦級"}
SIZE_LABELS = {"compact": "小屏", "standard": "標準", "large": "大屏"}
PRIORITY_LABELS = {
    "performance": "性能", "battery": "續航", "display": "屏幕",
    "price": "性價比", "portable": "便攜", "stylus": "手寫筆"
}
ACCESSORY_LABELS = {"none": "不需要", "stylus": "手寫筆", "keyboard": "鍵盤", "both": "都要"}


def get_tenant_token():
    """獲取飛書 tenant_access_token"""
    url = f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal"
    payload = json.dumps({"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    if data.get("code") != 0:
        raise Exception(f"Token error: {data.get('msg')}")
    return data["tenant_access_token"]


def map_record(record):
    """將 localStorage 記錄映射為 Bitable 字段"""
    answers = record.get("answers", {})
    scenarios = answers.get("scenario", [])
    if isinstance(scenarios, str):
        scenarios = [scenarios]

    return {
        "階段數": False,
        "場景": ", ".join(SCENARIO_LABELS.get(s, s) for s in scenarios),
        "預算": BUDGET_LABELS.get(answers.get("budget", ""), answers.get("budget", "")),
        "尺寸偏好": SIZE_LABELS.get(answers.get("size", ""), answers.get("size", "")),
        "優先級": PRIORITY_LABELS.get(answers.get("priority", ""), answers.get("priority", "")),
        "配件需求": ACCESSORY_LABELS.get(answers.get("accessory", ""), answers.get("accessory", "")),
        "推薦產品": record.get("topProduct", ""),
        "匹配度": record.get("topScore", 0),
        "穩健信息": record.get("deviceInfo", ""),
        "已同步": True,
    }


def write_records(token, records):
    """批量寫入 Bitable"""
    url = f"{FEISHU_BASE}/bitable/v1/apps/{BITABLE_BASE_TOKEN}/tables/{BITABLE_TABLE_ID}/records/batch_create"
    payload = json.dumps({"records": [{"fields": r} for r in records]}).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    if data.get("code") != 0:
        raise Exception(f"Bitable error: {data.get('msg')}")
    return data


def main():
    if not FEISHU_APP_SECRET:
        print("❌ 請先設置環境變量 FEISHU_APP_SECRET")
        print("   export FEISHU_APP_SECRET='你的飛書應用密鑰'")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("用法: python3 sync_to_bitable.py <data.json>")
        print()
        print("步驟:")
        print("  1. 設置密鑰: export FEISHU_APP_SECRET='你的飛書應用密鑰'")
        print("  2. 打開網站 → F12 → Console")
        print("  3. 輸入: QuizData.exportJSON()")
        print("  4. 複製輸出，保存為 data.json")
        print("  5. 運行: python3 sync_to_bitable.py data.json")
        sys.exit(1)

    # 讀取數據
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        records = json.load(f)

    if not records:
        print("⚠️  數據為空，無需同步")
        return

    print(f"📋 讀取到 {len(records)} 條記錄")

    # 獲取 token
    print("🔑 獲取飛書 token...")
    token = get_tenant_token()

    # 映射數據
    bitable_records = [map_record(r) for r in records]

    # 批量寫入
    print(f"📤 正在寫入 Bitable...")
    result = write_records(token, bitable_records)

    print(f"✅ 成功同步 {len(records)} 條記錄到飛書！")


if __name__ == "__main__":
    main()
