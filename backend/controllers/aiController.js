const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access the API keys from environment variables
const apiKey = process.env.GEMINI_API_KEY;
const chatApiKey = process.env.CHAT_GEMINI_API_KEY || apiKey;

let genAI = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
} else {
    console.warn("GEMINI_API_KEY is not set. Review/Test/Architecture features will be disabled.");
}

let chatGenAI = null;
if (chatApiKey) {
    chatGenAI = new GoogleGenerativeAI(chatApiKey);
} else {
    console.warn("CHAT_GEMINI_API_KEY and GEMINI_API_KEY are not set. AI Chat features will be disabled.");
}

const getAIResponse = async (prompt, systemInstruction, isChat = false) => {
    const aiInstance = isChat ? chatGenAI : genAI;
    if (!aiInstance) {
        throw new Error(`AI is not configured. Missing ${isChat ? 'CHAT_GEMINI_API_KEY' : 'GEMINI_API_KEY'}.`);
    }
    
    // Create the generative model with the systemInstruction
    const model = aiInstance.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: systemInstruction 
    });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
};

const handleAIRequest = async (req, res) => {
    try {
        const { action, code, language, context } = req.body;
        
        const isChat = (action === "chat");
        const activeGenAI = isChat ? chatGenAI : genAI;

        if (!activeGenAI) {
            return res.status(503).json({ success: false, message: `AI ${action} feature is currently unavailable due to missing configuration.` });
        }

        let prompt = "";
        let systemInstruction = "";
        
        switch (action) {
            case "review":
                systemInstruction = "You are an expert AI code reviewer. Your job is to strictly review the provided code. Provide constructive feedback, identify potential bugs, suggest optimizations, and comment on code quality. Do not write full rewrites unless necessary to show an optimization.";
                prompt = `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReview:`;
                break;
            case "test":
                systemInstruction = "You are an expert AI test engineer. Your job is to generate comprehensive unit tests for the provided code. Make sure to cover edge cases, normal inputs, and invalid inputs. Only output the test code and brief explanations.";
                prompt = `Generate unit tests for the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nTests:`;
                break;
            case "architecture":
                systemInstruction = "You are an expert AI software architect. Your job is to help users design scalable, robust application architecture. Provide a detailed architecture plan, including folder structure, key components, and design patterns based on the context.";
                prompt = `Here is my context/request:\n\n${context}\n\nPlease provide a detailed architecture plan.`;
                break;
            case "chat":
                systemInstruction = "You are a helpful coding assistant pair programming with the user. Answer their questions concisely and accurately. Assume the context of their collaborative project.";
                prompt = `Context:\n${context}\n\nQuestion:\n${code}\n\nAnswer:`;
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid action specified." });
        }

        const responseText = await getAIResponse(prompt, systemInstruction, isChat);
        return res.status(200).json({ success: true, response: responseText });
    } catch (error) {
        console.error("AI Request Error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate AI response.", error: error.message });
    }
};

module.exports = {
    handleAIRequest
};
