const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access the API keys from environment variables
const keys = {
    review: process.env.GEMINI_API_KEY_REVIEW,
    test: process.env.GEMINI_API_KEY_TEST,
    architecture: process.env.GEMINI_API_KEY_ARCHITECTURE,
    followup: process.env.GEMINI_API_KEY_FOLLOWUP,
    scorecard: process.env.GEMINI_API_KEY_SCORECARD,
    chat: process.env.CHAT_GEMINI_API_KEY
};

const instances = {};

for (const [action, key] of Object.entries(keys)) {
    if (key) {
        instances[action] = new GoogleGenerativeAI(key);
    } else {
        console.warn(`API key for ${action} is not set. This feature will be disabled.`);
    }
}

const getAIResponse = async (prompt, systemInstruction, action, conversationHistory = []) => {
    const aiInstance = instances[action];
    if (!aiInstance) {
        throw new Error(`AI is not configured for action: ${action}.`);
    }
    
    // Create the generative model with the systemInstruction
    const model = aiInstance.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: systemInstruction 
    });
    
    // Use startChat for conversational actions if history is provided
    if (conversationHistory && conversationHistory.length > 0) {
        const chat = model.startChat({
            history: conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }))
        });
        const result = await chat.sendMessage(prompt);
        return result.response.text();
    }
    
    const result = await model.generateContent(prompt);
    return result.response.text();
};

const handleAIRequest = async (req, res) => {
    try {
        const { action, code, language, context, userProfile, conversationHistory, toolResults } = req.body;
        
        const activeGenAI = instances[action];

        if (!activeGenAI) {
            return res.status(503).json({ success: false, message: `AI ${action} feature is currently unavailable due to missing configuration.` });
        }

        let prompt = "";
        let systemInstruction = "";
        
        // Personalization Prefix
        let personalization = "";
        if (userProfile && userProfile.name) {
            personalization = `The user is ${userProfile.name}, a ${userProfile.yearOfStudy || 'current'}-year student at ${userProfile.university || 'university'}. `;
            if (userProfile.skills && userProfile.skills.length > 0) personalization += `Their skills include: ${userProfile.skills.join(', ')}. `;
            if (userProfile.programmingLanguages && userProfile.programmingLanguages.length > 0) personalization += `Languages they know: ${userProfile.programmingLanguages.join(', ')}. `;
            personalization += "Tailor your response to their specific skill level and background.\n\n";
        }

        // Tools output integration
        let toolsContext = "";
        if (toolResults) {
            toolsContext = `\n\n[TOOL RESULTS - Reference these metrics in your response]\n${toolResults}\n[END TOOL RESULTS]\n`;
        }

        switch (action) {
            case "review":
                systemInstruction = personalization + "You are an expert AI code reviewer. Your job is to strictly review the provided code. Provide constructive feedback, identify potential bugs, suggest optimizations, and comment on code quality. Do not write full rewrites unless necessary to show an optimization.";
                prompt = `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`${toolsContext}\n\nReview:`;
                break;
            case "test":
                systemInstruction = personalization + "You are an expert AI test engineer. Your job is to generate comprehensive unit tests for the provided code. Make sure to cover edge cases, normal inputs, and invalid inputs. Only output the test code and brief explanations.";
                prompt = `Generate unit tests for the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nTests:`;
                break;
            case "architecture":
                systemInstruction = personalization + "You are an expert AI software architect. Your job is to help users design scalable, robust application architecture. Provide a detailed architecture plan, including folder structure, key components, and design patterns based on the context.";
                prompt = `Here is my context/request:\n\n${context}\n\nPlease provide a detailed architecture plan.`;
                break;
            case "chat":
                systemInstruction = personalization + "You are a helpful coding assistant pair programming with the user. Answer their questions concisely and accurately. Assume the context of their collaborative project.";
                prompt = `Context:\n${context}\n\nQuestion:\n${code}\n\nAnswer:`;
                break;
            case "followup":
                systemInstruction = personalization + "You are an expert technical interviewer assistant. Your job is to analyze the candidate's code and generate 3 bespoke follow-up questions that challenge their specific implementation choices (e.g., time/space complexity, edge cases, refactoring opportunities). Do not provide generic questions; tailor them strictly to the code provided.";
                prompt = `Analyze the following ${language} code written by a candidate:\n\n\`\`\`${language}\n${code}\n\`\`\`${toolsContext}\n\nGenerate 3 tailored follow-up questions for the interviewer to ask.`;
                break;
            case "scorecard":
                systemInstruction = personalization + "You are an automated technical interview grader. Your job is to compile a complete timeline of the candidate's journey and generate a structured evaluation grading Code Optimization, Debug Velocity, and Rubric Coverage. Return the output as HTML that can be styled and rendered in a beautifully designed scorecard UI.";
                prompt = `Evaluate the candidate's performance based on their final ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nContext on execution/errors:\n${context}\n\nPlease generate an HTML scorecard with sections for Code Optimization, Debug Velocity, and Rubric Coverage. Just return the HTML string, without wrapping it in markdown code blocks.`;
                break;
            case "auto-insight":
                systemInstruction = personalization + "You are an autonomous code monitoring agent. After the candidate writes or runs code, provide ONE brief, actionable insight (max 2 sentences). Focus on: bugs, performance issues, or clever approaches you noticed.";
                prompt = `Analyze the following ${language} code execution:\n\n\`\`\`${language}\n${code}\n\`\`\`${toolsContext}\n\nProvide 1-2 sentences of insight.`;
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid action specified." });
        }

        const responseText = await getAIResponse(prompt, systemInstruction, action, conversationHistory);
        return res.status(200).json({ success: true, response: responseText });
    } catch (error) {
        console.error("AI Request Error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate AI response.", error: error.message });
    }
};

module.exports = {
    handleAIRequest,
    getAIResponse
};
