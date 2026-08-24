import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GenerateOutlineParams {
  course_title: string;
  difficulty_level: string;
  duration_weeks: number;
  learning_goals: string[];
  days_per_week?: number;
}

export const generateCourseOutline = async (params: GenerateOutlineParams) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Create a comprehensive, ground-up ${params.duration_weeks}-week syllabus for a course titled: '${params.course_title}'.
    Target difficulty: ${params.difficulty_level}.
    Learning goals: ${params.learning_goals.join(", ")}.
    ${params.days_per_week ? `The course runs ${params.days_per_week} days per week.` : ""}

    CRITICAL CONSTRAINT: The response must be a valid JSON object matching the schema below.
    The outline should be structured week-by-week. If days per week are specified, ensure the modules are distributed logically across those days.

    Expected Schema:
    {
      "status": "success",
      "meta": {
        "course_title": "string",
        "difficulty_level": "string",
        "total_weeks": number,
        "estimated_hours_per_week": number,
        "days_per_week": ${params.days_per_week || "null"}
      },
      "outline": [
        {
          "week_number": number,
          "week_topic": "string",
          "weekly_summary": "string",
          "modules": [
            {
              "module_id": "string (e.g., w1_m1)",
              "module_title": "string",
              "estimated_minutes": number,
              "key_concepts": ["string"],
              "suggested_practical_exercise": "string"
            }
          ]
        }
      ]
    }
  `;

  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate course outline via AI.");
  }
};
