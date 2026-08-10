'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shouldOpenMenuUpward } from '@lib/utils';

export default function ContextMenu({
  items = [],
  children = null,
  show = false,
  hideFn = null,
  hideOnItemClick = false,
  position = {},
}) {
  const [hidden, setHidden] = useState(true);
  const [autoOpensUpward, setAutoOpensUpward] = useState(false);
  const menuRef = useRef(null);
  const hasExplicitVerticalPosition = position.top !== undefined || position.bottom !== undefined;
  const explicitlyOpensUpward = position.top !== undefined;
  const overlapsTrigger = position.overlap === true;

  useEffect(() => {
    let hide = null;
    if (!show && !hidden) hide = setTimeout(() => setHidden(true), 350);
    else if (show && hidden) {
      setHidden(false);
    }

    return () => clearTimeout(hide);
  }, [show, hidden]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = menu?.parentElement;
    if (hidden || hasExplicitVerticalPosition || !menu || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    setAutoOpensUpward(
      shouldOpenMenuUpward(menu.offsetHeight, anchorRect.top, anchorRect.bottom, window.innerHeight)
    );
  }, [hasExplicitVerticalPosition, hidden, items.length]);

  const opensUpward = hasExplicitVerticalPosition ? explicitlyOpensUpward : autoOpensUpward;
  const placementClass = hasExplicitVerticalPosition
    ? overlapsTrigger
      ? 'origin-top-right'
      : opensUpward
        ? '-translate-y-full origin-bottom-right'
        : 'translate-y-full origin-top-right'
    : opensUpward
      ? 'origin-bottom-right'
      : 'origin-top-right';

  if (!hidden)
    return (
      <>
        <div
          ref={menuRef}
          className={`absolute z-50 min-w-[120px] ${placementClass} ${show ? 'animate-[scale-in_.25s_forwards_ease-in-out]' : 'animate-[scale-out_.25s_forwards_ease-in-out]'}`}
          style={{
            ...(hasExplicitVerticalPosition
              ? explicitlyOpensUpward
                ? { top: position.top }
                : { bottom: position.bottom }
              : opensUpward
                ? { bottom: '100%' }
                : { top: '100%' }),
            right: position.right ?? 0,
          }}
        >
          <div className="w-full relative z-50 py-1.5 bg-light dark:bg-neutral-800 shadow-lg rounded-md">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                onClick={() => {
                  item.onClick && item.onClick();
                  hideOnItemClick && hideFn();
                }}
                className="cursor-pointer px-4 text-sm md:text-base text-dark dark:text-white py-2 active:bg-neutral-300/30 dark:active:bg-light/10"
              >
                {item.label}
              </div>
            ))}
            {children}
          </div>
        </div>
        <div onClick={hideFn} className="fixed w-full h-full top-0 left-0 z-10"></div>
      </>
    );
}
