# NCT Progress Tracker API - Syllabus AI Integration

This document outlines the API endpoints for the AI-powered syllabus generation feature to assist frontend developers.

## 1. Authentication
All endpoints (except login) require a Bearer Token in the header.
**Header:** `Authorization: Bearer <JWT_TOKEN>`

---

## 2. Generate Syllabus
Creates a new course outline using AI and stores it in the database.

*   **Endpoint:** `POST /api/curriculum/generate`
*   **Access:** Admin Only
*   **Request Body:**
    ```json
    {
      "courseTitle": "Introduction to React",
      "difficultyLevel": "beginner", // "beginner" | "intermediate" | "advanced"
      "durationWeeks": 4,           // 1 to 12
      "departmentId": "uuid-here",  // Required for relation
      "learningGoals": ["Goal 1", "Goal 2"], // Array of strings
      "daysPerWeek": 3              // Optional: 1 to 7
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Syllabus generated successfully",
      "syllabus": {
        "id": "uuid",
        "courseTitle": "...",
        "content": {
          "status": "success",
          "meta": { ... },
          "outline": [
            {
              "week_number": 1,
              "week_topic": "...",
              "modules": [
                 {
                   "module_id": "w1_m1",
                   "module_title": "...",
                   "estimated_minutes": 90,
                   "key_concepts": [...],
                   "suggested_practical_exercise": "..."
                 }
              ]
            }
          ]
        }
      }
    }
    ```

---

## 3. Get Department Syllabi
Retrieves all generated syllabi for a specific department.

*   **Endpoint:** `GET /api/curriculum/syllabi/department/:departmentId`
*   **Access:** Authenticated
*   **Success Response (200 OK):**
    ```json
    {
      "syllabi": [
        {
          "id": "uuid",
          "courseTitle": "...",
          "content": { ... },
          "createdAt": "..."
        }
      ]
    }
    ```

---

## 4. Get Syllabus by ID
Retrieves a single syllabus detail.

*   **Endpoint:** `GET /api/curriculum/syllabi/:id`
*   **Access:** Authenticated
*   **Success Response (200 OK):**
    ```json
    {
      "syllabus": {
        "id": "uuid",
        "content": { ... }
      }
    }
    ```

## 5. UI Implementation Notes
- The `content` field in the response contains the nested JSON structure for the curriculum.
- Frontend should iterate through `content.outline` to render weeks and `week.modules` to render daily/topic sub-sections.
- A reference implementation can be found in `public/index.html`.
