import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parser for base64 camera uploads
  app.use(express.json({ limit: "15mb" }));

  // API endpoint for AI OCR & Product Identification from photos
  app.post("/api/ocr-lote", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Imagem não fornecida" });
      }

      // Remove data:image/...;base64, prefix
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: "Analise esta foto de embalagem ou produto de supermercado. Identifique o NOME DO PRODUTO (marca, tipo e peso/volume, ex: 'Café Pilão Tradicional 500g'), a CATEGORIA mais adequada, o LOTE (ex: P120526, L123) e a DATA DE VALIDADE (VAL, VENC, EXP) no formato YYYY-MM-DD. Se houver código de barras numérico impresso visível, identifique-o também.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nomeProduto: {
                type: Type.STRING,
                description: "Nome completo do produto com marca e peso/volume (ex: Arroz Tio João 5kg)",
              },
              categoria: {
                type: Type.STRING,
                description: "Categoria de supermercado do produto (ex: Mercearia / Grãos & Cereais, Laticínios & Frios, Bebidas Não Alcoólicas, Limpeza Doméstica, etc.)",
              },
              lote: {
                type: Type.STRING,
                description: "O número/código do lote extraído (ex: P120526 ou L12345).",
              },
              validade: {
                type: Type.STRING,
                description: "A data de validade extraída no formato YYYY-MM-DD (ex: 2026-11-08).",
              },
              codigoBarras: {
                type: Type.STRING,
                description: "Número do código de barras se visível na imagem.",
              },
              textoCompleto: {
                type: Type.STRING,
                description: "Resumo do texto lido da foto.",
              },
            },
          },
        },
      });

      const jsonText = response.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (err: any) {
      console.error("Erro no OCR Gemini:", err);
      return res.status(500).json({ error: err.message || "Falha ao processar imagem" });
    }
  });

  // API endpoint to lookup Product Name, Category and Image by Barcode EAN using Open Food Facts & Gemini Google Search
  app.post("/api/consultar-produto-codigo", async (req, res) => {
    try {
      const { ean } = req.body;
      if (!ean || typeof ean !== "string") {
        return res.status(400).json({ error: "Código de barras inválido" });
      }

      const cleanEan = ean.trim().replace(/\D/g, "");
      if (!cleanEan) {
        return res.status(400).json({ error: "Código de barras numérico não fornecido" });
      }

      let nomeProduto = "";
      let categoria = "";
      let fotoUrl = "";
      let fonte = "";

      // Step 1: Query Open Food Facts Brazil database for exact real EAN & real product image
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const offRes = await fetch(`https://br.openfoodfacts.org/api/v2/product/${cleanEan}.json`, {
          signal: controller.signal,
          headers: {
            "User-Agent": "ValidadeSupermercadoApp - Web - Version 1.0",
          },
        });
        clearTimeout(timeoutId);

        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData && offData.status === 1 && offData.product) {
            const prod = offData.product;
            const nome = prod.product_name_pt || prod.product_name || "";
            const marca = prod.brands || "";
            const qtd = prod.quantity || "";

            if (nome) {
              const partes = [marca, nome, qtd].filter(Boolean);
              nomeProduto = partes.join(" - ");
              if (nomeProduto.length > 80) nomeProduto = `${marca} ${nome}`.trim();
            }

            // Real product image from Open Food Facts
            fotoUrl = prod.image_front_url || prod.image_url || prod.image_front_small_url || prod.image_small_url || "";

            // Category mapping
            if (prod.categories_tags && Array.isArray(prod.categories_tags)) {
              const catsStr = prod.categories_tags.join(" ").toLowerCase();
              if (catsStr.includes("beverage") || catsStr.includes("drink") || catsStr.includes("bebida") || catsStr.includes("juice") || catsStr.includes("soda")) {
                categoria = "Bebidas Não Alcoólicas";
              } else if (catsStr.includes("dairy") || catsStr.includes("milk") || catsStr.includes("leite") || catsStr.includes("cheese") || catsStr.includes("cream")) {
                categoria = "Laticínios & Frios";
              } else if (catsStr.includes("snack") || catsStr.includes("biscuit") || catsStr.includes("cookie") || catsStr.includes("biscoito")) {
                categoria = "Biscoitos & Snacks";
              } else if (catsStr.includes("cleaning") || catsStr.includes("detergent") || catsStr.includes("limpeza")) {
                categoria = "Limpeza Doméstica";
              } else {
                categoria = "Mercearia / Grãos & Cereais";
              }
            } else {
              categoria = "Mercearia / Grãos & Cereais";
            }

            return res.json({
              nomeProduto: nomeProduto || "",
              marca: marca || "",
              categoria: categoria,
              fotoUrl: fotoUrl || "",
              fonte: "Open Food Facts",
            });
          }
        }
      } catch (e) {
        console.warn("Open Food Facts timeout or fetch error:", e);
      }

      // Step 2: If not found in Open Food Facts, use Gemini with Google Search Grounding to search the web for the exact EAN
      if (!nomeProduto) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          // Perform Google Search query via Gemini
          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `Faça uma pesquisa no Google pelo código de barras EAN ${cleanEan} do Brasil (como no Cosmos Bluesoft, supermercados ou Google Shopping).
Descubra qual é o PRODUTO REAL exato vendido no Brasil com este código de barras ${cleanEan}.
Retorne OBRIGATORIAMENTE em formato JSON válido com as chaves:
- "nomeProduto": Nome exato completo do produto com marca e peso/volume (Ex: "Creme de Leite Leve Nestlé 200g", "Leite UHT Integral Piracanjuba 1L", "Achocolatado em Pó Nescau 370g").
- "categoria": A categoria do produto (Ex: "Laticínios & Frios", "Bebidas Não Alcoólicas", "Mercearia / Grãos & Cereais", "Limpeza Doméstica", "Higiene & Perfumaria", "Biscoitos & Snacks").
- "fotoUrl": URL de imagem do produto se encontrada na busca ou vazia.`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const rawText = response.text || "";
          // Extract JSON block from response text
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.nomeProduto && !parsed.nomeProduto.toLowerCase().includes("desconhecido")) {
                nomeProduto = parsed.nomeProduto;
                categoria = parsed.categoria || "Mercearia / Grãos & Cereais";
                if (parsed.fotoUrl && parsed.fotoUrl.startsWith("http")) {
                  fotoUrl = parsed.fotoUrl;
                }
                fonte = "Google Search (Gemini)";
              }
            } catch (jsonErr) {
              console.warn("Erro ao parsear JSON do Gemini Search:", jsonErr);
            }
          }
        }
      }

      // Fallback for image if no direct package photo URL was returned:
      if (!fotoUrl && nomeProduto) {
        const nomeLower = nomeProduto.toLowerCase();
        if (nomeLower.includes("leite") || nomeLower.includes("creme de leite")) {
          fotoUrl = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80"; // Milk / Cream product photo
        } else if (nomeLower.includes("café") || nomeLower.includes("cafe")) {
          fotoUrl = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80"; // Coffee
        } else if (nomeLower.includes("refrigerante") || nomeLower.includes("coca") || nomeLower.includes("guaraná") || nomeLower.includes("suco")) {
          fotoUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80"; // Beverage
        } else if (nomeLower.includes("arroz") || nomeLower.includes("feijão") || nomeLower.includes("macarrão") || nomeLower.includes("massa")) {
          fotoUrl = "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80"; // Grains / Grocery
        } else if (nomeLower.includes("detergente") || nomeLower.includes("sabão") || nomeLower.includes("amaciante") || nomeLower.includes("limpeza")) {
          fotoUrl = "https://images.unsplash.com/photo-1585832770485-e68a5fc88280?auto=format&fit=crop&w=600&q=80"; // Cleaning
        } else if (nomeLower.includes("biscoito") || nomeLower.includes("bolacha") || nomeLower.includes("chocolate")) {
          fotoUrl = "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80"; // Snacks / Biscuits
        } else {
          fotoUrl = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"; // Supermarket generic
        }
      }

      return res.json({
        nomeProduto: nomeProduto || "",
        categoria: categoria || "",
        fotoUrl: fotoUrl || "",
        fonte: fonte || "Geral",
      });
    } catch (err: any) {
      console.error("Erro na consulta de código de barras:", err);
      return res.status(500).json({ error: err.message || "Falha ao consultar código de barras" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();

