import fetch from "node-fetch";

async function testEndpoint(url: string, description: string) {
  const start = Date.now();
  try {
    const res = await fetch(url);
    const duration = Date.now() - start;
    const text = await res.text();
    
    // Title / Headings extraction
    const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "N/A";
    const hasH1 = /<h1[^>]*>(.*?)<\/h1>/i.test(text);
    const length = text.length;

    console.log(`[PASS] ${description}`);
    console.log(`  └─ Status: ${res.status} | Time: ${duration}ms | Length: ${length} bytes`);
    console.log(`  └─ Title: "${title}" | Has <h1>: ${hasH1}`);
    return { success: res.status < 400, status: res.status, title };
  } catch (err: any) {
    console.log(`[FAIL] ${description}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("  HABERNEXUS CANLI SİSTEM & ENDPOINT TEST SUITE  ");
  console.log("==================================================\n");

  const baseUrl = "http://localhost:3000";

  await testEndpoint(`${baseUrl}/`, "Ana Sayfa (Homepage)");
  await testEndpoint(`${baseUrl}/latest`, "Son Haberler Sayfası");
  await testEndpoint(`${baseUrl}/categories`, "Kategoriler Sayfası");
  await testEndpoint(`${baseUrl}/admin/rss-feeds`, "Admin RSS Önerileri & Google Trends");
  await testEndpoint(`${baseUrl}/admin/google-trends`, "Admin Google Trends Masası");
  await testEndpoint(`${baseUrl}/admin/ai-writer`, "Admin AI Yazar Merkezi");
  await testEndpoint(`${baseUrl}/admin/ai-writer/models`, "Admin Model Merkezi");
  await testEndpoint(`${baseUrl}/admin/settings`, "Admin Site & Sistem Ayarları");
  await testEndpoint(`${baseUrl}/api/og?title=Test+Haber+Basligi`, "Dinamik OG Görsel Üretimi API");

  console.log("\n==================================================");
  console.log("  TESTLER TAMAMLANDI");
  console.log("==================================================");
}

runTests();
