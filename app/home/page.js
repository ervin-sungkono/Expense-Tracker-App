import Layout from "../_components/layout/Layout";
import Header from "../_components/home/Header";
import TransactionData from "../_components/home/TransactionData";
import TransactionReport from "../_components/home/TransactionReport";
import CategoriesCarousel from "../_components/home/CategoriesCarousel";
import ShopsCarousel from "../_components/home/ShopsCarousel";
import RecentTransactions from "../_components/home/RecentTransactions";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
            <TransactionData/>
            <TransactionReport/>
            <RecentTransactions/>
            <CategoriesCarousel/>
            <ShopsCarousel/>
        </Layout>
    )
}