const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');
const { OpenAI } = require("openai");
const { isWithinPast24Hours, formatDateTime, cleanForProfanity, hasValidTextLength } = require('../utils/serverUtils');
const { LogType } = require('../enums/enums');
const { MAX_NORMAL_TEXT_LENGTH, MAX_NAME_LENGTH, MAX_LONG_TEXT_LENGTH } = require('../constants/constants');

const router = express.Router();

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
});


// The assistant's system instructions
const systemInstructions = `
Your role is to partition Christian testimonies into sections based on prompt question and their response. Format the output as a JSON object array. Objects should have the following properies: 'category' int value of the section that fits best: (1) Before Christ (Anything related to life, behaviors, struggles, questions before becoming a Christian), (2) Salvation Moment (when they accepted Jesus as Lord and started following Him), (3) After Christ (Anything related to their transformation, life after Christ, growth in Christian life), 'title' string summarizing the section concisely, 'details' string paraphrase of the section in first person with standalone context), 'questions' (it has to be called questions) string array, 1-2 short, natural present-tense follow-up questions for those who hear user's testimony, and 'tags' comma separated string of number values of any that apply to section (can be up to 5): (1) Youth, (2) AddictionRecovery, (3) Family, (4) CollegeStudent, (5) Parent, (6) Marriage, (7) Grief, (8) Health, (9) Identity, (10) Doubts, (11) SocialJustice, (12) Community, (13) LifeTransition, (14) Purpose, (15) LGBTQ, (16) Military, (17) Immigrant, (18) Prison, (19) Service, (20) Workplace, (21) Racial, (22) Nature, (23) Missions, (24) Finances, (25) Atheist, (26) Culture, (27) Games, (28) Spirituality, (29) Forgiveness, (30) Joy, (31) Peace, (32) Love, (33) Faithfulness, (34) Music, (35) Prayer, (36) Worship, (37) Discipleship, (38) Scripture, (39) Upbringing, (40) Suffering, and 'names' comma separated string that are all names that show up in testimony (could be empty), and 'quality' number scale 1-10 indicating how essential it is for someone's testimony (8 or greater is absolutely integral to their faith journey, 5-7 is important to their journey, 3-4 is somewhat important, 1-2 is neutral). Only generate at most 3 sections.
`;

router.post('/partition', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { question, userResponse } = req.body;
    if (!question || !userResponse) {
        res.status(400).json({ error: "Invalid request" });
        return;
    }

    try {
        const cleanQuestion = cleanForProfanity(question);
        const cleanResponse = cleanForProfanity(userResponse);
        if (!hasValidTextLength(cleanResponse, 1, 1800)) {
            res.status(400).json({ error: `Response must be between 1 and ${1800} characters.` });
            return;
        }

        if (isPartitionNotAllowed(user)) {
            const newDate = new Date(user.lastPartitionDate);
            newDate.setDate(newDate.getDate() + 1);
            res.status(400).json({ error: `You have hit your testimony practice limit for today. Please check back on ${formatDateTime(newDate)}` });
            return;
        }

        // Create a chat completion with the system instructions and user input
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: `Prompt: ${cleanQuestion}\nResponse: ${cleanResponse}` }
            ],
        });

        const json = getPartitionResponseAsJSON(completion);
        if (!json) {
            res.status(500).json({ error: "No valid JSON found in response." });
            return;
        }

        const { total_tokens } = completion.usage;
        console.log("Tokens used: ", total_tokens);

        await prisma.log.create({
            data: {
                type: LogType.Partition,
                userId: user.id,
                details: `Tokens used: ${total_tokens}`
            }
        });

        const dataToUpdate = {
            extraPartitionCount: user.extraPartitionCount > 0 ? user.extraPartitionCount - 1 : 0,
        };
        if (user.extraPartitionCount === 0) {
            dataToUpdate.lastPartitionDate = new Date();
        };

        await prisma.user.update({
            where: { id: user.id },
            data: dataToUpdate
        });

        res.status(200).json(json);
    } catch (error) {
        console.error(`Error with partition request: ${error}`);

        let err = '';
        if (error.response?.data && typeof error.response?.data === 'string') {
            err = error.response.data;
        } else if (error.response && typeof error.response === 'string') {
            err = error.response;
        } else if (error.message && typeof error.message === 'string') {
            err = error.message;
        }
        res.status(500).json({ error: `Error: ${err}` });
    }
});

function isPartitionNotAllowed(user) {
    return user.lastPartitionDate !== undefined
        && isWithinPast24Hours(user.lastPartitionDate)
        && user.extraPartitionCount === 0;
}

function getPartitionResponseAsJSON(completion) {
    const assistantResponse = completion.choices[0].message.content;
    const jsonMatch = assistantResponse.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
        return null;
    }

    try {
        return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
        console.error(e);
        return null;
    }
}

router.post('/unlockPractice', authenticateJwt, async (req, res) => {
    const user = req.user;
    try {
        if (user.lastExtraPartitionGranted) {
            const lastGranted = new Date(user.lastExtraPartitionGranted);
            if (isWithinPast24Hours(lastGranted)) {
                res.status(400).json({ error: 'You already unlocked an extra practice today.' });
                return;
            }
        }

        await prisma.log.create({
            data: {
                type: LogType.UnlockPractice,
                userId: user.id,
                details: `[New Count: ${user.extraPartitionCount + 1}]`
            }
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastExtraPartitionGranted: new Date(),
                extraPartitionCount: user.extraPartitionCount + 1,
            }
        });

        res.status(200).json({ response: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/create', authenticateJwt, async (req, res) => {
    const user = req.user;

    const { chapterArray } = req.body;
    if (!Array.isArray(chapterArray) || chapterArray.length === 0) {
        return res.status(400).json({ error: 'Chapters array is required.' });
    }

    try {
        let error = null;
        const data = chapterArray.map((chapter) => {
            const cleanTitle = cleanForProfanity(chapter.title);
            if (!hasValidTextLength(cleanTitle, 1, MAX_NAME_LENGTH)) {
                error = `Title must be between 1 and ${MAX_NAME_LENGTH} characters.`;
                return {};
            } 

            const cleanContent = cleanForProfanity(chapter.content);
            if (!hasValidTextLength(cleanContent, 1, MAX_LONG_TEXT_LENGTH)) {
                error = `Content must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.`;
                return {};
            }
        
            return {
                storyId: chapter.storyId || null,
                type: chapter.chapterType,
                title: cleanTitle,
                content: cleanContent || null,
                questions: chapter.questions ? cleanForProfanity(chapter.questions.join('∫')) : '',
                icon: chapter.icon || 'Book',
                order: chapter.order || 1,
                tags: chapter.tags ? chapter.tags.join('∫') : null,
                names: chapter.names ? cleanForProfanity(chapter.names.join('∫')) : '',
                quality: chapter.quality || 5,
                originalPrompt: chapter.originalPrompt || null,
                userId: user.id,
                created: new Date()
            };
        });

        if (error !== null) {
            res.status(400).json({ error });
            return;
        }

        const createdChapters = await prisma.storyChapter.createMany({data});

        await prisma.log.create({
            data: {
                type: LogType.CreateChapter,
                userId: user.id,
                details: `Created ${createdChapters.length} chapter(s)`
            }
        });

        res.status(200).json({ response: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/update', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { chapter } = req.body;

    try {
        const cleanTitle = cleanForProfanity(chapter.title);
        if (!hasValidTextLength(cleanTitle, 1, MAX_NAME_LENGTH)) {
            res.status(400).json({ error: `Title must be between 1 and ${MAX_NAME_LENGTH} characters.` });
            return;
        } 

        const cleanContent = cleanForProfanity(chapter.content);
        if (!hasValidTextLength(cleanContent, 1, MAX_LONG_TEXT_LENGTH)) {
            res.status(400).json({ error: `Response must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
            return;
        }

        const updatedChapter = await prisma.storyChapter.update({
            where: {
                id: chapter.id,
            },
            data: {
                storyId: chapter.storyId || null,
                type: chapter.chapterType,
                title: cleanTitle,
                content: cleanContent || null,
                questions: chapter.questions ? cleanForProfanity(chapter.questions.join('∫')) : '',
                icon: chapter.icon || 'Book',
                order: chapter.order || 1,
                tags: chapter.tags ? chapter.tags.join('∫') : null,
                names: chapter.names ? cleanForProfanity(chapter.names.join('∫')) : '',
                quality: chapter.quality || 5,
                originalPrompt: chapter.originalPrompt || null,
                userId: user.id,
                created: new Date()
            }
        });

        await prisma.log.create({
            data: {
                type: LogType.UpdateChapter,
                userId: user.id,
                details: `Updated chapter: [ID: ${updatedChapter.id}]`
            }
        });

        res.status(200).json({ response: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/delete', authenticateJwt, async (req, res) => {
    const user = req.user;

    const { chapter } = req.body;

    try {
        await prisma.storyChapter.delete({
            where: {
                id: chapter.id,
            },
        });

        await prisma.log.create({
            data: {
                type: LogType.DeleteChapter,
                userId: user.id,
                details: `Deleted chapter: [ID: ${chapter.id}]`
            }
        });

        res.status(200).json({ response: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
