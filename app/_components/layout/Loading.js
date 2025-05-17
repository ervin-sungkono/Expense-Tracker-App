export default function Loading() {
    return(
        <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0 bg-white dark:bg-dark">
            <main className={`relative w-full h-full max-w-2xl mx-auto flex flex-col gap-4 justify-center items-center`}>
                <div className="w-36 h-36 md:w-56 md:h-56 border-16 md:border-24 rounded-full border-ocean-blue/50 border-t-ocean-blue left-1/4 right-1/4 top-1/4 bottom-1/4 animate-[rotate-spinner_1s_linear_infinite]"></div>
                <p className="text-xl md:text-2xl font-semibold">Loading..</p>
            </main>
        </div>
    )
}