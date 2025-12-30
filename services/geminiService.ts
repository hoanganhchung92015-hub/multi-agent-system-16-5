export const fetchAiSolution = async (subject: string, prompt: string, image?: string) => {
  const fetchWithRetry = async (retries = 2): Promise<any> => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, prompt, image })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (err) {
      if (retries > 0) return fetchWithRetry(retries - 1);
      throw err;
    }
  };

  return await fetchWithRetry();
};
