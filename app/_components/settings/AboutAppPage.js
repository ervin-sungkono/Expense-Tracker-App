import { version } from "@/app/_lib/version";
import Page from "../common/Page";
import { IoLogoGithub as GithubIcon, IoLogoLinkedin as LinkedInIcon } from "react-icons/io";

export default function AboutAppPage({ show, hideFn }) {
    return(
        <Page
            title="About App"
            show={show}
            hideFn={hideFn}
        >
            <div className="flex flex-col grow">
                <p className="text-center text-sm md:text-base text-dark/80 dark:text-white/80 mb-4">App version: {version}</p>
                <p className="text-sm md:text-base text-dark/80 dark:text-white/80 grow">This app is an transaction tracker for tracking your transaction. It is built for offline support with no remote database, meaning that none of your data here is stored outside the application.</p>
                <p className="text-sm text-center mb-2">Developed by<br/><b className="text-lg">Ervin Cahyadinata Sungkono</b></p>
                <div className="flex justify-center gap-2">
                    <a href="https://github.com/ervin-sungkono" target="_blank" className="p-1.5">
                        <GithubIcon size={28}/>
                    </a>
                    <a href="https://www.linkedin.com/in/ervin-cahyadinata-sungkono" target="_blank" className="p-1.5">
                        <LinkedInIcon size={28}/>
                    </a>
                </div>
            </div>
        </Page>
    )
}