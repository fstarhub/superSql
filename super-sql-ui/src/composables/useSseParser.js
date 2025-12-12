export default function useSseParser() {
  const parseStream = async (res: Response, onDelta: (chunk: string) => void) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.replace("data:", "").trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonStr);
          const delta = data.data?.choices?.[0]?.message?.content || "";
          if (delta) onDelta(delta);
        } catch {}
      }
    }
  };

  return { parseStream };
}
