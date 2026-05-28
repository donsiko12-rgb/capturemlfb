import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase request limit for large high-res nameplate photos
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Lazy initializer for the Gemini client to ensure the server starts seamlessly
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY environment variable is missing. Please configure it in the AI Studio Settings > Secrets panel."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to clean up data plate base64 strings and detect MIME type
function parseBase64Image(dataString: string) {
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return {
      mimeType: "image/jpeg",
      data: dataString,
    };
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

// OCR Processing endpoint
app.post("/api/ocr", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No se proporcionó una imagen para analizar." });
    }

    const { mimeType, data } = parseBase64Image(image);
    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType,
        data,
      },
    };

    const promptText = `
Analiza con máxima precisión esta placa de características o placa de datos de un producto industrial Siemens (motor eléctrico, PLC, arrancador suave, variador de velocidad, contactor, relé o interruptor).
Su objetivo principal es identificar y extraer el número de referencia del fabricante, conocido en Siemens como **MLFB** (Order Number / Bestell-Nr. / Número de Pedido o de Parte) y los **Códigos Z** (opciones opcionales que suelen indicarse detrás de un sufijo "-Z" o antecedidos de "Z=" o "Z: " en cualquier lugar de la placa).

Extraiga y devuelva los siguientes campos con la estructura JSON solicitada:
1. **mlfb**: Cadena limpia con el número de parte exacto. Formatea en mayúsculas, conservando los guiones originales (p.ej., "1FK7060-5AF71-1SG0-Z", "3RT1025-1AP00", "1LA7083-4AA10-Z", "6SL3210-5BE22-2UV0"). Limpia corchetes u otros caracteres erróneos.
2. **z_codes**: Lista de cadenas que representan cada opción de código Z de forma separada. Por ejemplo, si en la placa dice "-Z: A11+C12+G11" o "Z = A11+C12", debes separar e incluir cada uno individualmente: ["A11", "C12", "G11"]. Si no hay códigos Z indicados, devuelva una lista vacía [].
3. **model_name**: Nombre o descripción de la familia del producto (p.ej., "SIMOTICS S Synchronous Motor", "SIRIUS Contactor", "SIRIUS Soft Starter 3RW", "SINAMICS Power Module", "SIMATIC S7-1200 CPU").
4. **serial_number**: Número de serie, número de fabricación o serie FD (p.ej. "E-D41234567 01 002" o "FD 9508/0123456").
5. **technical_specs**: Listado de especificaciones técnicas clave encontradas en la placa como voltaje (V), amperaje o corriente (A), potencia (kW o hp), velocidad (rpm), frecuencia (Hz), grado de protección (IP55, IP20, etc.), factor de potencia (cos phi). Cada especificación debe incluir una etiqueta legible ("label", p.ej., "Potencia", "Voltaje", "Corriente", "Velocidad") y su valor final con unidades ("value").
6. **raw_ocr**: Todo el texto en bruto que logres leer en la placa estructurado línea por línea para registro técnico.
7. **confidence**: Tu estimación de fiabilidad en la lectura de los códigos MLFB y Z ("High" si son perfectamente legibles; "Medium" si hay ligera distorsión o polvo pero son legibles; "Low" si está muy borroso o incompleto).
8. **confidence_reason**: Breve justificación en español del nivel de confianza asignado (p.ej., "El código MLFB "1FK..." es nítido, pero algunas especificaciones técnicas están raspadas").

Garantice la respuesta estricta según el esquema JSON definido.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mlfb: {
              type: Type.STRING,
              description: "Siemens order number or part number (MLFB) formatted in uppercase with hyphens.",
            },
            z_codes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of extracted Z-option codes, parsed individually.",
            },
            model_name: {
              type: Type.STRING,
              description: "The product family or description category.",
            },
            serial_number: {
              type: Type.STRING,
              description: "The unique serial number or FD number.",
            },
            technical_specs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Attribute name, e.g. Voltaje, Potencia, Corriente." },
                  value: { type: Type.STRING, description: "Attribute value with unit, e.g. 400 V, 1.5 kW." },
                },
                required: ["label", "value"],
              },
              description: "List of key electrical and performance specs.",
            },
            raw_ocr: {
              type: Type.STRING,
              description: "Full transcribed raw text from the Siemens hardware label.",
            },
            confidence: {
              type: Type.STRING,
              description: "OCR confidence assessment: 'High', 'Medium', or 'Low'.",
            },
            confidence_reason: {
              type: Type.STRING,
              description: "Brief reason in Spanish for the confidence evaluation.",
            },
          },
          required: [
            "mlfb",
            "z_codes",
            "model_name",
            "serial_number",
            "technical_specs",
            "raw_ocr",
            "confidence"
          ],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo obtener una respuesta legible de la inteligencia artificial.");
    }

    const ocrData = JSON.parse(resultText.trim());
    return res.json(ocrData);
  } catch (error: any) {
    console.error("Error en procesamiento OCR:", error);
    return res.status(500).json({
      error: error.message || "Error al procesar la placa de características.",
    });
  }
});

// Configure Vite middleware in development or static asset serving in production
async function main() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando servidor en modo Desarrollo con Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando servidor en modo Producción...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor full-stack corriendo en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Error al iniciar el servidor:", err);
});
