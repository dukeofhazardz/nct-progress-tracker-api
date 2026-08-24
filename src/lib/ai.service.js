import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export const generateCourseOutline = async (params) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    Create a comprehensive, ground-up ${params.duration_weeks}-week syllabus for a course titled: '${params.course_title}'.
    Target difficulty: ${params.difficulty_level}.
    Learning goals: ${params.learning_goals.join(", ")}.

    CRITICAL CONSTRAINT: The response must be a valid JSON object matching the schema below.
    The outline should be structured week-by-week.

    Expected Schema:
    {
      "status": "success",
      "meta": {
        "course_title": "string",
        "difficulty_level": "string",
        "total_weeks": number,
        "estimated_hours_per_week": number
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
    const generationConfig = {
        responseMimeType: "application/json",
    };
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });
        const responseText = result.response.text();
        return JSON.parse(responseText);
    }
    catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Failed to generate course outline via AI.");
    }
};
