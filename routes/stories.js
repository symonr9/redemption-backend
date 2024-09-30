const express = require('express');
const prisma = require('../misc/prisma-client');
const { OpenAI } = require("openai");

const router = express.Router();

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
});


// The assistant's system instructions
const systemInstructions = `
Your role is to partition Christian testimonies based on prompt question and their response. Categorize parts of the response into sections (only if it fits the section): Before Christ (1), Salvation Moment (2) (only use for moment they initially become a follower of Jesus), After Christ (3). Skip any that don't apply. Format the output as a JSON object array for categories, including the 'category' enum value, 'title' summarizing the details concisely, 'details' (a direct quote/paraphrase of the part of the testimony with standalone context), 'questions' (it has to be called questions) string array, 1-2 short, natural present-tense follow-up questions for those who hear user's testimony, and 'tags' string of number values of any that apply well: (1) Youth, (2) AddictionRecovery, (3) Family, (4) CollegeStudent, (5) Parent, (6) Marriage, (7) Grief, (8) Health, (9) Identity, (10) Doubts, (11) SocialJustice, (12) Community, (13) LifeTransition, (14) Purpose, (15) LGBTQ, (16) Military, (17) Immigrant, (18) Prison, (19) Service, (20) Workplace, (21) Racial, (22) Nature, (23) Missions, (24) Finances, (25) Atheist, (26) Culture, (27) Games, (28) Spirituality, (29) Forgiveness, (30) Joy, (31) Peace, (32) Love, (33) Faithfulness, (34) Music, (35) Prayer, (36) Worship, (37) Discipleship, (38) Scripture, (39) Upbringing, (40) Suffering, and 'names' comma separated string that are all names that show up in testimony (could be empty), and 'quality' number scale 1-10 indicating how essential it is for someone's testimony (8 or greater is absolutely integral to their faith journey, 5-7 is important to their journey, 3-4 is somewhat important, 1-2 is neutral). Generate 1-4 objects for array.
`;

router.post('/partition/:userId', async (req, res) => {
    const { question, userResponse } = req.body;
    if (!question || !userResponse) {
        res.status(400).json({ error: "Invalid request" });
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
        };

        // TODO: Check if user has partitioned yet today.

        // Create a chat completion with the system instructions and user input
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: `Prompt: ${question}\nResponse: ${userResponse}` }
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

router.post('/add/:userId', async (req, res) => {
    const { chapterArray } = req.body;
    if (!Array.isArray(chapterArray) || chapterArray.length === 0) {
        return res.status(400).json({ error: 'Chapters array is required.' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
        };

        const createdChapters = await prisma.storyChapter.createMany({
            data: chapterArray.map((chapter) => ({
                storyId: chapter.storyId || null,
                type: chapter.type,
                title: chapter.title,
                content: chapter.content || null,
                questions: chapter.questions.join(','),
                icon: chapter.iconKey || 'Book',
                order: chapter.order || 1,
                tags: chapter.tags ? chapter.tags.join(',') : null,
                names: chapter.names.join(','),
                quality: chapter.quality || 5,
                userId: req.params.userId,
            })),
        });

        res.status(200).json({ response: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
