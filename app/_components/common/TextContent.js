import { extractText } from "@lib/utils"

export default function TextContent({ title, description }) {
    const titleContent = extractText(title)

    return(
        <div className="flex flex-col gap-2">
            {title && <h2 className="text-2xl xs:text-3xl text-dark dark:text-white font-bold">
                {titleContent.map((part, index) => (
                    <span key={index} className={part.type === 'tag' ? 'text-ocean-blue' : ''}>{part.value}</span>
                ))}
            </h2>}
            {description && <p className="text-dark/80 dark:text-white/80 text-sm xs:text-base">{description}</p>}
        </div>
    )
}