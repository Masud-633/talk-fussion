import React from "react";

export function formatRichText(text: string): React.ReactNode {
  if (!text) return null;

  // Split text into tokens for url
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 dark:text-blue-400 hover:opacity-80 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // Process markdown formatting inside text
    // *bold*, _italic_, ~strike~, `code`
    let nodes: (string | React.ReactElement)[] = [part];

    // Bold
    nodes = nodes.flatMap((item, i) => {
      if (typeof item !== "string") return [item];
      const bParts = item.split(/(?<!\*)\*([^*\n]+)\*(?!\*)/g);
      return bParts.map((bPart, bi) => {
        if (bi % 2 === 1) {
          return <strong key={`b-${i}-${bi}`}>{bPart}</strong>;
        }
        return bPart;
      });
    });

    // Italic
    nodes = nodes.flatMap((item, i) => {
      if (typeof item !== "string") return [item];
      const iParts = item.split(/(?<!_)_([^_\n]+)_(?!_)/g);
      return iParts.map((iPart, ii) => {
        if (ii % 2 === 1) {
          return <em key={`i-${i}-${ii}`}>{iPart}</em>;
        }
        return iPart;
      });
    });

    // Strikethrough
    nodes = nodes.flatMap((item, i) => {
      if (typeof item !== "string") return [item];
      const sParts = item.split(/~([^~\n]+)~/g);
      return sParts.map((sPart, si) => {
        if (si % 2 === 1) {
          return <del key={`s-${i}-${si}`}>{sPart}</del>;
        }
        return sPart;
      });
    });

    // Inline Code
    nodes = nodes.flatMap((item, i) => {
      if (typeof item !== "string") return [item];
      const cParts = item.split(/`([^`\n]+)`/g);
      return cParts.map((cPart, ci) => {
        if (ci % 2 === 1) {
          return (
            <code
              key={`c-${i}-${ci}`}
              className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs"
            >
              {cPart}
            </code>
          );
        }
        return cPart;
      });
    });

    return <React.Fragment key={index}>{nodes}</React.Fragment>;
  });
}
