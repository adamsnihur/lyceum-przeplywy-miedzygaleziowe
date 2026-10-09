import asyncio
import os
from playwright.async_api import async_playwright

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 950})
        page = await context.new_page()

        console_errors = []
        page_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = "file://" + os.path.join(base_dir, "index.html")
        print(f"Loading {file_path}...")
        await page.goto(file_path, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        print("Console errors on load:", console_errors)
        print("Page errors on load:", page_errors)
        assert len(console_errors) == 0, f"Found console errors: {console_errors}"
        assert len(page_errors) == 0, f"Found page errors: {page_errors}"

        # 1. Test KPI on load
        kpi_gdp = await page.locator("#kpiGdp").inner_text()
        print(f"Initial GDP: {kpi_gdp}")
        assert "1250.0" in kpi_gdp or "1250" in kpi_gdp

        # 2. Test Slider Y0 (Przemysł)
        print("Testing Slider Y0...")
        slider_y0 = page.locator("#sliderY0")
        await slider_y0.fill("500")
        await slider_y0.dispatch_event("input")
        await page.wait_for_timeout(500)

        new_val_y0 = await page.locator("#valY0").inner_text()
        new_kpi_gdp = await page.locator("#kpiGdp").inner_text()
        print(f"After slider Y0=500 -> valY0: {new_val_y0}, GDP: {new_kpi_gdp}")
        assert "500" in new_val_y0
        assert "1330" in new_kpi_gdp

        # 3. Test Scenariusz CPK
        print("Testing scenario 'cpk'...")
        scenario_cpk = page.locator("button[data-scenario='cpk']")
        await scenario_cpk.click()
        await page.wait_for_timeout(500)

        desc = await page.locator("#scenarioDesc").inner_text()
        print(f"Scenario desc: {desc}")
        assert "Infrastrukturalny" in desc

        # 4. Test Quiz
        print("Testing Quiz...")
        # Wybierz poprawne opcje dla pytań Q1..Q5
        # Q1: opcja A (indeks 0)
        await page.locator("button[data-qid='q1'][data-oidx='0']").click()
        # Q2: opcja A (indeks 0)
        await page.locator("button[data-qid='q2'][data-oidx='0']").click()
        # Q3: opcja A (indeks 0)
        await page.locator("button[data-qid='q3'][data-oidx='0']").click()
        # Q4: opcja A (indeks 0)
        await page.locator("button[data-qid='q4'][data-oidx='0']").click()
        # Q5: opcja A (indeks 0)
        await page.locator("button[data-qid='q5'][data-oidx='0']").click()

        await page.wait_for_timeout(300)
        submit_btn = page.locator("#btnSubmitQuiz")
        btn_text = await submit_btn.inner_text()
        print(f"Quiz submit button text: {btn_text}")
        assert "5/5" in btn_text

        await submit_btn.click()
        await page.wait_for_timeout(500)

        quiz_alert = await page.locator("#quizResultAlert").inner_text()
        print(f"Quiz result alert: {quiz_alert}")
        assert "5 / 5" in quiz_alert
        assert "100%" in quiz_alert

        # Quality Gate: SVG Text Clipping & DOM Overflow Check
        print("Running Quality Gate: SVG Text Clipping & DOM Overflow Check...")
        clipped_svg = await page.evaluate('''() => {
            const issues = [];
            document.querySelectorAll('svg').forEach(svg => {
                const vb = svg.viewBox.baseVal;
                if (!vb || vb.width === 0) return;
                svg.querySelectorAll('text, tspan').forEach(t => {
                    const text = t.textContent.trim();
                    if (!text) return;
                    try {
                        const bbox = t.getBBox();
                        if (bbox.x < vb.x - 2 || (bbox.x + bbox.width) > (vb.x + vb.width + 2)) {
                            issues.push({ text: text, x: bbox.x, width: bbox.width, vb_x: vb.x, vb_w: vb.width });
                        }
                    } catch (e) {}
                });
            });
            return issues;
        }''')
        print(f"SVG Text clipping issues found: {len(clipped_svg)}")
        assert len(clipped_svg) == 0, f"Found clipped SVG text elements: {clipped_svg}"

        # Multi-viewport responsive tests
        viewports = [
            ("Desktop 1440px", {"width": 1440, "height": 900}),
            ("Tablet 768px", {"width": 768, "height": 1024}),
            ("Mobile 375px", {"width": 375, "height": 812})
        ]
        for name, vp in viewports:
            await page.set_viewport_size(vp)
            await page.wait_for_timeout(300)
            has_h_scroll = await page.evaluate('''() => {
                return document.documentElement.scrollWidth > window.innerWidth + 2;
            }''')
            print(f"Viewport {name} -> Horizontal scroll detected: {has_h_scroll}")
            assert not has_h_scroll, f"Horizontal scroll detected on {name}!"

        # Reset viewport to 1440px and capture verified screenshot
        await page.set_viewport_size({"width": 1440, "height": 950})
        screenshot_path = os.path.join(base_dir, "screenshot_verified.png")
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Full page screenshot saved to {screenshot_path}")

        await browser.close()
        print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
