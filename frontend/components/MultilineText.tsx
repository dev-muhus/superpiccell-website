import React from 'react';

interface MultilineTextProps {
  text: string;
}

const MultilineText: React.FC<MultilineTextProps> = ({ text }) => {
  const renderTextWithLinks = (line: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = line.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <>
      {text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {renderTextWithLinks(line)}
          <br />
        </React.Fragment>
      ))}
    </>
  );
};

export default MultilineText;
