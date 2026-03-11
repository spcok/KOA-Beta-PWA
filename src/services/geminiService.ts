import { GoogleGenAI, Type } from "@google/genai";
import { SignContent } from "@/src/types";

// Lazy initialization of the Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const MODEL_NAME = "gemini-2.5-flash";

export const analyzeFlightWeather = async (hourlyData: unknown[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following weather data for flight safety: ${JSON.stringify(hourlyData)}`,
    });
    return response.text || 'No analysis available.';
  } catch (error) {
    console.error('Error analyzing flight weather:', error);
    throw new Error('Failed to analyze flight weather. Please try again later.', { cause: error });
  }
};

export const getLatinName = async (species: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `What is the scientific (latin) name for ${species}? Return only the name.`,
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error('Error fetching latin name:', error);
    return '';
  }
};

export const getConservationStatus = async (species: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `What is the IUCN conservation status code for ${species}? Return only the code.`,
    });
    return response.text?.trim() || 'NE';
  } catch (error) {
    console.error('Error fetching conservation status:', error);
    return 'NE';
  }
};

export const generateSignageContent = async (species: string): Promise<SignContent> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Provide diet, habitat, did you know facts, wild origin, and species stats (lifespan in wild, lifespan in captivity, wingspan/length, weight) for ${species}. Return ONLY valid JSON without markdown formatting.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diet: { type: Type.ARRAY, items: { type: Type.STRING } },
            habitat: { type: Type.ARRAY, items: { type: Type.STRING } },
            didYouKnow: { type: Type.ARRAY, items: { type: Type.STRING } },
            wildOrigin: { type: Type.STRING },
            speciesStats: {
              type: Type.OBJECT,
              properties: {
                lifespanWild: { type: Type.STRING },
                lifespanCaptivity: { type: Type.STRING },
                wingspan: { type: Type.STRING },
                weight: { type: Type.STRING },
              },
              required: ["lifespanWild", "lifespanCaptivity", "wingspan", "weight"],
            },
          },
          required: ["diet", "habitat", "didYouKnow", "wildOrigin", "speciesStats"],
        },
      },
    });

    if (!response.text) throw new Error("No content generated");
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error generating signage content:', error);
    throw new Error('Failed to generate signage content.', { cause: error });
  }
};

export const generateExoticSummary = async (species: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Provide a brief summary for ${species} suitable for a zoo sign.`,
    });
    return response.text || '';
  } catch (error) {
    console.error('Error generating exotic summary:', error);
    return '';
  }
};

export const batchGetSpeciesData = async (speciesList: string[]): Promise<Record<string, { latin_name: string, conservation_status: string, fun_fact: string }>> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Provide latin name, IUCN conservation status code, and a fun fact for the following species: ${speciesList.join(', ')}. Return ONLY valid JSON without markdown formatting.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Map of species name to their details",
          additionalProperties: {
            type: Type.OBJECT,
            properties: {
              latin_name: { type: Type.STRING },
              conservation_status: { type: Type.STRING },
              fun_fact: { type: Type.STRING },
            },
            required: ["latin_name", "conservation_status", "fun_fact"],
          },
        },
      },
    });

    if (!response.text) return {};
    
    // The response is already forced to JSON via schema, so we can parse it directly
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error fetching batch species data:', error);
    throw new Error('Failed to fetch species data.', { cause: error });
  }
};

