const fs = require("fs");
const path = require("path");

const IMAGE = path.join(process.env.HOME, "Downloads", "レシート.jpg");

async function main() {
  const base64 = fs.readFileSync(IMAGE, { encoding: "base64" });
  console.log("Image size:", (base64.length / 1024).toFixed(0), "KB");

  const res = await fetch("http://localhost:3099", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 }),
  });

  if (!res.ok) {
    console.error("FAIL:", res.status);
    const err = await res.text();
    console.error(err);
    return;
  }

  const data = await res.json();
  const parsed = JSON.parse(data.output_text);
  console.log("✅ Proxy → OpenAI → Result:");
  console.log("   Store:", parsed.store);
  console.log("   Total: ¥" + parsed.total);
  console.log("   Items:", parsed.items.length);
}

main().catch(console.error);
