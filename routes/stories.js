const express = require('express');
const prisma = require('../misc/prisma-client'); // Assuming this is used elsewhere
const { OpenAI } = require("openai");

const fs = require('fs'); // Required for reading the audio file
const path = require('path'); // For file paths
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Specify your upload directory

const router = express.Router();

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });


// The assistant's system instructions
const systemInstructions = `
Your role is to help users articulate their Christian testimonies based on a prompt question and response. Categorize the testimony into sections: My Upbringing (1), Life Before Christ (2), Salvation Moment (3), Transformation (4), Highlight (5), Lowlight (6), and Where I'm At Now (7), skipping any that don’t apply. Format the output as a JSON object array for each category, including the enum value (category number), concise title summarzing the details, details (a direct passage of the testimony), 1-2 discussion questions that encourage spiritual conversation, and feedback on tone, emphasis, and suggestions.
`;

router.post('/speechToText', upload.single('audio'), async (req, res) => {
    try {
        console.log("req.files: ", req);
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const audioFilePath = req.file.path; // Path to the uploaded audio file
        console.log('Received audio file:', audioFilePath);

        console.log("req.body: ", req.body.audio);

        // Send the audio file to OpenAI Whisper API for transcription
        const transcriptionResponse = await client.audio.transcriptions.create({
            model: "whisper-1", // Whisper model
            file: fs.createReadStream(audioFilePath), // Stream the audio file
        });

        // Extract the transcribed text
        const transcribedText = transcriptionResponse.text;
        console.log('Transcribed Text:', transcribedText);

        // Return the transcription as a response
        res.status(200).json({ transcription: transcribedText });
    } catch (error) {
        console.error("Error with OpenAI request:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up the uploaded file (optional)
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error removing temporary file:', err);
                else console.log('Temporary file deleted.');
            });
        }
    }
});

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

        console.log("RESPONSE: ", assistantResponse);

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
