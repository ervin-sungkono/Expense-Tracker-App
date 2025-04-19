import { extractText } from "@/app/_lib/utils"

export default function TextContent({ title, description }) {
    const titleContent = extractText(title)

    return(
        <div className="flex flex-col gap-2">
            {title && <h2 className="text-3xl xs:text-2xl text-dark dark:text-white font-bold">
                {titleContent.map((part, index) => (
                    <span key={index} className={part.type === 'tag' ? 'text-ocean-blue' : ''}>{part.value}</span>
                ))}
            </h2>}
            {description && <p className="text-dark/80 dark:text-white/80 text-base xs:text-sm">{description}</p>}
        </div>
    )
}