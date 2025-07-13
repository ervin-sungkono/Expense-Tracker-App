export default function LoadingOverlay() {
    return(
        <div className="fixed w-full h-full px-4 py-8 top-0 left-0 flex justify-center items-center z-[10000] overflow-hidden">
            <div className={`relative w-full h-full max-w-3xl mx-auto flex flex-col gap-4 justify-center items-center z-50`}>
                <div className="w-36 h-36 md:w-56 md:h-56 border-16 md:border-24 rounded-full border-ocean-blue/50 border-t-ocean-blue left-1/4 right-1/4 top-1/4 bottom-1/4 animate-[rotate-spinner_1s_linear_infinite]"></div>
                <p className="text-xl md:text-2xl font-semibold">Loading..</p>      
            </div>
            <div className={`pointer-events-none overlay absolute top-0 left-0 backdrop-blur-xl bg-neutral-700/60 w-full h-full`}></div>
        </div>
    )
}