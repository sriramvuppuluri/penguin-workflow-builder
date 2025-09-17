import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-penguin-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-penguin-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="flex items-center gap-2">
          <img src="/penguin-logo.svg" alt="Penguin logo" className="h-8 w-auto" />
          <span className="text-[24px] font-bold text-accent-500">Penguin</span>
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-penguin-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
