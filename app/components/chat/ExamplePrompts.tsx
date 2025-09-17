import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Create a medical coding workflow' },
  { text: 'Create a prior authorization workflow for a nurse at payer\'s end' },
  { text: 'Build an appeals assistant workflow for a denied claim' },
  { text: 'Build a chatbot where users can upload a PDF, ask questions and get answers' }
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border border-penguin-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-penguin-elements-textSecondary hover:text-penguin-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
