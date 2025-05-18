import Layout from "../_components/layout/Layout";
import { MdOutlineWifiOff as OfflineIcon } from "react-icons/md";

export default function Offline() {
    return (
        <Layout hideNavbar>
            <div className="flex flex-col gap-2 h-full justify-center items-center text-center">
                <OfflineIcon size={64}/>
                <p className="text-2xl md:text-3xl font-bold text-dark dark:text-white">You are offline</p>
                <p className="text-sm md:text-base text-dark/80 dark:text-white/80">Please check your internet connection and try again.</p>
            </div>
        </Layout>
    );
}