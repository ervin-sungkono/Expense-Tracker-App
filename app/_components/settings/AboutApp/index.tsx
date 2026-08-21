import { version } from '@lib/version';
import { IoLogoGithub as GithubIcon, IoLogoLinkedin as LinkedInIcon } from 'react-icons/io';

export default function AboutApp() {
  return (
    <div className="flex flex-col grow">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pt-3 text-center text-sm leading-6 text-dark/80 dark:text-white/80 md:text-base">
        <p className="font-semibold">App version: {version}</p>
        <p>
          Xpensed is an offline-first expense tracker for personal and shared spaces. Track
          transactions, categories, shops, and budgets wherever you are.
        </p>
        <p>
          Use guest mode for local-only tracking, or sign in with Google to sync across devices,
          collaborate with others, share read-only snapshots, and connect supported AI assistants.
        </p>
      </div>
      <p className="mt-auto text-sm text-center mb-2">
        Developed by
        <br />
        <b className="text-lg">Ervin Cahyadinata Sungkono</b>
      </p>
      <div className="flex justify-center gap-2">
        <a href="https://github.com/ervin-sungkono" target="_blank" className="p-1.5">
          <GithubIcon size={28} />
        </a>
        <a
          href="https://www.linkedin.com/in/ervin-cahyadinata-sungkono"
          target="_blank"
          className="p-1.5"
        >
          <LinkedInIcon size={28} />
        </a>
      </div>
    </div>
  );
}
