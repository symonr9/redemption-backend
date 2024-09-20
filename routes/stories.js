const express = require('express');
const prisma = require('../misc/prisma-client'); // Assuming this is used elsewhere
const { OpenAI } = require("openai");

const router = express.Router();

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });


// The assistant's system instructions
const systemInstructions = `
  Your job is to help people articulate and share their Christian testimony. You will be given a prompt question and a response that someone gave for the prompt. It will have components of your testimony.

  First, categorize the testimony into these areas: "My Upbringing (1), Life Before Christ (2), Salvation Moment (3), Transformation (4), Highlight (5), Lowlight (6), Where I'm at now (7)".
  These areas may not be applicable for the response, this is okay... just skip them.

  For each area, please organize and concisely summarize in the person's own tone of voice what they said. Use direct quotes. Make it sound natural.

  After organizing this, create a summary title for each category that represents each section. This could be a quote from the section or a word/phrase that summarizes it well.

  Return as JSON, object array of categories + enum int value of category, title, and details.
`;

router.post('/transpose', async (req, res) => {
    const { question, response } = req.body;
    if (!question || !response) {
        res.status(400).json({ error: "Invalid request" });
        return;
    }

    try {
        // Create a chat completion with the system instructions and user input
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: `Prompt: ${question}\nResponse: ${response}` }
            ],
        });

        const { total_tokens } = completion.usage;
        console.log("Tokens used: ", total_tokens);

        // Extract the assistant's response
        const assistantResponse = completion.choices[0].message.content;

        // Use a regex to extract the JSON portion
        const jsonMatch = assistantResponse.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            const jsonString = jsonMatch[1].trim();
            const jsonResponse = JSON.parse(jsonString);
            res.status(200).json(jsonResponse);
        } else {
            res.status(400).json({ error: "No valid JSON found in response." });
        }
    } catch (error) {
        console.error("Error with OpenAI request:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
