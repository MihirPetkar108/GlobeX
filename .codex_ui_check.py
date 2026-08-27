from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:5174/assess", wait_until="networkidle")
    body = page.locator("body").inner_text()
    print({"url": page.url, "title": page.title(), "body_length": len(body), "body": repr(body[:500])})
    browser.close()
