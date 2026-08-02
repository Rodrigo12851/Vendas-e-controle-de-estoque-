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
      let marca = "";
      let categoria = "";
      let fotoUrl = "";
      let fonte = "";

      // First query Open Food Facts to grab raw metadata if available
      let rawOffData: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const offRes = await fetch(`https://br.openfoodfacts.org/api/v2/product/${cleanEan}.json`, {
          signal: controller.signal,
          headers: {
            "User-Agent": "ValidadeSupermercadoApp - Web - Version 1.0",
          },
        });
        clearTimeout(timeoutId);

        if (offRes.ok) {
          const offJson = await offRes.json();
          if (offJson && offJson.status === 1 && offJson.product) {
            rawOffData = offJson.product;
          }
        }
      } catch (e) {
        console.warn("Open Food Facts fetch error/timeout:", e);
      }

      // Step 2: Use Gemini with Google Search to identify exact full supermarket name & clean studio image
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const contextData = rawOffData
            ? `Dados brutos encontrados no banco: Nome='${rawOffData.product_name || rawOffData.product_name_pt}', Marca='${rawOffData.brands}', Peso='${rawOffData.quantity}', Tipo='${rawOffData.generic_name_pt || rawOffData.generic_name}'.`
            : "";

          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `Pesquise no Google pelo código de barras EAN/GTIN ${cleanEan} comercializado no Brasil. ${contextData}
Identifique as informações completas e padronizadas para cadastro de supermercado:
1. 'nomeProduto': Nome completo, ultra detalhado e estruturado no padrão de catálogo profissional de supermercado (Tipo do Produto + Marca + Linha/Sabor + Embalagem/Peso). Exemplo: 'Achocolatado em Pó Nestlé Nescau 2.0 Lata 370g', 'Leite UHT Integral Piracanjuba Caixinha 1L', 'Creme de Leite Leve Nestlé Caixinha 200g', 'Refrigerante Coca-Cola Original Garrafa PET 2L'.
2. 'marca': Nome exato da marca (Ex: 'Nestlé', 'Piracanjuba', 'Coca-Cola').
3. 'categoria': Categoria de supermercado adequada (Ex: 'Bebidas Não Alcoólicas', 'Laticínios & Frios', 'Mercearia / Grãos & Cereais', 'Limpeza Doméstica', 'Biscoitos & Snacks', 'Higiene & Perfumaria').
4. 'fotoUrl': URL de uma imagem de alta qualidade do produto com fundo branco de estúdio (packshot oficial/supermercado com fundo limpo e transparente ou branco). Se não encontrar foto oficial com fundo branco, retorne vazia.

Retorne OBRIGATORIAMENTE em JSON válido com as chaves: "nomeProduto", "marca", "categoria", "fotoUrl".`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const rawText = response.text || "";
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.nomeProduto && !parsed.nomeProduto.toLowerCase().includes("desconhecido")) {
                nomeProduto = parsed.nomeProduto;
                marca = parsed.marca || rawOffData?.brands || "";
                categoria = parsed.categoria || "Mercearia / Grãos & Cereais";
                if (parsed.fotoUrl && (parsed.fotoUrl.startsWith("http://") || parsed.fotoUrl.startsWith("https://"))) {
                  fotoUrl = parsed.fotoUrl;
                }
                fonte = "Gemini + Google Search";
              }
            } catch (jsonErr) {
              console.warn("Erro ao parsear JSON do Gemini:", jsonErr);
            }
          }
        } catch (gemErr) {
          console.warn("Erro ao consultar Gemini:", gemErr);
        }
      }

      // Step 3: Fallback assembling from Open Food Facts if Gemini search missed
      if (!nomeProduto && rawOffData) {
        const prod = rawOffData;
        const rawNome = prod.product_name_pt || prod.product_name || "";
        const rawMarca = prod.brands || "";
        const rawQtd = prod.quantity || "";
        const rawTipo = prod.generic_name_pt || prod.generic_name || "";

        marca = rawMarca;
        let partes = [];
        if (rawTipo && !rawNome.toLowerCase().includes(rawTipo.toLowerCase())) partes.push(rawTipo);
        if (rawMarca && !rawNome.toLowerCase().includes(rawMarca.toLowerCase())) partes.push(rawMarca);
        partes.push(rawNome);
        if (rawQtd && !rawNome.toLowerCase().includes(rawQtd.toLowerCase())) partes.push(rawQtd);

        nomeProduto = partes.filter(Boolean).join(" ");
        fotoUrl = prod.image_front_url || prod.image_url || "";
        fonte = "Open Food Facts";
      }

      // Step 4: Fallback for clean studio image fallback if photo is missing or broken
      if (!fotoUrl && nomeProduto) {
        const nomeLower = nomeProduto.toLowerCase();
        if (nomeLower.includes("nescau") || nomeLower.includes("achocolatado")) {
          fotoUrl = "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80";
        } else if (nomeLower.includes("leite") || nomeLower.includes("creme de leite")) {
          fotoUrl = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80";
        } else if (nomeLower.includes("café") || nomeLower.includes("cafe")) {
          fotoUrl = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80";
        } else if (nomeLower.includes("refrigerante") || nomeLower.includes("coca") || nomeLower.includes("guaraná") || nomeLower.includes("suco")) {
          fotoUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80";
        } else {
          fotoUrl = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80";
        }
      }

      return res.json({
        nomeProduto: nomeProduto || "",
        marca: marca || "",
        categoria: categoria || "Mercearia / Grãos & Cereais",
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

