export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set." });
  }

  var messages = req.body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  if (messages.length > 30) {
    return res.status(400).json({ error: "Conversation too long. Please start a new chat." });
  }

  var SYSTEM_PROMPT = "You are Revenue Assistant, an expert AI tax advisor specializing in Irish taxation and the Revenue Online Service (ROS). Answer questions about Irish tax law, Revenue rules, PAYE, self-assessment, VAT, CGT, CAT, Corporation Tax, Stamp Duty, LPT, USC, PRSI. Always use web search to find the most current information from revenue.ie and ros.ie. Use plain language but be precise. If a question is outside Irish tax scope, politely redirect. Always recommend consulting a qualified tax advisor for complex situations. ROS is at www.ros.ie. Revenue is at www.revenue.ie. Tax year follows calendar year Jan 1 to Dec 31.";

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: [{ type: "web_search_20250305", name: "web_search" }]
      })
    });

    if (!response.ok) {
      var errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      return res.status(response.status).json({ error: "AI service error (" + response.status + ")" });
    }

    var data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
