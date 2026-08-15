const https = require("https");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createProduct(storeUrl, accessToken) {
  const productData = {
    product: {
      title: "BUYaSOUL Workbench + Soul Engine",
      body_html: `
        <h2>Build, Configure & Deploy AI Agents</h2>
        <p>The complete AI agent development platform with real integrations.</p>
        <h3>What's Included:</h3>
        <ul>
          <li><strong>Agent Simulator</strong> — Chat with custom AI agents powered by Gemini, OpenAI, or Anthropic</li>
          <li><strong>105+ Skills</strong> — Pre-built skills across core, integration, and utility categories</li>
          <li><strong>BrainIngestion</strong> — Document ingestion and vector search with ChromaDB</li>
          <li><strong>Soul Engine</strong> — PLT scoring, 22 archetypes, 11 soul groups, 12 sacred mechanics</li>
          <li><strong>Real Integrations</strong> — Shopify, HubSpot, Pinecone, Slack, Solana, and more</li>
          <li><strong>Secure Vault</strong> — Encrypted API key storage</li>
          <li><strong>Code Export</strong> — Generate production-ready Node.js and Python integration code</li>
          <li><strong>Docker Deployment</strong> — One-command setup with docker-compose</li>
        </ul>
        <h3>Requirements:</h3>
        <ul>
          <li>Node.js 18+ or Docker</li>
          <li>At least one LLM API key (Gemini, OpenAI, or Anthropic)</li>
        </ul>
        <h3>License:</h3>
        <p>MIT + Commercial License. Self-hosted. One-time purchase. Lifetime updates.</p>
      `,
      vendor: "BUYaSOUL",
      product_type: "Digital",
      tags: ["ai", "agents", "workbench", "soul-engine", "chromadb", "digital"],
      status: "active",
      variants: [
        {
          price: "50.00",
          sku: "BUYaSOUL-WORKBENCH-1.0",
          inventory_management: "shopify",
          inventory_quantity: 999,
          requires_shipping: false,
        },
      ],
      images: [],
    },
  };

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(productData);
    const options = {
      hostname: storeUrl.replace("https://", "").replace("http://", ""),
      path: "/admin/api/2024-01/products.json",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: node create-product.js <store-url> <access-token>");
    console.log("Example: node create-product.js buyasoulfinal.myshopify.com shpat_xxx");
    process.exit(1);
  }

  const storeUrl = args[0];
  const accessToken = args[1];

  console.log("\n=== BUYaSOUL Product Creator ===\n");
  console.log(`Store: ${storeUrl}`);
  console.log("Creating product...");

  try {
    const result = await createProduct(storeUrl, accessToken);

    if (result.product) {
      console.log("\n✅ Product created successfully!");
      console.log(`   ID: ${result.product.id}`);
      console.log(`   Title: ${result.product.title}`);
      console.log(`   Price: $${result.product.variants[0].price}`);
      console.log(`   Status: ${result.product.status}`);
      console.log(`   URL: https://${storeUrl}/admin/products/${result.product.id}`);
    } else {
      console.error("\n❌ Failed to create product:");
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
  }
}

main();
