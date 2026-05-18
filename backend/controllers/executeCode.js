const axios = require("axios");

const languageMap = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

const defaultJudge0Url = "https://ce.judge0.com";

const ExecuteFun = async (req, res) => {
  try {
    const { source_code, language_id, stdin } = req.body;
    const judge0LanguageId = languageMap[language_id];

    if (!judge0LanguageId) {
      return res.status(400).json({
        status: "Error",
        stderr: `Unsupported language: ${language_id}`,
      });
    }

    const useRapidApi =
      process.env.JUDGE0_USE_RAPIDAPI === "true" && !!process.env.API_KEY;

    let baseUrl = (
      useRapidApi
        ? process.env.JUDGE0_RAPIDAPI_URL || "https://judge0-ce.p.rapidapi.com"
        : process.env.JUDGE0_API_URL || defaultJudge0Url
    ).replace(/\/$/, "");

    const headers = { "Content-Type": "application/json" };

    if (useRapidApi) {
      headers["x-rapidapi-host"] =
        process.env.RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
      headers["x-rapidapi-key"] = process.env.API_KEY;
    }

    const url = `${baseUrl}/submissions?base64_encoded=false&wait=true`;

    const response = await axios.post(
      url,
      {
        source_code: source_code || "",
        language_id: judge0LanguageId,
        stdin: stdin || "",
      },
      { headers, timeout: 30000 }
    );

    const result = response.data;

    res.json({
      status: result.status?.description || "Done",
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
    });
  } catch (error) {
    const detail =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === "string"
        ? error.response.data
        : null) ||
      error.message;

    console.error("Judge0 API error:", error.response?.data || error.message);

    res.status(500).json({
      status: "Error",
      stderr:
        useRapidApiHint(error) ||
        (typeof detail === "object"
          ? JSON.stringify(detail)
          : detail || "Failed to execute code."),
    });
  }
};

function useRapidApiHint(error) {
  if (error.response?.status === 401 || error.response?.status === 403) {
    return "Code execution failed. Using direct Judge0 (ce.judge0.com) — set JUDGE0_USE_RAPIDAPI=false or remove expired RapidAPI key.";
  }
  return null;
}

module.exports = ExecuteFun;
