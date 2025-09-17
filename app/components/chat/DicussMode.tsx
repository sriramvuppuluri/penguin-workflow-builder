import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui';

export function DiscussMode() {
  return (
    <div>
      <IconButton
        title="Discuss"
        className={classNames(
          'transition-all flex items-center gap-1 bg-penguin-elements-item-backgroundAccent text-penguin-elements-item-contentAccent',
        )}
      >
        <div className={`i-ph:chats text-xl`} />
      </IconButton>
    </div>
  );
}
