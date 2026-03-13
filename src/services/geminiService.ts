import { supabase } from '../lib/supabase';
import { SignContent, ConservationStatus } from '../types';

/**
 * DIAGNOSTIC TRACER: Master helper to invoke the Edge Function
 */
const invokeGeminiEdge = async (prompt: string, expectJson: boolean = false) => {
  console.log("🚀 [invokeGeminiEdge] 1. Preparing to invoke Edge Function...");
  console.log("🚀 [invokeGeminiEdge] 2. Supabase Client Status:", supabase ? "Defined" : "UNDEFINED!");
  
  try {
    console.log("🚀 [invokeGeminiEdge] 3. Firing network request to 'gemini-api-proxy'...");
    
    // --- INJECTED RAW FETCH DIAGNOSTIC ---
    const rawUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-api-proxy`;
    console.log("🛠️ [DIAGNOSTIC] Expected Target URL:", rawUrl);
    console.log("🛠️ [DIAGNOSTIC] Supabase Anon Key exists?", !!import.meta.env.VITE_SUPABASE_ANON_KEY);

    // We capture the raw promise to see if it hangs indefinitely
    const requestPromise = supabase.functions.invoke('gemini-api-proxy', {
      body: { prompt }
    });

    // Race the request against a 15-second timeout so it can't hang forever
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Supabase Edge Function Request TIMED OUT after 15 seconds.")), 15000)
    );

    const response = await Promise.race([requestPromise, timeoutPromise]) as { data: unknown; error: { message: string } | null };
    
    console.log("🚀 [invokeGeminiEdge] 4. Network Request Finished! Raw Response:", response);

    const { data, error } = response;

    if (error) {
      console.error("❌ [invokeGeminiEdge] 5. Supabase returned an explicit error object:", error);
      throw new Error(`Edge Function Failed: ${error?.message || JSON.stringify(error)}`);
    }

    let rawText = '';
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      rawText = String(d.text || d.result || JSON.stringify(data));
    } else {
      rawText = String(data || '');
    }
    console.log("🚀 [invokeGeminiEdge] 6. Extracted Text payload:", rawText);

    if (expectJson && typeof rawText === 'string') {
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(rawText);
        console.log("🚀 [invokeGeminiEdge] 7. Successfully parsed JSON payload:", parsed);
        return parsed;
      } catch (e: unknown) {
        console.error("❌ [invokeGeminiEdge] JSON Parse Crash. Raw text was:", rawText);
        throw new Error("Invalid JSON returned from AI.", { cause: e });
      }
    }

    return rawText;
  } catch (err: unknown) {
    console.error("🔥 [invokeGeminiEdge] FATAL CRASH inside service layer:", err);
    throw err;
  }
};

// --- ANIMAL INTELLIGENCE ---

export interface AnimalIntelligenceResponse {
  latin_name?: string;
  red_list_status?: ConservationStatus;
  description?: string;
}

export const getAnimalIntelligence = async (speciesName: string): Promise<AnimalIntelligenceResponse> => {
  try {
    console.log(`🤖 [getAnimalIntelligence] Triggered for: "${speciesName}"`);
    const prompt = `You are a zoological database. Find the scientific name and IUCN Red List status for the animal: "${speciesName}". Return ONLY a raw JSON object matching exactly this schema: {"latin_name": "Scientific Name", "red_list_status": "One of: NE, DD, LC, NT, VU, EN, CR, EW, EX"}. Do not include markdown formatting or backticks.`;
    return await invokeGeminiEdge(prompt, true) as AnimalIntelligenceResponse;
  } catch (error: unknown) {
    console.error("❌ [getAnimalIntelligence] Caught Error from invokeGeminiEdge:", error);
    throw new Error("Failed to fetch animal intelligence.", { cause: error });
  }
};

// --- FLIGHT & WEATHER ---
export const analyzeFlightWeather = async (hourlyData: unknown[]): Promise<string> => {
  const prompt = `Analyze the following weather data for flight safety: ${JSON.stringify(hourlyData)}`;
  return await invokeGeminiEdge(prompt, false) as string;
};

// --- LEGACY UTILS ---
export const getLatinName = async (species: string): Promise<string> => {
  const prompt = `What is the scientific (latin) name for ${species}? Return only the name.`;
  return await invokeGeminiEdge(prompt, false) as string;
};

export const getConservationStatus = async (species: string): Promise<string> => {
  const prompt = `What is the IUCN conservation status code for ${species}? Return only the code (e.g., LC, VU, EN).`;
  return await invokeGeminiEdge(prompt, false) as string;
};

// --- SIGNAGE & SUMMARIES ---
export const generateSignageContent = async (species: string): Promise<SignContent> => {
  const prompt = `Provide diet, habitat, did you know facts, wild origin, and species stats (lifespan in wild, lifespan in captivity, wingspan/length, weight) for ${species}. Return ONLY a raw JSON object matching exactly this schema:
  {"diet": ["item 1", "item 2"], "habitat": ["item 1"], "didYouKnow": ["fact 1"], "wildOrigin": "string", "speciesStats": {"lifespanWild": "string", "lifespanCaptivity": "string", "wingspan": "string", "weight": "string"}}. Do not include markdown formatting or backticks.`;
  return await invokeGeminiEdge(prompt, true) as SignContent;
};

export const generateExoticSummary = async (species: string): Promise<string> => {
  const prompt = `Provide a brief summary for ${species} suitable for a zoo sign.`;
  return await invokeGeminiEdge(prompt, false) as string;
};

export const batchGetSpeciesData = async (speciesList: string[]): Promise<Record<string, { latin_name: string, conservation_status: string, fun_fact: string }>> => {
  const prompt = `Provide latin name, IUCN conservation status code, and a fun fact for the following species: ${speciesList.join(', ')}. Return ONLY a raw JSON object where the keys are the exact species names provided, and the values are objects with "latin_name", "conservation_status", and "fun_fact". Do not include markdown formatting or backticks.`;
  return await invokeGeminiEdge(prompt, true) as Record<string, { latin_name: string, conservation_status: string, fun_fact: string }>;
};
